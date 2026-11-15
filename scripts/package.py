"""Build or verify the course source export without private/runtime files.

The manifest identifies the source snapshot and hashes every included file,
preventing a stale archive from passing as the current application.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'S01G10/'
MANIFEST = 'SUBMISSION_MANIFEST.json'
ARCHIVE = 'submission/S01G10.zip'
APP_URL = 'https://last-minute-bites-demo.jzalx789.workers.dev/'
MAX_BYTES = 50_000_000
PRIVATE_PARTS = {'.git', '.data', '.wrangler', 'data', 'runtime', 'artifacts',
                 'node_modules', '.venv', 'venv', '__pycache__', 'work', 'outputs'}
PRIVATE_SUFFIXES = {'.db', '.sqlite', '.sqlite3', '.pyc', '.key', '.pem', '.p12', '.jks', '.keystore'}


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root).decode().rstrip('\n')


def check_path(name):
    path = PurePosixPath(name)
    if (path.is_absolute() or '..' in path.parts or '\\' in name or
            any(part in PRIVATE_PARTS for part in path.parts) or
            path.suffix in PRIVATE_SUFFIXES or path.name.endswith(('-wal', '-shm')) or
            path.name == '.DS_Store' or
            (path.name.startswith('.env') and path.name != '.env.example')):
        raise ValueError(f'Refusing a private, runtime or unsafe path: {name}')


def tracked_files(root):
    files = sorted(name for name in git(root, 'ls-files', '-z').split('\0') if name and name != ARCHIVE)
    for name in files:
        check_path(name)
        path = root / name
        if path.is_symlink() or not path.is_file():
            raise ValueError(f'Expected a regular tracked source file: {name}')
    return files


def version(data, constant):
    match = re.search(r'\b' + constant + r'\s*=\s*"([0-9.]+)"', data.decode())
    if not match:
        raise ValueError(f'Missing {constant}')
    return match[1]


def verify_package(output, root=None):
    if output.stat().st_size >= MAX_BYTES:
        raise ValueError('Source export exceeds the specification\'s 50 MB recommendation')
    with ZipFile(output) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate archive entries')
        if PREFIX + MANIFEST not in names:
            raise ValueError('Archive has no source manifest; rebuild it with scripts/package.py')
        manifest = json.loads(archive.read(PREFIX + MANIFEST))
        expected = {PREFIX + name for name in manifest['files']} | {PREFIX + MANIFEST}
        if set(names) != expected:
            raise ValueError('Archive contents differ from the manifest')
        for name, digest in manifest['files'].items():
            check_path(name)
            content = archive.read(PREFIX + name)
            if hashlib.sha256(content).hexdigest() != digest:
                raise ValueError(f'Archive hash mismatch: {name}')
            if root is not None and content != (root / name).read_bytes():
                raise ValueError(f'Stale archive: {name}; run scripts/package.py again')
        app_version = version(archive.read(PREFIX + 'web/release.js'), 'APP_VERSION')
        if (version(archive.read(PREFIX + 'static/app.js'), 'CLIENT_VERSION') != app_version or
                manifest['application_version'] != app_version):
            raise ValueError('Client/server/manifest versions differ')
        if root is not None and set(manifest['files']) != set(tracked_files(root)):
            raise ValueError('Source file list changed; rebuild the submission archive')
    return manifest


def build_package(root, output):
    payloads = {name: (root / name).read_bytes() for name in tracked_files(root)}
    app_version = version(payloads['web/release.js'], 'APP_VERSION')
    if version(payloads['static/app.js'], 'CLIENT_VERSION') != app_version:
        raise ValueError('Client and server release identifiers differ')
    manifest = {
        'format_version': 1,
        'application_version': app_version,
        'source_commit': git(root, 'rev-parse', 'HEAD'),
        'source_worktree_modified': any(name != ARCHIVE for name in git(root, 'diff', '--name-only', 'HEAD').splitlines()),
        'app_url': APP_URL,
        'delivery': 'Source export plus hosted HTML URL; not an APK or an offline app',
        'files': {name: hashlib.sha256(data).hexdigest() for name, data in payloads.items()},
    }
    payloads[MANIFEST] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    timestamp = datetime.fromtimestamp(int(git(root, 'show', '-s', '--format=%ct', 'HEAD')), timezone.utc)
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
        for name, data in payloads.items():
            info = ZipInfo(PREFIX + name, timestamp.timetuple()[:6])
            info.compress_type = ZIP_DEFLATED
            mode = (root / name).stat().st_mode if name != MANIFEST else 0o100644
            info.external_attr = (mode & 0xFFFF) << 16
            archive.writestr(info, data, compresslevel=9)
    verify_package(output, root)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', type=Path, help='Check an existing export against current source')
    parser.add_argument('--output', type=Path, help='Write only to this ZIP path')
    args = parser.parse_args()
    if args.verify:
        manifest = verify_package(args.verify, ROOT)
        print(f'Verified {args.verify}: app {manifest["application_version"]}, {len(manifest["files"])} source files')
        return
    output = args.output or ROOT / 'artifacts/S01G10.zip'
    manifest = build_package(ROOT, output)
    print(f'Created {output}: app {manifest["application_version"]}, {output.stat().st_size} bytes')
    if not args.output:
        target = ROOT / ARCHIVE
        target.parent.mkdir(exist_ok=True)
        shutil.copy2(output, target)
        print(f'Copied verified source export to {target}')


if __name__ == '__main__':
    main()
