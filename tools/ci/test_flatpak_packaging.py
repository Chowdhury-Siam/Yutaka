"""Check that Flatpak verification rejects failed launches and missing storage."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


class FlatpakPackagingTest(unittest.TestCase):
    def test_launch_and_initialization_gate(self):
        script = Path(__file__).resolve().parents[2] / 'tools/flatpak/verify.sh'
        for launch_status, runtime_status, has_database, expected in [
            (124, 0, True, 0),
            (1, 0, True, 1),
            (0, 0, True, 1),
            (124, 1, True, 1),
            (124, 0, False, 1),
        ]:
            with self.subTest(launch_status=launch_status, runtime_status=runtime_status,
                              has_database=has_database), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                database = root / 'private.sqlite'
                database.write_bytes(b'fixture' if has_database else b'')
                commands = {
                    'flatpak': '#!/bin/sh\ncase "$1" in\ninstall) exit 0;;\nrun) printf "%s" "$5" | sh -n || exit 1; exit "$RUNTIME_STATUS";;\nesac\nexit 1\n',
                    'xvfb-run': '#!/bin/sh\nshift\nexec "$@"\n',
                    'dbus-run-session': '#!/bin/sh\nshift\nexec "$@"\n',
                    'timeout': '#!/bin/sh\nexit "$LAUNCH_STATUS"\n',
                    'find': '#!/bin/sh\nprintf "%s\\n" "$TEST_DATABASE"\n',
                }
                for name, content in commands.items():
                    path = root / name
                    path.write_text(content)
                    path.chmod(0o755)
                env = dict(os.environ, PATH=f'{root}{os.pathsep}{os.environ["PATH"]}',
                           LAUNCH_STATUS=str(launch_status), RUNTIME_STATUS=str(runtime_status),
                           TEST_DATABASE=str(database))
                result = subprocess.run(['bash', str(script), 'fixture.flatpak'], cwd=root,
                                        env=env, capture_output=True, text=True, timeout=5)
                self.assertEqual(result.returncode, expected, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
