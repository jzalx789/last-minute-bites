#!/bin/bash
# Run on the user's own Mac. Never stores or prints a hosting API token.
set -e
cd -- "$(dirname -- "$0")"
echo 'Last Minute Bites: deploy to your existing FREE PythonAnywhere account.'
echo 'Your new API Token will be entered privately here; do not paste it into chat.'
if ! python3 -c 'import sqlite3, zoneinfo, sys; assert sys.version_info >= (3,12)' 2>/dev/null; then
  echo 'Install Python 3.12+ from https://www.python.org/downloads/macos/ and try again.'
  read -r -p 'Press Return to close. '
  exit 1
fi
read -r -p 'PythonAnywhere username [Jzalx]: ' lmb_account
lmb_account="${lmb_account:-Jzalx}"
if python3 scripts/deploy_pythonanywhere.py --username "$lmb_account" --apply --ask-token --demo; then
  echo 'Deployment checks passed. Save the displayed demo account details for your instructor.'
else
  echo 'Deployment stopped. Existing unrelated websites are preserved. Copy the error message only, never your Token.'
fi
read -r -p 'Press Return to close this window. '
