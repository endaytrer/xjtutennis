package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/endaytrer/court_reserver_interface"
	"github.com/endaytrer/court_reserver_interface/captcha_solver"
	"github.com/endaytrer/xjtuorg"
)

type TennisApiErrorType int

type TennisApiError struct {
	errorType TennisApiErrorType
	message   string
}

const (
	NoError TennisApiErrorType = iota
	InternalServerError
	MalformedData
	NonExistAccount
	InvalidAccount
	WrongPasswd
	InvalidPasswd
	NotLoggedIn
	InvalidQuery
)

func (t TennisApiError) Error() string {
	switch t.errorType {
	case InternalServerError:
		return "Internal Server Error: " + t.message
	case MalformedData:
		return "Malformed Data: " + t.message
	case NonExistAccount:
		return "Account Not Existed"
	case InvalidAccount:
		return "Invalid Account: " + t.message
	case WrongPasswd:
		return "Wrong Passwd"
	case InvalidPasswd:
		return "Invalid Passwd"
	case NotLoggedIn:
		return "Not Logged In"
	case InvalidQuery:
		return "Invalid Query: " + t.message
	}
	panic("Error not covered")
}
func (t TennisApiError) ToHttpStatus() int {

	switch t.errorType {
	case InternalServerError:
		return http.StatusInternalServerError
	case MalformedData:
		return http.StatusBadRequest
	case NonExistAccount:
		return http.StatusForbidden
	case InvalidAccount:
		return http.StatusForbidden
	case WrongPasswd:
		return http.StatusForbidden
	case InvalidPasswd:
		return http.StatusForbidden
	case NotLoggedIn:
		return http.StatusForbidden
	case InvalidQuery:
		return http.StatusBadRequest
	}
	panic("Error not covered")
}

type Account struct {
	User        string
	Passwd      string
	NetId       string
	NetIdPasswd string
}

type SessionId string

type Session struct {
	Expiry  time.Time
	Account *Account
} // write-through cache of user_data.csv

type SessionManager struct {
	accounts       []Account
	account_mutex  sync.RWMutex
	sessions       sync.Map
	conn           *sql.Conn
	timeZone       *time.Location
	captchaSolver  captcha_solver.CaptchaSolver
	reserverPlugin *CourtReserverPlugin
}

const user_data_file = "user_data.csv"
const account_login_expiry = 24 * time.Hour

type ParseError struct{}

func (t ParseError) Error() string {
	return "Error: ParseError"
}

func NewSessionManager(conn *sql.Conn, captcha_solver captcha_solver.CaptchaSolver, court_reserver_plugin *CourtReserverPlugin) (*SessionManager, error) {
	time_zone, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		panic("Invalid time zone")
	}
	data, err := os.ReadFile(user_data_file)
	if err != nil {
		return nil, err
	}
	account_strs := strings.Split(string(data), "\n")
	accounts := make([]Account, 0)

	for _, account_str := range account_strs {
		if account_str == "" {
			continue // skip empty lines
		}
		fields := strings.Split(account_str, ",")
		if len(fields) != 4 {
			return nil, ParseError{}
		}
		account := Account{
			User:        fields[0],
			Passwd:      fields[1],
			NetId:       fields[2],
			NetIdPasswd: fields[3],
		}
		accounts = append(accounts, account)
	}
	return &SessionManager{
		accounts:       accounts,
		account_mutex:  sync.RWMutex{},
		sessions:       sync.Map{},
		conn:           conn,
		timeZone:       time_zone,
		captchaSolver:  captcha_solver,
		reserverPlugin: court_reserver_plugin,
	}, nil
}

// Unlock write lock before calling WriteAccounts
func (t *SessionManager) WriteAccounts() error {
	t.account_mutex.RLock()
	var ans = ""
	for _, account := range t.accounts {
		temp := fmt.Sprintf("%s,%s,%s,%s\n", account.User, account.Passwd, account.NetId, account.NetIdPasswd)
		ans += temp
	}
	t.account_mutex.RUnlock()
	return os.WriteFile(user_data_file, []byte(ans), 0600)
}

func newSessionId() SessionId {
	rand_bytes := make([]byte, 32)
	_, err := rand.Read(rand_bytes)
	if err != nil {
		panic(err)
	}
	return SessionId(base64.StdEncoding.EncodeToString(rand_bytes))
}

func CheckPasswd(passwd string) (ok bool) {
	if strings.Contains(passwd, ",") {
		return false
	}
	if strings.Contains(passwd, "\n") {
		return false
	}
	return true
}

type LoginParams struct {
	User   string
	Passwd string
}

func (t *SessionManager) Login(params *LoginParams) (SessionId, error) {
	var login_account *Account = nil
	for i, account := range t.accounts {
		if account.User == params.User {
			if account.Passwd != params.Passwd {
				return "", TennisApiError{errorType: WrongPasswd}
			}
			login_account = &t.accounts[i]
		}
	}
	if login_account == nil {
		return "", TennisApiError{errorType: NonExistAccount}
	}
	session_id := newSessionId()
	t.sessions.Store(session_id, Session{
		Expiry:  time.Now().Add(account_login_expiry),
		Account: login_account,
	})
	return session_id, nil
}
func (t *SessionManager) getSession(session SessionId) (*Account, error) {
	val, ok := t.sessions.Load(session)
	if !ok {
		return nil, TennisApiError{errorType: NotLoggedIn}
	}
	return val.(Session).Account, nil
}

type ChangePasswdParams struct {
	Session   SessionId
	OldPasswd string
	NewPasswd string
}

func (t *SessionManager) ChangePasswd(params *ChangePasswdParams) error {
	account, err := t.getSession(params.Session)
	if err != nil {
		return err
	}
	// check if new_passwd is valid
	if !CheckPasswd(params.NewPasswd) {
		return TennisApiError{errorType: InvalidPasswd}
	}
	// check old passwd
	t.account_mutex.RLock()
	passwd_match := account.Passwd == params.OldPasswd
	t.account_mutex.RUnlock()

	if !passwd_match {
		return TennisApiError{errorType: WrongPasswd}
	}
	// mutex lock for writing new passwd
	t.account_mutex.Lock()
	account.Passwd = params.NewPasswd
	t.account_mutex.Unlock()

	// write back
	defer t.WriteAccounts()
	return nil
}

type ChangeNetIdPasswdParams struct {
	Session   SessionId
	NewPasswd string
}

func (t *SessionManager) ChangeNetIdPasswd(params *ChangeNetIdPasswdParams) error {
	account, err := t.getSession(params.Session)
	if err != nil {
		return err
	}
	// check if new_passwd is valid
	if !CheckPasswd(params.NewPasswd) {
		return TennisApiError{errorType: InvalidPasswd}
	}

	// mutex lock for writing new passwd
	t.account_mutex.Lock()
	account.NetIdPasswd = params.NewPasswd
	t.account_mutex.Unlock()

	// write back
	defer t.WriteAccounts()
	return nil
}

type SessionOnlyParams struct {
	Session SessionId
}

func (t *SessionManager) GetLoginAccount(params *SessionOnlyParams) (*Account, error) {
	account, err := t.getSession(params.Session)
	if err != nil {
		return nil, err
	}
	// only returning User, NetId
	cloneAccount := Account{
		User:  account.User,
		NetId: account.NetId,
	}
	return &cloneAccount, nil
}
func (t *SessionManager) SignOut(params *SessionOnlyParams) {
	t.sessions.Delete(params.Session)
}

type SingleBookCompatible struct {
	// book all contiguous courts COVERINGs Date + StartTime to Date + StartTime + Duration. Time starts with UTC.
	StartTimeSec int
	DurationSec  int
	// preferring booking name
	CourtNamePreference []string
}

func (t SingleBookCompatible) convert() court_reserver_interface.SingleBook {
	court_name_pref := make([]string, 0, len(t.CourtNamePreference))
	for _, v := range t.CourtNamePreference {
		court_name_pref = append(court_name_pref, v)
	}
	return court_reserver_interface.SingleBook{
		StartTime:           time.Duration(t.StartTimeSec) * time.Second,
		Duration:            time.Duration(t.DurationSec) * time.Second,
		CourtNamePreference: court_name_pref,
	}
}

type ReservationCompatible struct {
	Date        string
	Site        court_reserver_interface.Site
	Preferences []SingleBookCompatible
	Priority    int
}

type PlaceReservationParams struct {
	Session     SessionId
	Reservation ReservationCompatible
}

const DATE_FORMAT = "2006-01-02"

func (t *SessionManager) PlaceReservation(params *PlaceReservationParams) (int64, error) {
	account, err := t.getSession(params.Session)
	if err != nil {
		return -1, err
	}
	t.account_mutex.RLock()
	netid := account.NetId
	netid_passwd := account.NetIdPasswd
	t.account_mutex.RUnlock()
	data, err := json.Marshal(params.Reservation.Preferences)
	if err != nil {
		return -1, err
	}
	date, err := time.ParseInLocation(DATE_FORMAT, params.Reservation.Date, t.timeZone)
	now := time.Now().In(t.timeZone)
	today_y, today_m, today_d := now.Date()
	today_start := time.Date(today_y, today_m, today_d, 0, 0, 0, 0, t.timeZone)
	if err != nil || date.Before(today_start) {
		return -1, TennisApiError{MalformedData, "Invalid date"}
	}
	reservation_date := date.Add(-time.Duration(court_reserver_interface.SiteLookahead(params.Reservation.Site)) * 24 * time.Hour)
	res_y, res_m, res_d := reservation_date.Date()
	reservation_booking_start := time.Date(res_y, res_m, res_d, 0, 0, 0, 0, t.timeZone).Add(BOOKING_START)

	today_booking_start := time.Date(today_y, today_m, today_d, 0, 0, 0, 0, t.timeZone).Add(BOOKING_START)
	today_booking_end := time.Date(today_y, today_m, today_d, 0, 0, 0, 0, t.timeZone).Add(BOOKING_END)

	// book immediately if in booking time
	var reserve_on string = reservation_date.Format(DATE_FORMAT)

	if now.After(reservation_booking_start) {
		// if now is available for booking, book now
		if now.Before(today_booking_end) {
			reserve_on = today_booking_start.Format(DATE_FORMAT)
		} else {
			// else book tomorrow.
			reserve_on = today_booking_start.Add(time.Duration(24) * time.Hour).Format(DATE_FORMAT)
		}
	}

	ctx := context.Background()
	stmt, err := t.conn.PrepareContext(ctx, "INSERT INTO `reservations` (`netid`, `passwd`, `date`, `site`, `preferences`, `priority`, `reserve_on`) VALUES (?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		return -1, err
	}
	res, err := stmt.Exec(netid, netid_passwd, params.Reservation.Date, params.Reservation.Site, data, params.Reservation.Priority, reserve_on)
	if err != nil {
		return -1, err
	}
	uid, err := res.LastInsertId()
	if err != nil {
		return -1, err
	}

	// book immediately if in booking time.
	// But if no reserver plugin is find, do not reserve.
	if t.reserverPlugin == nil {
		return uid, err
	}
	if now.After(reservation_booking_start) && now.After(today_booking_start) && now.Before(today_booking_end) {
		books := make([]court_reserver_interface.SingleBook, 0, len(params.Reservation.Preferences))
		for _, v := range params.Reservation.Preferences {
			books = append(books, v.convert())
		}
		reservation := court_reserver_interface.Reservation{
			Date:        date,
			Site:        params.Reservation.Site,
			Preferences: books,
			Priority:    params.Reservation.Priority,
		}
		go (func() {
			login_session := xjtuorg.New(true)
			redir, err := login_session.Login(t.reserverPlugin.LoginURL, account.NetId, account.NetIdPasswd)

			// cannot login, return all failed.
			// reuse login
			if err != nil {
				UpdateReservation(t.conn, uid, court_reserver_interface.ReservationStatus{
					Code:      court_reserver_interface.Failed,
					Msg:       fmt.Sprintf("Login Error: %s", err.Error()),
					CourtTime: make(map[string]string),
				})
				fmt.Fprintf(os.Stderr, "[ERROR Session LOGIN] %s %s", time.Now().Format(time.RFC3339), err.Error())
				return
			}
			reserver := t.reserverPlugin.NewCourtReserver(redir)
			status := reserver.BookNow(t.timeZone, &reservation, t.captchaSolver)

			err = UpdateReservation(t.conn, uid, status)
			if err != nil {
				fmt.Fprintf(os.Stderr, "[ERROR Session SQL] %s %s", time.Now().Format(time.RFC3339), err.Error())
			}
		})()
	}
	return uid, err
}

type CancelReservationParams struct {
	Session SessionId
	Uid     int64
}

func (t *SessionManager) CancelReservation(params *CancelReservationParams) error {

	account, err := t.getSession(params.Session)
	if err != nil {
		return err
	}

	t.account_mutex.RLock()
	netid := account.NetId
	t.account_mutex.RUnlock()
	res, err := t.conn.ExecContext(context.Background(), fmt.Sprintf("DELETE FROM `reservations` WHERE `netid` = ? AND `uid` = ? AND `status_code` = %d", int(court_reserver_interface.Pending)), netid, params.Uid)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return TennisApiError{errorType: InvalidQuery, message: "No matching reservation"}
	}
	return nil
}

type ReservationResult struct {
	Uid         int64
	Reservation ReservationCompatible
	Status      court_reserver_interface.ReservationStatus
}
type ReservationResponse struct {
	Count  uint
	Result []ReservationResult
}
type GetReservationsParams struct {
	Session SessionId
	Page    uint
	Limit   uint
}

func (t *SessionManager) GetReservations(params *GetReservationsParams) (ReservationResponse, error) {
	account, err := t.getSession(params.Session)
	if err != nil {
		return ReservationResponse{Count: 0, Result: nil}, err
	}

	t.account_mutex.RLock()
	netid := account.NetId
	t.account_mutex.RUnlock()
	offset := params.Page * params.Limit
	var count uint
	err = t.conn.QueryRowContext(context.Background(), "SELECT COUNT(`uid`) FROM `reservations` WHERE `netid` = ?", netid).Scan(&count)
	if err != nil {
		return ReservationResponse{Count: 0, Result: nil}, err
	}
	rows, err := t.conn.QueryContext(context.Background(), "SELECT `uid`, `date`, `site`, `preferences`, `priority`, `status_code`, `msg`, `court_time` FROM `reservations` WHERE `netid` = ? ORDER BY `created_at` DESC LIMIT ? OFFSET ?", netid, params.Limit, offset)
	if err != nil {
		return ReservationResponse{Count: 0, Result: nil}, err
	}
	ans := make([]ReservationResult, 0)
	for rows.Next() {
		var uid int64
		var date string
		var site court_reserver_interface.Site
		var preferences string
		var priority int
		var status court_reserver_interface.ReservationStatus
		var court_time_string string
		err = rows.Scan(&uid, &date, &site, &preferences, &priority, &status.Code, &status.Msg, &court_time_string)
		if err != nil {
			return ReservationResponse{Count: 0, Result: nil}, err
		}

		err = json.Unmarshal([]byte(court_time_string), &status.CourtTime)

		if err != nil {
			return ReservationResponse{Count: 0, Result: nil}, err
		}

		var books []SingleBookCompatible
		err := json.Unmarshal([]byte(preferences), &books)
		if err != nil {
			return ReservationResponse{Count: 0, Result: nil}, err
		}
		reservationStatus := ReservationResult{
			Uid: uid,
			Reservation: ReservationCompatible{
				Date:        date,
				Site:        site,
				Preferences: books,
				Priority:    priority,
			},
			Status: status,
		}
		ans = append(ans, reservationStatus)
	}
	return ReservationResponse{
		Count:  count,
		Result: ans,
	}, nil
}
