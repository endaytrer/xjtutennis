package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/endaytrer/court_reserver"
	"github.com/endaytrer/xjtuorg"
)

// handle delayed reservation requests
type ReservationHandler struct {
	conn           *sql.Conn
	time_zone      *time.Location
	captcha_solver court_reserver.CaptchaSolver
}

func NewReservationHandler(conn *sql.Conn, captcha_solver court_reserver.CaptchaSolver) ReservationHandler {
	time_zone, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		panic("Invalid time zone")
	}
	return ReservationHandler{
		conn:           conn,
		time_zone:      time_zone,
		captcha_solver: captcha_solver,
	}
}

const WAKEUP_HR = 8
const WAKEUP_MIN = 39
const BOOKING_START = WAKEUP_HR*time.Hour + WAKEUP_MIN*time.Minute + 55*time.Second
const BOOKING_END = 21*time.Hour + 39*time.Minute + 55*time.Second

func (t *ReservationHandler) wakeUp(date string) error {
	// select reservations ready to be performed.
	stmt, err := t.conn.PrepareContext(context.Background(), fmt.Sprintf("SELECT `uid`, `netid`, `passwd`, `date`, `site`, `preferences`, `priority` FROM `reservations` WHERE `status_code` = %d AND `reserve_on` = ? ORDER BY `priority` ASC", int(court_reserver.Pending)))
	if err != nil {
		return err
	}
	rows, err := stmt.Query(date)
	if err != nil {
		return err
	}
	reserver_info := make(map[string][]court_reserver.Reservation)
	reserver_uids := make(map[string][]int64)
	reserver_passwds := make(map[string]string)

	for rows.Next() {
		var uid int64
		var netid string
		var passwd string
		var date_str string
		var site court_reserver.Site
		var preferences string
		var priority int

		err = rows.Scan(&uid, &netid, &passwd, &date_str, &site, &preferences, &priority)
		if err != nil {
			return err
		}
		var books []SingleBookCompatible
		err := json.Unmarshal([]byte(preferences), &books)
		if err != nil {
			return err
		}
		date, err := time.ParseInLocation(DATE_FORMAT, date_str, t.time_zone)
		if err != nil {
			return err
		}
		books_internal := make([]court_reserver.SingleBook, 0, len(books))
		for _, book := range books {
			books_internal = append(books_internal, book.convert())
		}
		if _, ok := reserver_info[netid]; !ok {
			reserver_info[netid] = make([]court_reserver.Reservation, 0)
			reserver_uids[netid] = make([]int64, 0)
		}
		reserver_passwds[netid] = passwd
		reserver_info[netid] = append(reserver_info[netid], court_reserver.Reservation{
			Date:        date,
			Site:        site,
			Preferences: books_internal,
			Priority:    priority,
		})
		reserver_uids[netid] = append(reserver_uids[netid], uid)
	}
	for netid := range reserver_info {
		fmt.Printf("[Info] Totally %d bookings found for today in account %s\n", len(reserver_info[netid]), netid)
		go (func() {
			login_session := xjtuorg.New(true)
			redir, err := login_session.Login(court_reserver.CourtReserveLoginUrl, netid, reserver_passwds[netid])

			// cannot login, return all failed.
			// reuse login
			if err != nil {
				for _, uid := range reserver_uids[netid] {
					UpdateReservation(t.conn, uid, court_reserver.ReservationStatus{
						Code:      court_reserver.Failed,
						Msg:       fmt.Sprintf("Login Error: %s", err.Error()),
						CourtTime: make(map[string]string),
					})
				}
				fmt.Fprintf(os.Stderr, "[ERROR Reserver LOGIN] %s %s", time.Now().Format(time.RFC3339), err.Error())
				return
			}
			fmt.Printf("[Info] Login successfully. Start booking for %s...\n", netid)
			reserver := court_reserver.New(redir)

			now := time.Now().In(t.time_zone)
			y, m, d := now.Date()
			booking_start := time.Date(y, m, d, 0, 0, 0, 0, t.time_zone).Add(BOOKING_START)
			for time.Now().In(t.time_zone).Before(booking_start) {
				time.Sleep(1 * time.Second)
			}

			for i, reservation := range reserver_info[netid] {
				result_status := reserver.BookNow(t.time_zone, &reservation, t.captcha_solver)
				err := UpdateReservation(t.conn, reserver_uids[netid][i], result_status)
				if err != nil {
					fmt.Fprintf(os.Stderr, "[ERROR Reserver SQL] %s %s", time.Now().Format(time.RFC3339), err.Error())
					continue
				}

			}
		})()
	}
	return nil
}
func UpdateReservation(conn *sql.Conn, uid int64, status court_reserver.ReservationStatus) error {

	stmt, err := conn.PrepareContext(context.Background(), "UPDATE `reservations` SET `status_code` = ?, `msg` = ?, `court_time` = ? WHERE uid = ?")
	if err != nil {
		return err
	}
	encoded, err := json.Marshal(status.CourtTime)
	if err != nil {
		return err
	}
	_, err = stmt.Exec(status.Code, status.Msg, string(encoded), uid)
	if err != nil {
		return err
	}
	return nil
}

func (t *ReservationHandler) MainEvent() {
	for {
		now := time.Now().In(t.time_zone)
		target := time.Date(now.Year(), now.Month(), now.Day(), WAKEUP_HR, WAKEUP_MIN, 0, 0, t.time_zone)
		if now.After(target) {
			target = target.Add(24 * time.Hour)
		}
		for time.Now().In(t.time_zone).Before(target) {
			time.Sleep(5 * time.Second)
		}
		err := t.wakeUp(target.Format(DATE_FORMAT))
		if err != nil {
			fmt.Fprintf(os.Stderr, "[ERROR Reserver] %s\t%s\n", time.Now().Format(time.RFC3339), err.Error())
		}
	}
}
