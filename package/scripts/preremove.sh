#!/bin/sh
# On full removal (rpm: $1=0, deb: "remove"), stop and disable the service.
# Upgrades (rpm: $1=1, deb: "upgrade") leave it running.
set -e

if [ "$1" = "0" ] || [ "$1" = "remove" ]; then
  systemctl --no-reload disable xjtutennis.service >/dev/null 2>&1 || :
  systemctl stop xjtutennis.service >/dev/null 2>&1 || :
fi

exit 0