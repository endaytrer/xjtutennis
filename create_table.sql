PRAGMA foreign_keys = 1;

CREATE TABLE `users` (
    `user` TEXT NOT NULL PRIMARY KEY,
    `passwd` TEXT NOT NULL,
    `netid` TEXT NOT NULL,
    `salt` BLOB NOT NULL,
    `netid_passwd` BLOB NOT NULL,
    `payment_passwd` BLOB NOT NULL
);

CREATE TABLE `reservations` (
    `uid` INTEGER PRIMARY KEY AUTOINCREMENT,
    `user` TEXT NOT NULL,
    `date` TEXT NOT NULL,
    `site` INTEGER NOT NULL,
    `preferences` TEXT NOT NULL,
    `priority` INTEGER NOT NULL,
    `reserve_on` TEXT NOT NULL,
    `status_code` INTEGER NOT NULL DEFAULT 0,
    `msg` TEXT NOT NULL DEFAULT '',
    `court_time` TEXT NOT NULL DEFAULT '{}',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(`user`) REFERENCES `users`(`user`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE `invitations` (
    `code` TEXT NOT NULL PRIMARY KEY
);