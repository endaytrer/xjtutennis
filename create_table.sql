CREATE TABLE `reservations` (
    `uid` INTEGER PRIMARY KEY AUTOINCREMENT,
    `netid` TEXT NOT NULL,
    `passwd` TEXT NOT NULL,
    `date` TEXT NOT NULL,
    `site` INTEGER NOT NULL,
    `preferences` TEXT NOT NULL,
    `priority` INTEGER NOT NULL,
    `reserve_on` TEXT NOT NULL,
    `status_code` INTEGER NOT NULL DEFAULT 0,
    `msg` TEXT NOT NULL DEFAULT '',
    `court_time` TEXT NOT NULL DEFAULT '{}',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);