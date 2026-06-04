package main

import (
	"context"
	"database/sql"
	_ "embed"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/endaytrer/court_reserver_interface/captcha_solver"
	"github.com/endaytrer/xjtutennis/api"
	"github.com/endaytrer/xjtutennis/auth"
	"github.com/endaytrer/xjtutennis/plugins"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
	"gopkg.in/yaml.v3"
)

//go:embed create_table.sql
var createTableSQL string

//go:embed config.example.yaml
var defaultConfig []byte

func main() {
	var cliConfigPath string
	var cliDatabasePath string
	var cliReserverPluginPath, cliChallengeURL string
	var cliListenAddr string

	flag.StringVar(&cliReserverPluginPath, "reserver-plugin", "", "If provided, choose the reserver plugin of XJTUTennis")
	flag.StringVar(&cliChallengeURL, "challenge-url", "", "Must be given if reserverPlugin is given")
	flag.StringVar(&cliListenAddr, "listen-addr", "", "the listen address")
	flag.StringVar(&cliDatabasePath, "database", "", "Path to SQLite database file")
	flag.StringVar(&cliConfigPath, "config", "", "Path to YAML config file")
	flag.Parse()

	type Config struct {
		ReserverPluginPath string `yaml:"reserver-plugin"`
		ChallengeURL       string `yaml:"challenge-url"`
		ListenAddr         string `yaml:"listen-addr"`
		DatabasePath       string `yaml:"database-path"`
	}

	config := Config{
		ListenAddr:   "0.0.0.0:25571", // default port
		DatabasePath: "xjtutennis.db",
	}

	if cliConfigPath != "" {
		configFile, err := os.ReadFile(cliConfigPath)
		if err != nil {
			if !os.IsNotExist(err) {
				fmt.Fprintf(os.Stderr, "Error reading config file: %v\n", err)
				os.Exit(1)
			}
			// not exist is not an error, create a default config based on defaultConfig
			// In this case, the default database path should be /var/lib/xjtutennis/xjtutennis.db
			// Can still be overwritten by -database option
			config.DatabasePath = "/var/lib/xjtutennis/xjtutennis.db"
			if err = os.WriteFile(cliConfigPath, defaultConfig, 0644); err != nil {
				fmt.Fprintf(os.Stderr, "Error writing config file: %v\n", err)
				os.Exit(1)
			}
		} else {
			err = yaml.Unmarshal(configFile, &config)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error parsing config file: %v\n", err)
				os.Exit(1)
			}
		}
	}

	// Apply overrides
	if cliReserverPluginPath != "" {
		config.ReserverPluginPath = cliReserverPluginPath
	}
	if cliChallengeURL != "" {
		config.ChallengeURL = cliChallengeURL
	}
	if cliListenAddr != "" {
		config.ListenAddr = cliListenAddr
	}
	if cliDatabasePath != "" {
		config.DatabasePath = cliDatabasePath
	}

	if config.ReserverPluginPath != "" && config.ChallengeURL == "" {
		fmt.Fprintln(os.Stderr, "If reserver is given, the challenge URL must be given by -challenge-url.")
		flag.Usage()
		os.Exit(1)
	}

	root_admin_token := uuid.New()
	fmt.Printf("Visit %s/admin?token=%s to access admin portal.\n", config.ListenAddr, root_admin_token.String())

	authorization_cache := auth.NewAuthorizationCache()
	var court_reserver *plugins.CourtReserverPlugin
	var err error
	if config.ReserverPluginPath != "" {
		court_reserver, err = plugins.LoadCourtReserver(config.ReserverPluginPath)
		if err != nil {
			panic(fmt.Sprintf("Cannot load reserver plugin: %s", err.Error()))
		}
	}

	db, err := sql.Open("sqlite3", config.DatabasePath)
	if err != nil {
		panic("db opening failed")
	}
	if _, err := db.Exec(createTableSQL); err != nil {
		panic(fmt.Sprintf("database initialization failed: %v", err))
	}
	conn_session, err := db.Conn(context.Background())
	if err != nil {
		panic("db connection failed")
	}
	var solver captcha_solver.CaptchaSolver = nil

	if court_reserver != nil {
		solver = court_reserver.NewCaptchaSolver(config.ChallengeURL)
	}

	session_mgr, err := api.NewSessionManager(conn_session, solver, court_reserver, authorization_cache, root_admin_token)
	if err != nil {
		panic("session manager creation failed")
	}

	if court_reserver != nil {
		conn_reserver, err := db.Conn(context.Background())
		if err != nil {
			panic("db connection failed")
		}
		reserver := plugins.NewReservationHandler(conn_reserver, solver, court_reserver, authorization_cache)
		go reserver.MainEvent()
	} else {
		fmt.Printf("[Info] %s The program is running without a reserver. You can still place reservations, but none of them will be served.\n", time.Now().Format(time.RFC3339))
	}

	api.ServeHTTP(session_mgr, config.ListenAddr)
}
