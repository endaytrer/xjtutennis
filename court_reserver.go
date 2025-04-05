package main

import (
	"plugin"

	"github.com/endaytrer/court_reserver_interface"
	"github.com/endaytrer/court_reserver_interface/captcha_solver"
)

type CourtReserverPlugin struct {
	NewCourtReserver func(redir string) court_reserver_interface.CourtReserver
	NewCaptchaSolver func(challenge_url string) captcha_solver.CaptchaSolver
	SiteLookahead    func(court_reserver_interface.Site) int
	LoginURL         string
	Version          string
}

func loadCourtReserver(path string) (*CourtReserverPlugin, error) {
	plug, err := plugin.Open(path)
	if err != nil {
		return nil, err
	}
	new_court_reserver, err := plug.Lookup("NewDefaultCourtReserver")
	if err != nil {
		return nil, err
	}

	new_captcha_solver, err := plug.Lookup("NewDefaultCaptchaSolver")
	if err != nil {
		return nil, err
	}

	site_lookahead, err := plug.Lookup("SiteLookahead")
	if err != nil {
		return nil, err
	}

	login_url, err := plug.Lookup("CourtReserveLoginUrl")
	if err != nil {
		return nil, err
	}

	version, err := plug.Lookup("Version")
	if err != nil {
		return nil, err
	}

	return &CourtReserverPlugin{
		NewCourtReserver: new_court_reserver.(func(redir string) court_reserver_interface.CourtReserver),
		NewCaptchaSolver: new_captcha_solver.(func(challenge_url string) captcha_solver.CaptchaSolver),
		SiteLookahead:    site_lookahead.(func(court_reserver_interface.Site) int),
		LoginURL:         *login_url.(*string),
		Version:          *version.(*string),
	}, nil
}
