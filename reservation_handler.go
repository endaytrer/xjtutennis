package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"time"

	"github.com/endaytrer/xjtuorg"
	"github.com/endaytrer/court_reserver"
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
	stmt, err := t.conn.PrepareContext(context.Background(), fmt.Sprintf("SELECT `uid`, `netid`, `passwd`, `date`, `site`, `preferences`, `priority` FROM `reservations` WHERE `status_code` = %d AND `reserve_on` = ? ORDER BY `priority` ASC", int(Pending)))
	if err != nil {
		return err
	}
	rows, err := stmt.Query(date)
	if err != nil {
		return err
	}
	reserver_info := make(map[string][]Reservation)
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
		books_internal := make([]SingleBook, 0, len(books))
		for _, book := range books {
			books_internal = append(books_internal, book.convert())
		}
		if _, ok := reserver_info[netid]; !ok {
			reserver_info[netid] = make([]Reservation, 0)
			reserver_uids[netid] = make([]int64, 0)
		}
		reserver_passwds[netid] = passwd
		reserver_info[netid] = append(reserver_info[netid], Reservation{
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
					UpdateReservation(t.conn, uid, ReservationStatus{
						Code:      Failed,
						Msg:       fmt.Sprintf("Login Error: %s", err.Error()),
						CourtTime: make(map[string]string),
					})
				}
				fmt.Fprintf(os.Stderr, "[ERROR Reserver LOGIN] %s %s", time.Now().Format(time.RFC3339), err.Error())
				return
			}
			fmt.Printf("[Info] Login successfully. Start booking for %s...\n", netid)
			reserver := court_reserver.New(redir)
			for i, reservation := range reserver_info[netid] {
				result_status := BookNow(t.time_zone, reserver, &reservation, t.captcha_solver)
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
func UpdateReservation(conn *sql.Conn, uid int64, status ReservationStatus) error {

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

type CourtTimeRange struct {
	ct   *court_reserver.CourtTime
	from time.Duration
	to   time.Duration
}

func spiltCourtRanges(determined map[court_reserver.StockId]CourtTimeRange) []map[court_reserver.StockId]court_reserver.CourtId {
	splitted := make([]map[court_reserver.StockId]court_reserver.CourtId, 0)
	// splitted = append(splitted, make(map[court_reserver.StockId]court_reserver.CourtId))
	// for k, v := range determined {
	// 	splitted[0][k] = v.Id
	// }

	// categorize by CourtId:
	entries := make(map[court_reserver.CourtId][]CourtTimeRange)
	for _, v := range determined {
		if _, ok := entries[v.ct.Id]; !ok {
			entries[v.ct.Id] = make([]CourtTimeRange, 0)
		}
		entries[v.ct.Id] = append(entries[v.ct.Id], v)
	}
	// sort each court by from time
	for c, _ := range entries {
		sort.Slice(entries[c], func(i int, j int) bool {
			return entries[c][i].from < entries[c][i].to
		})
	}

	const MAX_CONTIGUOUS_DELTA = 1 * time.Minute
	for _, court_ranges := range entries {

		last_contiguous := make([]CourtTimeRange, 0)

		to_map := func(list *[]CourtTimeRange) map[court_reserver.StockId]court_reserver.CourtId {
			ans := make(map[court_reserver.StockId]court_reserver.CourtId)
			for _, t := range *list {
				ans[t.ct.StockId] = t.ct.Id
			}
			return ans
		}

		for _, entry := range court_ranges {
			// split if:
			// 1. Not contiguous
			if (len(last_contiguous) != 0 && (entry.from-last_contiguous[len(last_contiguous)-1].to) > MAX_CONTIGUOUS_DELTA) || len(last_contiguous) == 2 {
				//
				splitted = append(splitted, to_map(&last_contiguous))
				last_contiguous = make([]CourtTimeRange, 0)
			}
			last_contiguous = append(last_contiguous, entry)
		}
		if len(last_contiguous) > 0 {
			splitted = append(splitted, to_map(&last_contiguous))
		}
	}
	return splitted
}

// / Should be only called between 8:39 and 21:39:55
func BookNow(time_zone *time.Location, reserver court_reserver.CourtReserver, reservation *Reservation, captcha_solver court_reserver.CaptchaSolver) ReservationStatus {
	now := time.Now().In(time_zone)
	y, m, d := now.Date()
	booking_start := time.Date(y, m, d, 0, 0, 0, 0, time_zone).Add(BOOKING_START)
	for time.Now().In(time_zone).Before(booking_start) {
		time.Sleep(1 * time.Second)
	}
	var err error
	var courtTimes []court_reserver.CourtTime
try_get_court:
	for {
		courtTimes, err = reserver.GetAvailableCourts(reservation.Date, reservation.Site)
		if err == nil {
			break
		}
		switch t := err.(type) {
		case court_reserver.ReserveError:
			if t == court_reserver.InvalidTimeError { // Basically invalid time error
				fmt.Printf("[Info %s] InvalidTimeError. Try again...\n", time.Now().In(time_zone).Format(time.RFC3339))
				continue try_get_court
			}
		}
		return ReservationStatus{
			Code:      Failed,
			Msg:       fmt.Sprintf("GetAvailableCourts Error: %s", err.Error()),
			CourtTime: make(map[string]string),
		}
	}
	for _, preference := range reservation.Preferences {
		candidates := make(map[court_reserver.StockId][]CourtTimeRange, 0)

		prefer_start := preference.StartTime
		prefer_end := prefer_start + preference.Duration
		for j, courtTime := range courtTimes {

			from, to, err := courtTime.Stock.Time_no.Parse(time_zone)
			if err != nil {
				return ReservationStatus{
					Code:      Failed,
					Msg:       fmt.Sprintf("Server Error: %s", err.Error()),
					CourtTime: make(map[string]string),
				}
			}
			// 8:00-9:00 intersect 07:00-08:00 = Empty
			// 8:00-9:00 intersect 07:00-08:01 = Some
			// 8:00-9:00 intersect 08:00-09:00 = Some
			// 8:00-9:00 intersect 08:01-09:00 = Some
			// 8:00-9:00 intersect 08:00-09:01 = Some
			// 8:00-9:00 intersect 09:00-10:00 = Empty
			// 8:00-9:00 intersect 09:01-10:00 = Empty
			// 8:01-9:00 intersect 07:01-08:00 = Empty
			// 8:01-9:01 intersect 09:01-10:00 = Empty
			if prefer_start < to && prefer_end > from {
				if _, ok := candidates[courtTime.StockId]; !ok {
					candidates[courtTime.StockId] = make([]CourtTimeRange, 0) // should have at least 1 element
				}
				candidates[courtTime.StockId] = append(candidates[courtTime.StockId], CourtTimeRange{ct: &courtTimes[j], from: from, to: to})
			}
		}
		// choose courts by name
		determined := make(map[court_reserver.StockId]CourtTimeRange)
		for k, courtTimes := range candidates {
		chooseName:
			for _, court_name := range preference.CourtNamePreference {
				for _, courtTime := range courtTimes {
					if courtTime.ct.Sname == court_name {
						determined[k] = courtTime
						break chooseName
					}
				}
			}
			if _, ok := determined[k]; !ok {
				determined[k] = courtTimes[0]
			}
		}
		if len(determined) == 0 {
			// no available courts find. Select another
			continue
		}

		//TODO: Split to reservable atoms. Now only place in a single reserve.
		splitted := spiltCourtRanges(determined)

		succeeded := make(map[string]string)
		// try to book all splitted time ranges
		for _, partial := range splitted {
			err := reserver.Reserve(reservation.Site, partial, captcha_solver)
			if err != nil {
				continue // continue reserving another
			}
			for k := range partial {
				succeeded[string(determined[k].ct.Stock.Time_no)] = string(determined[k].ct.Sname)
			}
		}

		if len(succeeded) > 0 {
			return ReservationStatus{
				Code:      Success,
				Msg:       "",
				CourtTime: succeeded,
			}
		}
		// nothing is successful, try again.
	}
	return ReservationStatus{
		Code:      Failed,
		Msg:       "All courts are unavailable",
		CourtTime: make(map[string]string),
	}
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
