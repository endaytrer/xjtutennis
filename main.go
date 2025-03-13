package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	"github.com/endaytrer/court_reserver"
	_ "github.com/mattn/go-sqlite3"
)

const http_port = 25571

func usage(program string) {
	fmt.Fprintf(os.Stderr, "usage: %s captcha_url\n", program)
	os.Exit(2)
}
func main() {
	if len(os.Args) != 2 {
		usage(os.Args[0])
	}
	captcha_url := os.Args[1]
	db, err := sql.Open("sqlite3", "xjtutennis.db")
	if err != nil {
		panic("db creation failed")
	}
	conn_session, err := db.Conn(context.Background())
	if err != nil {
		panic("db connection failed")
	}
	captcha_solver := court_reserver.InstancedCaptchaSolver(captcha_url)
	session_mgr, err := NewSessionManager(conn_session, &captcha_solver)
	if err != nil {
		panic("session manager creation failed")
	}
	conn_reserver, err := db.Conn(context.Background())
	if err != nil {
		panic("db connection failed")
	}
	reserver := NewReservationHandler(conn_reserver, &captcha_solver)
	go reserver.MainEvent()
	ServeHTTP(session_mgr, http_port)
}
