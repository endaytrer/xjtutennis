#!/bin/bash
touch user_data.csv
sqlite3 xjtutennis.db < create_table.sql