"""Regression checks for stale course exports and private-file exclusion."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('course_package', Path(__file__).resolve().parents[1] / 'scripts/package.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.run_git('init', '-q')
        self.run_git('config', 'user.name', 'Synthetic package test')
        self.run_git('config', 'user.email', 'package@example.test')
        for name, content in {
            'web/release.js': 'export const APP_VERSION = "1.4.2";',
            'static/app.js': 'const CLIENT_VERSION = "1.4.2";',
            'README.md': 'Synthetic test export',
            '.gitignore': '.data/\n',
            'submission/S01G10.zip': 'An old archive that must not be embedded',
        }.items():
            target = self.root / name
            target.parent.mkdir(exist_ok=True, parents=True)
            target.write_text(content)
        (self.root / '.data').mkdir()
        (self.root / '.data/credentials.json').write_text('{"synthetic":"private"}')
        self.run_git('add', '.')
        self.run_git('commit', '-qm', 'Synthetic fixture')
        self.output = self.root / 'artifacts/S01G10.zip'

    def run_git(self, *args):
        subprocess.run(['git', *args], cwd=self.root, check=True, capture_output=True)

    def test_export_excludes_old_archive_and_private_runtime_data(self):
        manifest = package.build_package(self.root, self.output)
        self.assertEqual(manifest['application_version'], '1.4.2')
        self.assertFalse(manifest['source_worktree_modified'])
        with ZipFile(self.output) as archive:
            self.assertNotIn('S01G10/submission/S01G10.zip', archive.namelist())
            self.assertFalse(any('credentials' in name for name in archive.namelist()))
        package.verify_package(self.output, self.root)

    def test_source_changes_and_new_files_cannot_pass_as_the_old_export(self):
        package.build_package(self.root, self.output)
        (self.root / 'static/app.js').write_text('const CLIENT_VERSION = "1.4.2"; // revised UI')
        with self.assertRaisesRegex(ValueError, 'Stale archive'):
            package.verify_package(self.output, self.root)
        self.assertTrue(package.build_package(self.root, self.output)['source_worktree_modified'])
        (self.root / 'new-feature.js').write_text('export const feature = true;')
        self.run_git('add', 'new-feature.js')
        with self.assertRaisesRegex(ValueError, 'file list changed'):
            package.verify_package(self.output, self.root)

    def test_accidentally_tracked_secret_is_rejected(self):
        (self.root / '.env').write_text('SYNTHETIC_SECRET=must-not-be-packaged')
        self.run_git('add', '.env')
        with self.assertRaisesRegex(ValueError, 'private'):
            package.build_package(self.root, self.output)

    def test_mismatched_versions_and_oversized_exports_are_rejected(self):
        (self.root / 'static/app.js').write_text('const CLIENT_VERSION = "0.1";')
        with self.assertRaisesRegex(ValueError, 'release identifiers differ'):
            package.build_package(self.root, self.output)
        (self.root / 'static/app.js').write_text('const CLIENT_VERSION = "1.4.2";')
        package.build_package(self.root, self.output)
        old_limit = package.MAX_BYTES
        try:
            package.MAX_BYTES = 1
            with self.assertRaisesRegex(ValueError, '50 MB'):
                package.verify_package(self.output, self.root)
        finally:
            package.MAX_BYTES = old_limit


if __name__ == '__main__':
    unittest.main()
