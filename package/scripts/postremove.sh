#!/bin/sh
# Reload systemd after the unit file is installed. The service user and the
# /var/lib/xjtutennis state directory are intentionally left in place so an
# uninstall does not destroy server data.
set -e

systemctl daemon-reload >/dev/null 2>&1 || :

exit 0