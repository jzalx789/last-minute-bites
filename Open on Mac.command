#!/bin/bash
# Local demo launcher. Keep this window open while using the app.
set -e
cd -- "$(dirname -- "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo 'Please install Python 3.12+ from https://www.python.org/downloads/macos/ and try again.'
  read -r -p 'Press Return to close. '
  exit 1
fi
if ! python3 -c 'import sqlite3, zoneinfo, sys; assert sys.version_info >= (3,12)' 2>/dev/null; then
  echo 'Python 3.12+ is required. Install it from https://www.python.org/downloads/macos/.'
  read -r -p 'Press Return to close. '
  exit 1
fi
python3 scripts/open_local.py
