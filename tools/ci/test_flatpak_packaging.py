"""Check Linux JNI exclusion and Flatpak launch/storage verification."""

import os
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap
import unittest


class FlatpakPackagingTest(unittest.TestCase):
    def test_lean_installer_selects_only_runtime_graphics_and_existing_scope(self):
        script = Path(__file__).resolve().parents[2] / 'tools/flatpak/install-lean.sh'
        # Exercise fresh installs, both architectures, existing system/user apps,
        # and a user app reusing a system runtime. Commands are recorded as argv.
        for arch, drivers, existing, runtime_scope, gl_branch, metadata_format in [
            ('x86_64', 'default\nhost\n', '', '--user', '26.08', 'version-first'),
            ('aarch64', 'default\nhost\n', '--user', '--user', '26.08', 'version-first'),
            ('x86_64', 'nvidia-595-104-02\ndefault\nhost\n', '--system', '--system', '26.08', 'versions-first'),
            ('aarch64', 'nvidia-595-104-02\ndefault\nhost\n', '--user', '--user', '26.08', 'nvidia-first'),
            ('x86_64', 'default\n', '--user', '--system', '27.08', 'version-first'),
            ('aarch64', 'default\n', '', '--user', '27.08', 'single-version'),
        ]:
            with self.subTest(arch=arch, existing=existing, runtime_scope=runtime_scope), \
                    tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                bundle = root / 'Yutaka bundle.flatpak'
                bundle.touch()
                log = root / 'calls.jsonl'
                flatpak = root / 'flatpak'
                flatpak.write_text('#!' + sys.executable + '\n' + textwrap.dedent('''
                    import json, os, sys
                    args = sys.argv[1:]
                    with open(os.environ['COMMAND_LOG'], 'a') as output:
                        output.write(json.dumps(args) + '\\n')
                    if args[0] == '--gl-drivers':
                        print(os.environ['DRIVERS'], end='')
                    elif args[0] == 'info':
                        if '--show-runtime' in args:
                            print('org.gnome.Platform/' + os.environ['ARCH'] + '/51')
                        elif '--show-metadata' in args:
                            if args[1] != os.environ['RUNTIME_SCOPE']:
                                sys.exit(1)
                            branch = os.environ['GL_BRANCH']
                            plural = 'versions=' + branch + ';' + branch + '-extra;1.4;'
                            keys = 'version=1.4\\n' + plural
                            if os.environ['METADATA_FORMAT'] == 'versions-first':
                                keys = plural + '\\nversion=1.4'
                            elif os.environ['METADATA_FORMAT'] == 'nvidia-first':
                                keys = 'version=1.4\\nversions=1.4;' + branch + '-extra;' + branch + ';'
                            elif os.environ['METADATA_FORMAT'] == 'single-version':
                                keys = 'version=' + branch
                            print('[Extension other]\\nversion=99.99\\n'
                                  '[Extension org.freedesktop.Platform.GL]\\n' + keys +
                                  '\\n[Extension org.freedesktop.Platform.GL.Debug]\\nversion=99.99')
                        elif '--show-origin' in args:
                            print('runtime-source')
                        else:
                            sys.exit(0 if args[1] == os.environ['EXISTING'] else 1)
                    elif args[0] == 'install':
                        sys.exit(int(os.environ.get('INSTALL_STATUS', '0')))
                    elif args[0] == 'remote-add':
                        sys.exit(0)
                    else:
                        sys.exit(1)
                '''))
                flatpak.chmod(0o755)
                env = dict(os.environ, PATH=f'{root}{os.pathsep}{os.environ["PATH"]}',
                           COMMAND_LOG=str(log), ARCH=arch, DRIVERS=drivers, EXISTING=existing,
                           RUNTIME_SCOPE=runtime_scope, GL_BRANCH=gl_branch,
                           METADATA_FORMAT=metadata_format)
                result = subprocess.run(['bash', str(script), str(bundle)], env=env,
                                        capture_output=True, text=True, timeout=5)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                calls = [json.loads(line) for line in log.read_text().splitlines()]
                installs = [call for call in calls if call[0] == 'install']
                self.assertEqual(len(installs), 2)
                self.assertEqual(installs[0][1], existing or '--user')
                self.assertEqual(installs[0][-1], str(bundle))
                self.assertEqual(installs[1][1], runtime_scope)
                for call in installs:
                    self.assertIn('--no-related', call)
                    self.assertNotIn('--no-deps', call)
                expected = [f'runtime/org.freedesktop.Platform.GL.default/{arch}/{gl_branch}']
                if 'nvidia-' in drivers:
                    expected.append(f'runtime/org.freedesktop.Platform.GL.nvidia-595-104-02/{arch}/1.4')
                self.assertEqual(installs[1][installs[1].index('runtime-source') + 1:], expected)
                # An installation failure must propagate and stop all later downloads.
                log.unlink()
                env['INSTALL_STATUS'] = '7'
                result = subprocess.run(['bash', str(script), str(bundle)], env=env,
                                        capture_output=True, text=True, timeout=5)
                self.assertEqual(result.returncode, 7)
                failed_calls = [json.loads(line) for line in log.read_text().splitlines()]
                self.assertNotIn('--gl-drivers', [call[0] for call in failed_calls])
                self.assertEqual(sum(call[0] == 'install' for call in failed_calls), 1)
                # Missing/unsupported metadata must not guess a graphics ABI.
                log.unlink()
                env.update(INSTALL_STATUS='0', GL_BRANCH='unsupported')
                result = subprocess.run(['bash', str(script), str(bundle)], env=env,
                                        capture_output=True, text=True, timeout=5)
                self.assertEqual(result.returncode, 1)
                self.assertIn('Could not determine', result.stderr)
                calls = [json.loads(line) for line in log.read_text().splitlines()]
                self.assertEqual(sum(call[0] == 'install' for call in calls), 1)

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
