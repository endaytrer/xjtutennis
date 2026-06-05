package api

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base32"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/endaytrer/court_reserver_interface"
	"github.com/endaytrer/court_reserver_interface/captcha_solver"
	"github.com/endaytrer/xjtulogin"
	"github.com/endaytrer/xjtutennis/auth"
	"github.com/endaytrer/xjtutennis/constant"
	"github.com/endaytrer/xjtutennis/plugins"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type SessionId string

type Session struct {
	Expiry time.Time
	User   *auth.User
} // write-through cache of user_data.csv

type SessionManager struct {
	sessions           sync.Map
	signupSessions     sync.Map
	conn               *sql.Conn
	timeZone           *time.Location
	captchaSolver      captcha_solver.CaptchaSolver
	reserverPlugin     *plugins.CourtReserverPlugin
	authorizationCache *auth.AuthorizationCache
	rootAdminToken     uuid.UUID
}

const account_login_expiry = 24 * time.Hour

type ParseError struct{}

func (t ParseError) Error() string {
	return "Error: ParseError"
}

func NewSessionManager(conn *sql.Conn, captcha_solver captcha_solver.CaptchaSolver, court_reserver_plugin *plugins.CourtReserverPlugin, authorization_cache *auth.AuthorizationCache, root_admin_token uuid.UUID) (*SessionManager, error) {
	time_zone, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		panic("Invalid time zone")
	}

	// Users are queried for each login. Not load into memory now.
	return &SessionManager{
		sessions:           sync.Map{},
		signupSessions:     sync.Map{},
		conn:               conn,
		timeZone:           time_zone,
		captchaSolver:      captcha_solver,
		reserverPlugin:     court_reserver_plugin,
		authorizationCache: authorization_cache,
		rootAdminToken:     root_admin_token,
	}, nil
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
	// for bcrypt standard, password length should not longer than 72.
	if len(passwd) > 72 {
		return false
	}
	return true
}

type VersionResponse struct {
	MainVersion     string
	ReserverVersion *string
}

func (t *SessionManager) Version() (VersionResponse, error) {
	var reserver_version *string = nil
	if t.reserverPlugin != nil {
		reserver_version = &t.reserverPlugin.Version
	}
	return VersionResponse{
		MainVersion:     constant.Version,
		ReserverVersion: reserver_version,
	}, nil
}

type RootAdminTokenParams struct {
	Token string
}

func (t *SessionManager) CheckRootAdminToken(params *RootAdminTokenParams) bool {
	token, err := uuid.Parse(params.Token)
	if err != nil {
		return false
	}
	return token == t.rootAdminToken
}
func (t *SessionManager) CreateInvitation(params *RootAdminTokenParams) (string, error) {
	token, err := uuid.Parse(params.Token)
	if err != nil || token != t.rootAdminToken {
		return "", constant.TennisApiError{ErrorType: constant.InvalidAccount}
	}
	var invitation_code string
	for i := 0; i < 10; i++ {

		invitation_code_raw := make([]byte, 10)
		_, err = rand.Read(invitation_code_raw)
		if err != nil {
			panic(err)
		}

		invitation_code = base32.StdEncoding.EncodeToString(invitation_code_raw)

		_, err = t.conn.ExecContext(context.Background(), "INSERT INTO `invitations` (`code`) VALUES (?)", invitation_code)
		if err == nil {
			break
		}
		fmt.Printf("[ReservationHandler] Create reservation failed, there might be ID collision. Retry (%d/10)...\n", i+1)
	}
	if err != nil {
		return "", constant.TennisApiError{ErrorType: constant.InternalServerError, Message: "create invitation failed"}
	}
	return invitation_code, nil
}

type CheckInvitationParams struct {
	Code string
}

func (t *SessionManager) CheckInvitation(params *CheckInvitationParams) (bool, error) {
	var count uint
	err := t.conn.QueryRowContext(context.Background(), "SELECT COUNT(`code`) FROM `invitations` WHERE `code` = ?", params.Code).Scan(&count)

	if err != nil {
		return false, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: err.Error()}
	}

	return count != 0, nil
}

type VerifyNetIdParams struct {
	NetId       string
	NetIdPasswd string
}

type SignUpParams struct {
	User           string
	Passwd         string
	PaymentPasswd  *string
	InvitationCode string
	VerificationId string
}

type SignUpResponse struct {
	SessionId    SessionId `json:"sessionId,omitempty"`
	MfaRequired  bool      `json:"mfaRequired"`
	MfaSessionId string    `json:"mfaSessionId,omitempty"`
	Phone        string    `json:"phone,omitempty"`
}

type SignupSession struct {
	NetId       string
	NetIdPasswd string
	Phone       string
	Verified    bool
	SendOtp     func() error
	OtpChan     chan string
	ResultChan  chan error
	CreatedAt   time.Time
}

func (t *SessionManager) VerifyNetId(params *VerifyNetIdParams) (SignUpResponse, error) {
	// Clean up expired sessions first
	t.signupSessions.Range(func(key, value interface{}) bool {
		sess := value.(*SignupSession)
		if time.Since(sess.CreatedAt) > 5*time.Minute {
			select {
			case sess.OtpChan <- "":
			default:
			}
			t.signupSessions.Delete(key)
		}
		return true
	})

	var loginURL string
	if t.reserverPlugin != nil {
		loginURL = t.reserverPlugin.LoginURL
	} else {
		loginURL = "https://lms.xjtu.edu.cn/"
		// return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: "Reserver plugin is not loaded, NetID validation is unavailable"}
	}

	mfaSessionIdBytes := make([]byte, 16)
	if _, randErr := rand.Read(mfaSessionIdBytes); randErr != nil {
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: randErr.Error()}
	}
	mfaSessionId := base32.StdEncoding.EncodeToString(mfaSessionIdBytes)

	otpChan := make(chan string)
	resultChan := make(chan error, 1)
	mfaPromptChan := make(chan string, 1)

	session := &SignupSession{
		NetId:       params.NetId,
		NetIdPasswd: params.NetIdPasswd,
		OtpChan:     otpChan,
		ResultChan:  resultChan,
		CreatedAt:   time.Now(),
	}
	t.signupSessions.Store(mfaSessionId, session)

	go func() {
		mfaHandler := func(phone string, send_otp func() error) (otp string, trust_device bool, err error) {
			session.Phone = phone
			session.SendOtp = send_otp
			mfaPromptChan <- phone

			select {
			case otp = <-otpChan:
				if otp == "" {
					return "", false, fmt.Errorf("OTP registration cancelled")
				}
				return otp, true, nil
			case <-time.After(5 * time.Minute):
				return "", false, fmt.Errorf("OTP timeout")
			}
		}

		_, loginErr := xjtulogin.Login(loginURL, params.NetId, params.NetIdPasswd, mfaHandler)
		if loginErr != nil {
			resultChan <- loginErr
			return
		}

		resultChan <- nil
	}()

	select {
	case phone := <-mfaPromptChan:
		return SignUpResponse{
			MfaRequired:  true,
			MfaSessionId: mfaSessionId,
			Phone:        phone,
		}, nil
	case err := <-resultChan:
		if err != nil {
			t.signupSessions.Delete(mfaSessionId)
			return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InvalidAccount, Message: fmt.Sprintf("NetID Login failed: %s", err.Error())}
		}
		session.Verified = true
		return SignUpResponse{
			MfaRequired:  false,
			MfaSessionId: mfaSessionId,
		}, nil
	case <-time.After(15 * time.Second):
		return SignUpResponse{}, fmt.Errorf("login response timeout")
	}
}

func (t *SessionManager) SignUp(params *SignUpParams) (SignUpResponse, error) {
	invited, err := t.CheckInvitation(&CheckInvitationParams{Code: params.InvitationCode})
	if err != nil {
		return SignUpResponse{}, err
	}
	if !invited {
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "Invitation Code Error"}
	}
	if !CheckPasswd(params.Passwd) {
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InvalidPasswd}
	}

	val, ok := t.signupSessions.Load(params.VerificationId)
	if !ok {
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "Invalid or expired NetID verification session"}
	}
	session := val.(*SignupSession)
	if !session.Verified {
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "NetID verification is not completed yet"}
	}

	new_user, err := auth.RegisterUser(t.conn, params.User, params.Passwd, session.NetId, session.NetIdPasswd, params.PaymentPasswd)
	if err != nil {
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: fmt.Sprintf("Cannot register the user because of Server Error: %s", err.Error())}
	}

	_, err = t.conn.ExecContext(context.Background(), "DELETE FROM `invitations` WHERE `code` = ?", params.InvitationCode)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[Warning] Failed to delete invitation code: %v\n", err)
	}

	t.signupSessions.Delete(params.VerificationId)

	session_id := newSessionId()
	t.sessions.Store(session_id, Session{
		Expiry: time.Now().Add(account_login_expiry),
		User:   &new_user,
	})

	return SignUpResponse{
		SessionId: session_id,
	}, nil
}

type SignUpSendOtpParams struct {
	MfaSessionId string
}

func (t *SessionManager) SignUpSendOtp(params *SignUpSendOtpParams) (interface{}, error) {
	val, ok := t.signupSessions.Load(params.MfaSessionId)
	if !ok {
		return nil, constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "Invalid or expired MFA session"}
	}
	session := val.(*SignupSession)
	if session.SendOtp == nil {
		return nil, constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "Send OTP not ready or already sent"}
	}
	err := session.SendOtp()
	if err != nil {
		return nil, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: err.Error()}
	}
	return nil, nil
}

type SignUpSubmitOtpParams struct {
	MfaSessionId string
	Otp          string
}

func (t *SessionManager) SignUpSubmitOtp(params *SignUpSubmitOtpParams) (SignUpResponse, error) {
	val, ok := t.signupSessions.Load(params.MfaSessionId)
	if !ok {
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "Invalid or expired MFA session"}
	}
	session := val.(*SignupSession)

	select {
	case session.OtpChan <- params.Otp:
	default:
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "OTP channel not ready"}
	}

	select {
	case err := <-session.ResultChan:
		if err != nil {
			t.signupSessions.Delete(params.MfaSessionId)
			return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InvalidAccount, Message: fmt.Sprintf("NetID Login failed: %s", err.Error())}
		}
		session.Verified = true
		return SignUpResponse{
			MfaRequired:  false,
			MfaSessionId: params.MfaSessionId,
		}, nil
	case <-time.After(3 * time.Minute):
		t.signupSessions.Delete(params.MfaSessionId)
		return SignUpResponse{}, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: "OTP verification timeout"}
	}
}

type LoginParams struct {
	User   string
	Passwd string
}

func (t *SessionManager) Login(params *LoginParams) (SessionId, error) {
	var login_account auth.User
	row := t.conn.QueryRowContext(context.Background(), "SELECT `user`, `passwd`, `netid`, `salt`, `netid_passwd`, `payment_passwd` FROM `users` WHERE `user` = ?", params.User)
	err := row.Scan(&login_account.User, &login_account.Passwd, &login_account.NetId, &login_account.Salt, &login_account.NetIdPasswd, &login_account.PaymentPasswd)
	if err != nil {
		return "", constant.TennisApiError{ErrorType: constant.NonExistAccount}
	}
	if err := bcrypt.CompareHashAndPassword([]byte(login_account.Passwd), []byte(params.Passwd)); err != nil {
		return "", constant.TennisApiError{ErrorType: constant.WrongPasswd}
	}
	session_id := newSessionId()
	t.sessions.Store(session_id, Session{
		Expiry: time.Now().Add(account_login_expiry),
		User:   &login_account,
	})
	return session_id, nil
}
func (t *SessionManager) getSession(session SessionId) (*auth.User, error) {
	val, ok := t.sessions.Load(session)
	if !ok {
		return nil, constant.TennisApiError{ErrorType: constant.NotLoggedIn}
	}
	sess, _ := val.(Session)
	if time.Now().After(sess.Expiry) {
		t.sessions.Delete(session)
		return nil, constant.TennisApiError{ErrorType: constant.NotLoggedIn}
	}
	return sess.User, nil
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
		return constant.TennisApiError{ErrorType: constant.InvalidPasswd}
	}

	// decrypt and reencrypt data
	authorization, err := account.DecryptUserData(params.OldPasswd)
	if err != nil {
		return constant.TennisApiError{ErrorType: constant.WrongPasswd}
	}

	// change password.
	// If password is not changed correctly, the information will not be re-encrypted.
	new_account := *account
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(params.NewPasswd), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	err = new_account.EncryptUserData(params.NewPasswd, *authorization)
	if err != nil {
		return constant.TennisApiError{ErrorType: constant.InternalServerError}
	}
	new_account.Passwd = string(hashedPassword)

	return t.WriteAccounts(new_account, account)
}

type ChangeIdentityParams struct {
	Session        SessionId
	Passwd         string
	VerificationId *string
	PaymentPasswd  *string
}

func (t *SessionManager) ChangeIdentity(params *ChangeIdentityParams) error {
	account, err := t.getSession(params.Session)
	if err != nil {
		return err
	}

	// decrypt and reencrypt data
	authorization, err := account.DecryptUserData(params.Passwd)
	if err != nil {
		return constant.TennisApiError{ErrorType: constant.WrongPasswd}
	}

	if params.VerificationId != nil {
		val, ok := t.signupSessions.Load(*params.VerificationId)
		if !ok {
			return constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "Invalid or expired NetID verification session"}
		}
		session := val.(*SignupSession)
		if !session.Verified {
			return constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "NetID verification is not completed yet"}
		}

		authorization.NetId = session.NetId
		authorization.NetIdPasswd = auth.Decrypted(session.NetIdPasswd)

		// delete verification session
		t.signupSessions.Delete(*params.VerificationId)
	}

	if params.PaymentPasswd != nil {
		authorization.PaymentPasswd = auth.Decrypted(*params.PaymentPasswd)
	}

	new_account := *account
	err = new_account.EncryptUserData(params.Passwd, *authorization)
	if err != nil {
		return constant.TennisApiError{ErrorType: constant.InternalServerError}
	}

	// write back
	return t.WriteAccounts(new_account, account)
}

// old account must be within the SessionManager
func (t *SessionManager) WriteAccounts(new_account auth.User, account *auth.User) error {

	// Write back to user database
	_, err := t.conn.ExecContext(context.Background(), "UPDATE `users` SET `passwd` = ?, `salt` = ?, `netid_passwd` = ?, `payment_passwd` = ? WHERE `user` = ?",
		new_account.Passwd, new_account.Salt, new_account.NetIdPasswd, new_account.PaymentPasswd, new_account.User)

	if err != nil {
		return constant.TennisApiError{ErrorType: constant.InternalServerError, Message: "SQL transaction error"}
	}

	// Now transaction is done. No error would happen after now.
	// Save back to session memory.
	*account = new_account
	return nil
}

type SessionOnlyParams struct {
	Session SessionId
}

func (t *SessionManager) GetLoginAccount(params *SessionOnlyParams) (*auth.User, error) {
	account, err := t.getSession(params.Session)
	if err != nil {
		return nil, err
	}
	// only returning User, NetId
	cloneAccount := auth.User{
		User:  account.User,
		NetId: account.NetId,
	}
	return &cloneAccount, nil
}
func (t *SessionManager) SignOut(params *SessionOnlyParams) {
	t.sessions.Delete(params.Session)
}

type ReservationCompatible struct {
	Date        string
	Site        court_reserver_interface.Site
	Preferences []constant.SingleBookCompatible
	Priority    int
}

type PlaceReservationParams struct {
	Session     SessionId
	Reservation ReservationCompatible
}

type PlaceReservationRespnse struct {
	Uid               string
	NeedAuthorization bool
}

func (t *SessionManager) PlaceReservation(params *PlaceReservationParams) (PlaceReservationRespnse, error) {
	account, err := t.getSession(params.Session)
	if err != nil {
		return PlaceReservationRespnse{}, err
	}
	data, err := json.Marshal(params.Reservation.Preferences)
	if err != nil {
		return PlaceReservationRespnse{}, err
	}
	date, err := time.ParseInLocation(constant.DATE_FORMAT, params.Reservation.Date, t.timeZone)
	now := time.Now().In(t.timeZone)
	today_y, today_m, today_d := now.Date()
	today_start := time.Date(today_y, today_m, today_d, 0, 0, 0, 0, t.timeZone)
	if err != nil || date.Before(today_start) {
		return PlaceReservationRespnse{}, constant.TennisApiError{ErrorType: constant.MalformedData, Message: "Invalid date"}
	}
	var reservation_date time.Time
	if t.reserverPlugin != nil {

		reservation_date = date.Add(-time.Duration(t.reserverPlugin.SiteLookahead(params.Reservation.Site)) * 24 * time.Hour)
	}
	res_y, res_m, res_d := reservation_date.Date()
	reservation_booking_start := time.Date(res_y, res_m, res_d, 0, 0, 0, 0, t.timeZone).Add(plugins.BOOKING_START)

	today_booking_start := time.Date(today_y, today_m, today_d, 0, 0, 0, 0, t.timeZone).Add(plugins.BOOKING_START)
	today_booking_end := time.Date(today_y, today_m, today_d, 0, 0, 0, 0, t.timeZone).Add(plugins.BOOKING_END)

	// book immediately if in booking time
	var reserve_on string = reservation_date.Format(constant.DATE_FORMAT)

	if now.After(reservation_booking_start) {
		// if now is available for booking, book now
		if now.Before(today_booking_end) {
			reserve_on = today_booking_start.Format(constant.DATE_FORMAT)
		} else {
			// else book tomorrow.
			reserve_on = today_booking_start.Add(time.Duration(24) * time.Hour).Format(constant.DATE_FORMAT)
		}
	}
	var uid int64
	for i := 0; i < 10; i++ { // trying insert for 10 times

		ctx := context.Background()
		uid_data := make([]byte, 8)
		_, err := rand.Read(uid_data)
		if err != nil {
			panic(err)
		}
		uid = int64(binary.LittleEndian.Uint64(uid_data))
		var status_code court_reserver_interface.ReservationStatusCode
		if t.reserverPlugin == nil {
			status_code = court_reserver_interface.Pending
		} else {
			status_code = court_reserver_interface.NeedAuthorization
		}

		stmt, err := t.conn.PrepareContext(ctx, "INSERT INTO `reservations` (`uid`, `user`, `date`, `site`, `preferences`, `priority`, `reserve_on`, `status_code`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
		if err != nil {
			return PlaceReservationRespnse{}, err
		}
		_, err = stmt.Exec(uid, account.User, params.Reservation.Date, params.Reservation.Site, data, params.Reservation.Priority, reserve_on, status_code)
		if err == nil {
			break
		}
		fmt.Printf("[ReservationHandler] Create reservation failed, there might be ID collision. Retry (%d/10)...\n", i+1)
	}

	// book immediately if in booking time.
	// But if no reserver plugin is find, do not reserve.
	if t.reserverPlugin == nil {
		return PlaceReservationRespnse{Uid: fmt.Sprintf("%d", uid), NeedAuthorization: false}, nil
	}
	return PlaceReservationRespnse{Uid: fmt.Sprintf("%d", uid), NeedAuthorization: true}, err
}

func (t *SessionManager) getReservationById(uid int64, account *auth.User) (*court_reserver_interface.Reservation, error) {

	row := t.conn.QueryRowContext(context.Background(), "SELECT `date`, `site`, `preferences`, `priority` FROM `reservations` WHERE `uid` = ? AND `user` = ?", uid, account.User)

	var date_str string
	var site court_reserver_interface.Site
	var preferences string
	var priority int

	err := row.Scan(&date_str, &site, &preferences, &priority)
	if err != nil {
		return nil, constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: fmt.Sprintf("No such reservation: %s", err.Error())}
	}

	var books []constant.SingleBookCompatible
	err = json.Unmarshal([]byte(preferences), &books)
	if err != nil {
		return nil, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: err.Error()}
	}
	date, err := time.ParseInLocation(constant.DATE_FORMAT, date_str, t.timeZone)
	if err != nil {
		return nil, constant.TennisApiError{ErrorType: constant.InternalServerError, Message: err.Error()}
	}
	books_internal := make([]court_reserver_interface.SingleBook, 0, len(books))
	for _, book := range books {
		books_internal = append(books_internal, book.Convert())
	}

	return &court_reserver_interface.Reservation{
		Date:        date,
		Site:        site,
		Preferences: books_internal,
		Priority:    priority,
	}, nil

}

type AuthorizeParams struct {
	Session SessionId
	Uid     string
	Passwd  string
}

func (t *SessionManager) Authorize(params *AuthorizeParams) error {
	account, err := t.getSession(params.Session)
	if err != nil {
		return err
	}

	uid, err := strconv.ParseInt(params.Uid, 10, 64)
	if err != nil {
		return constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: err.Error()}
	}

	authorization, err := account.DecryptUserData(params.Passwd)

	if err != nil {
		return constant.TennisApiError{ErrorType: constant.InvalidPasswd}
	}

	reservation, err := t.getReservationById(uid, account)
	if err != nil {
		return err
	}

	// book immediately if in booking time.
	// But if no reserver plugin is find, do not reserve.
	if t.reserverPlugin == nil {
		return nil
	}

	now := time.Now().In(t.timeZone)
	today_y, today_m, today_d := now.Date()

	res_y, res_m, res_d := reservation.Date.Date()
	reservation_booking_start := time.Date(res_y, res_m, res_d, 0, 0, 0, 0, t.timeZone).Add(plugins.BOOKING_START)

	today_booking_start := time.Date(today_y, today_m, today_d, 0, 0, 0, 0, t.timeZone).Add(plugins.BOOKING_START)
	today_booking_end := time.Date(today_y, today_m, today_d, 0, 0, 0, 0, t.timeZone).Add(plugins.BOOKING_END)

	if now.After(reservation_booking_start) && now.After(today_booking_start) && now.Before(today_booking_end) {
		go (func() {
			redir, err := xjtulogin.LoginNoninteractive(t.reserverPlugin.LoginURL, authorization.NetId, string(authorization.NetIdPasswd))

			// cannot login, return all failed.
			// reuse login
			if err != nil {
				plugins.UpdateReservation(t.conn, uid, court_reserver_interface.ReservationStatus{
					Code:      court_reserver_interface.Failed,
					Msg:       fmt.Sprintf("Login Error: %s", err.Error()),
					CourtTime: make(map[string]string),
				})
				fmt.Fprintf(os.Stderr, "[ERROR Session LOGIN] %s %s", time.Now().Format(time.RFC3339), err.Error())
				return
			}
			reserver := t.reserverPlugin.NewCourtReserver(redir)

			payment_passwd := string(authorization.PaymentPasswd)
			status := reserver.BookNow(t.timeZone, reservation, t.captchaSolver, &payment_passwd)

			err = plugins.UpdateReservation(t.conn, uid, status)
			if err != nil {
				fmt.Fprintf(os.Stderr, "[ERROR Session SQL] %s %s", time.Now().Format(time.RFC3339), err.Error())
			}
		})()
	} else {
		t.authorizationCache.PlaceAuthorization(uid, *authorization)
		_, err := t.conn.ExecContext(context.Background(), fmt.Sprintf("UPDATE `reservations` SET `status_code` = %d WHERE `uid` = ?", court_reserver_interface.Pending), uid)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[ERROR Session SQL] %s Cannot update SQL to pending: %s", time.Now().Format(time.RFC3339), err.Error())
		}
	}
	return nil
}

type CancelReservationParams struct {
	Session SessionId
	Uid     string
}

func (t *SessionManager) DeleteReservation(params *CancelReservationParams) error {
	account, err := t.getSession(params.Session)
	if err != nil {
		return err
	}

	res, err := t.conn.ExecContext(context.Background(), "DELETE FROM `reservations` WHERE `uid` = ? AND `user` = ?", params.Uid, account.User)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return constant.TennisApiError{ErrorType: constant.InvalidQuery, Message: "No matching reservation"}
	}
	return nil
}

type ReservationResult struct {
	Uid         string
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

	offset := params.Page * params.Limit
	var count uint
	err = t.conn.QueryRowContext(context.Background(), "SELECT COUNT(`uid`) FROM `reservations` WHERE `user` = ?", account.User).Scan(&count)
	if err != nil {
		return ReservationResponse{Count: 0, Result: nil}, err
	}
	rows, err := t.conn.QueryContext(context.Background(), "SELECT `uid`, `date`, `site`, `preferences`, `priority`, `status_code`, `msg`, `court_time` FROM `reservations` WHERE `user` = ? ORDER BY `created_at` DESC LIMIT ? OFFSET ?", account.User, params.Limit, offset)
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

		var books []constant.SingleBookCompatible
		err := json.Unmarshal([]byte(preferences), &books)
		if err != nil {
			return ReservationResponse{Count: 0, Result: nil}, err
		}
		reservationStatus := ReservationResult{
			Uid: fmt.Sprintf("%d", uid),
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
