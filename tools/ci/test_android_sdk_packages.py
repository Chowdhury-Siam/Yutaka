"""Exercise the Android SDK workflow step without downloading packages."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


class AndroidSdkPackagesTest(unittest.TestCase):
    def test_missing_packages_and_sdk_failures(self):
        workflow = (Path(__file__).resolve().parents[2] /
                    '.github/workflows/build-android-apks.yml').read_text()
        step = workflow.split('      - name: Verify preinstalled Android SDK 36 and NDK 28\n', 1)[1]
        step = step.split('\n      - name:', 1)[0]
        script = '\n'.join(line[10:] for line in step.split('        run: |\n', 1)[1].splitlines())
        packages = {
            'platforms;android-36': 'platforms/android-36',
            'build-tools;36.0.0': 'build-tools/36.0.0',
            'ndk;28.2.13676358': 'ndk/28.2.13676358',
        }
        for missing, has_manager, license_status, install_status, expected in [
            (['ndk;28.2.13676358'], True, 0, 0, 0),
            (list(packages), True, 0, 0, 0),
            ([], False, 0, 0, 0),
            (['ndk;28.2.13676358'], False, 0, 0, 1),
            (['ndk;28.2.13676358'], True, 7, 0, 7),
            (['ndk;28.2.13676358'], True, 0, 8, 8),
        ]:
            with self.subTest(missing=missing, has_manager=has_manager,
                              license_status=license_status, install_status=install_status), \
                    tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                sdk = root / 'Android SDK'
                for package, path in packages.items():
                    if package not in missing:
                        (sdk / path).mkdir(parents=True)
                if has_manager:
                    manager = sdk / 'cmdline-tools/latest/bin/sdkmanager'
                    manager.parent.mkdir(parents=True)
                    manager.write_bytes(b'''#!/bin/sh
set -eu
test "$1" = "--sdk_root=$ANDROID_HOME"
shift
printf '%s\n' "$@" >> "$SDK_CALLS"
if [ "$1" = --licenses ]; then
  read -r answer
  test "$answer" = y
  exit "$LICENSE_STATUS"
fi
exit "$INSTALL_STATUS"
''')
                    manager.chmod(0o755)
                calls = root / 'calls'
                env = dict(os.environ, ANDROID_HOME=sdk.as_posix(), SDK_CALLS=calls.as_posix(),
                           LICENSE_STATUS=str(license_status), INSTALL_STATUS=str(install_status))
                # The fixture's cmdline-tools/bin is deliberately absent from PATH.
                result = subprocess.run(['bash', '-c', script], cwd=root, env=env,
                                        capture_output=True, text=True, timeout=10)
                self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
                expected_calls = (['--licenses'] + (missing if license_status == 0 else [])
                                  if missing and has_manager else [])
                self.assertEqual(calls.read_text().splitlines() if calls.exists() else [], expected_calls)
                self.assertNotIn('Broken pipe', result.stderr)
                if missing and not has_manager:
                    self.assertIn('Android SDK manager is missing', result.stderr)


if __name__ == '__main__':
    unittest.main()
