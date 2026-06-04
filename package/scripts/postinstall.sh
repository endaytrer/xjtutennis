#!/bin/sh
# Reload systemd after the unit file is installed.
set -e

systemctl daemon-reload >/dev/null 2>&1 || :

exit 0