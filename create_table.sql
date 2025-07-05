PRAGMA foreign_keys = 1;

CREATE TABLE IF NOT EXISTS `users` (
    `user` TEXT NOT NULL PRIMARY KEY,
    `passwd` TEXT NOT NULL,
    `netid` TEXT NOT NULL,
    `salt` BLOB NOT NULL,
    `netid_passwd` BLOB NOT NULL,
    `payment_passwd` BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS `reservations` (
    `uid` INTEGER NOT NULL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS `invitations` (
    `code` TEXT NOT NULL PRIMARY KEY
);