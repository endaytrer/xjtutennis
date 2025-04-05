package constant

import (
	"net/http"
	"time"

	"github.com/endaytrer/court_reserver_interface"
)

const DATE_FORMAT = "2006-01-02"

type SingleBookCompatible struct {
	// book all contiguous courts COVERINGs Date + StartTime to Date + StartTime + Duration. Time starts with UTC.
	StartTimeSec int
	DurationSec  int
	// preferring booking name
	CourtNamePreference []string
}

func (t SingleBookCompatible) Convert() court_reserver_interface.SingleBook {
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

const DEFAULT_PAYMENT_PASSWD = "888888"


type TennisApiErrorType int

type TennisApiError struct {
	ErrorType TennisApiErrorType
	Message   string
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
	switch t.ErrorType {
	case InternalServerError:
		return "Internal Server Error: " + t.Message
	case MalformedData:
		return "Malformed Data: " + t.Message
	case NonExistAccount:
		return "Account Not Existed"
	case InvalidAccount:
		return "Invalid Account: " + t.Message
	case WrongPasswd:
		return "Wrong Passwd"
	case InvalidPasswd:
		return "Invalid Passwd"
	case NotLoggedIn:
		return "Not Logged In"
	case InvalidQuery:
		return "Invalid Query: " + t.Message
	}
	panic("Error not covered")
}

func (t TennisApiError) ToHttpStatus() int {

	switch t.ErrorType {
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