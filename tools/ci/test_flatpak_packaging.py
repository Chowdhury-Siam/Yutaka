"""Check Linux JNI exclusion and Flatpak launch/storage verification."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap
import unittest


class FlatpakPackagingTest(unittest.TestCase):
    def test_linux_disables_optional_jni_even_with_cached_jdk(self):
        workflow = (Path(__file__).resolve().parents[2] /
                    '.github/workflows/build-linux.yml').read_text()
        step = workflow.split('- name: Configure Yutaka Linux runner', 1)[1]
        configure = textwrap.dedent(step.split("python3 - <<'PY'\n", 1)[1].split('\n          PY', 1)[0])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'linux/runner').mkdir(parents=True)
            (root / 'linux/flutter').mkdir()
            (root / 'linux/runner/my_application.cc').write_text('')
            # Simulate a discoverable host JDK without requiring Java in the test.
            (root / 'linux/FindJNI.cmake').write_text('set(JNI_FOUND TRUE)\n')
            (root / 'linux/flutter/generated_plugins.cmake').write_text(
                'find_package(JNI COMPONENTS JVM)\n'
                'if(JNI_FOUND)\n  message(FATAL_ERROR "Linux must not bundle JNI")\nendif()\n')
            for cached_jdk in ('FALSE', 'TRUE'):
                with self.subTest(cached_jdk=cached_jdk):
                    cmake = root / 'linux/CMakeLists.txt'
                    cmake.write_text('set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}")\n'
                                     f'set(JNI_FOUND {cached_jdk} CACHE BOOL "")\n'
                                     'include(flutter/generated_plugins.cmake)\n')
                    subprocess.run([sys.executable, '-c', configure], cwd=root, check=True)
                    result = subprocess.run(['cmake', '-P', 'CMakeLists.txt'], cwd=cmake.parent,
                                            capture_output=True, text=True, timeout=10)
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

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
