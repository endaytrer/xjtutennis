package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/endaytrer/court_reserver_interface/captcha_solver"
	_ "github.com/mattn/go-sqlite3"
)


func usage(program string) {
	fmt.Fprintf(os.Stderr, "usage: %s captcha_url\n", program)
	os.Exit(2)
}

type mainArgs struct {
}

func main() {
	var reserver_plugin_path, challenge_url string
	var http_port int
	flag.StringVar(&reserver_plugin_path, "reserver-plugin", "", "If provided, choose the reserver plugin of XJTUTennis")
	flag.StringVar(&challenge_url, "challenge-url", "", "Must be given if reserverPlugin is given")
	flag.IntVar(&http_port, "port", 25571, "the port of serving")
	flag.Parse()

	if reserver_plugin_path != "" && challenge_url == "" {
		fmt.Fprintln(os.Stderr, "If reserver is given, the challenge URL must be given by -challenge-url.")
		flag.Usage()
		os.Exit(1)
	}
	var court_reserver *CourtReserverPlugin
	var err error
	if reserver_plugin_path != "" {
		court_reserver, err = loadCourtReserver(reserver_plugin_path)
		if err != nil {
			panic(fmt.Sprintf("Cannot load reserver plugin: %s", err.Error()))
		}
	}

	db, err := sql.Open("sqlite3", "xjtutennis.db")
	if err != nil {
		panic("db creation failed")
	}
	conn_session, err := db.Conn(context.Background())
	if err != nil {
		panic("db connection failed")
	}
	var solver captcha_solver.CaptchaSolver = nil

	if court_reserver != nil {
		solver = court_reserver.NewCaptchaSolver(challenge_url)
	}

	session_mgr, err := NewSessionManager(conn_session, solver, court_reserver)
	if err != nil {
		panic("session manager creation failed")
	}

	if court_reserver != nil {
		conn_reserver, err := db.Conn(context.Background())
		if err != nil {
			panic("db connection failed")
		}
		reserver := NewReservationHandler(conn_reserver, solver, court_reserver)
		go reserver.MainEvent()
	} else {
		fmt.Printf("[Info] %s The program is running without a reserver. You can still place reservations, but none of them will be served.\n", time.Now().Format(time.RFC3339))
	}

	ServeHTTP(session_mgr, http_port)
}
