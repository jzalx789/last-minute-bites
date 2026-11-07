"""Create a consistent private SQLite backup, including when the app is running."""
import argparse
from pathlib import Path
import sqlite3

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db',required=True)
    parser.add_argument('--out',required=True)
    args=parser.parse_args()
    source=Path(args.db).resolve();target=Path(args.out).resolve()
    if not source.is_file():parser.error('Source database does not exist.')
    if target.exists() or source==target:parser.error('Use a new output path; backups never overwrite files.')
    target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    # Read-only source avoids silently creating an empty database after a typo.
    with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as original:
        with sqlite3.connect(target) as copy:
            original.backup(copy)
            if copy.execute('PRAGMA integrity_check').fetchone()[0]!='ok':
                raise RuntimeError('Backup integrity check failed.')
    target.chmod(0o600)
    print('Created a consistent SQLite backup. Keep it private; it contains account and kitchen data.')
