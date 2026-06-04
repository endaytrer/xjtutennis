#!/bin/sh
# Create the unprivileged service user/group that runs webadmin and owns its
# state directory. Idempotent across install and upgrade.
set -e

getent group xjtutennis >/dev/null 2>&1 || groupadd --system xjtutennis
getent passwd xjtutennis >/dev/null 2>&1 || \
  useradd --system --gid xjtutennis --home-dir /var/lib/xjtutennis \
          --shell /sbin/nologin --comment "Tennis court booking system" xjtutennis

exit 0