#!/bin/bash
csv_file="user_data.csv"

# Initialize arrays for columns 1 and 3
users=()
netids=()

# Read each line of the CSV file
while IFS=, read -r f1 f2 f3 rest
do
    users+=("$f1")
    netids+=("$f3")
done < "$csv_file"

echo 'BEGIN TRANSACTIONS;'
echo 'ALTER TABLE reservations RENAME TO old_reservations;'
cat create_table.sql
echo
for index in "${!users[@]}"; do
    user=${users[index]}
    netid=${netids[index]}

    echo "INSERT INTO reservations (uid, user, date, site, preferences, priority, reserve_on, status_code, msg, court_time, created_at) SELECT uid, '${user}', date, site, preferences, priority, reserve_on, status_code, msg, court_time, created_at FROM old_reservations WHERE netid = '${netid}';"

done

echo 'DROP TABLE old_reservations;'
echo 'COMMIT;'
echo 'PRAGMA foreign_keys = 1;'