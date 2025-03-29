package constant

import (
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
