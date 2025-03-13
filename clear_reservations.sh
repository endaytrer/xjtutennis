#!/bin/bash
rm xjtutennis.db
sqlite3 xjtutennis.db < create_table.sql