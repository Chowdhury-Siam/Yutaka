"""Exercise the final APK workflow gate without release credentials or an SDK."""

import hashlib
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


class AndroidApkSigningTest(unittest.TestCase):
    def test_final_apk_signing_gate(self):
        workflow = (Path(__file__).resolve().parents[2] /
                    '.github/workflows/build-android-apks.yml').read_text()
        step_name = '      - name: Sign and verify final APK certificates\n'
        self.assertLess(workflow.index(step_name), workflow.index('      - name: Upload direct APK\n'))
        step = workflow.split(step_name, 1)[1].split('\n      - name:', 1)[0]
        script = '\n'.join(line[10:] for line in step.split('        run: |\n', 1)[1].splitlines())
        certificate = b'permanent release certificate'
        digest = hashlib.sha256(certificate).hexdigest()
        for failure in ('', 'tool', 'apk', 'extra-apk', 'keytool', 'sign',
                        'modern', 'legacy', 'v2', 'mismatch', 'no-signer', 'two-signers'):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                sdk = root / 'Android SDK'
                signer = sdk / 'build-tools/36.0.0/apksigner'
                signer.parent.mkdir(parents=True)
                if failure != 'tool':
                    signer.write_text('''#!/usr/bin/env python3
import os
from pathlib import Path
import sys

args = sys.argv[1:]
failure = os.environ['FAILURE']
if args[0] == 'sign':
    for flag, value in {
        '--ks': os.environ['ANDROID_KEYSTORE_FILE'],
        '--ks-key-alias': os.environ['ANDROID_KEY_ALIAS'],
        '--ks-pass': 'env:ANDROID_KEYSTORE_PASSWORD',
        '--key-pass': 'env:ANDROID_KEY_PASSWORD',
        '--v1-signing-enabled': 'true', '--v2-signing-enabled': 'true',
        '--v3-signing-enabled': 'true', '--v4-signing-enabled': 'false',
    }.items():
        assert args[args.index(flag) + 1] == value
    assert Path(args[-1]).read_bytes() == b'original APK'
    if failure == 'sign':
        sys.exit(2)
    Path(args[args.index('--out') + 1]).write_bytes(b'signed APK')
else:
    assert args[0] == 'verify'
    assert Path(args[-1]).read_bytes() == b'signed APK'
    if '--min-sdk-version' in args:
        assert args[args.index('--min-sdk-version') + 1] == '23'
        assert args[args.index('--max-sdk-version') + 1] == '23'
        if failure == 'legacy':
            sys.exit(3)
    else:
        assert '--verbose' in args and '--print-certs' in args
        if failure == 'modern':
            sys.exit(4)
        print('Verified using v2 scheme (APK Signature Scheme v2): ' +
              ('false' if failure == 'v2' else 'true'))
        digest = '0' * 64 if failure == 'mismatch' else os.environ['CERT_DIGEST']
        if failure != 'no-signer':
            print('Signer #1 certificate SHA-256 digest: ' + digest)
        if failure == 'two-signers':
            print('Signer #2 certificate SHA-256 digest: ' + digest)
''')
                    signer.chmod(0o755)
                bin_dir = root / 'bin'
                bin_dir.mkdir()
                keytool = bin_dir / 'keytool'
                keytool.write_text('''#!/usr/bin/env python3
import os
from pathlib import Path
import sys

args = sys.argv[1:]
assert args[0] == '-exportcert'
assert args[args.index('-storepass:env') + 1] == 'ANDROID_KEYSTORE_PASSWORD'
assert args[args.index('-keystore') + 1] == os.environ['ANDROID_KEYSTORE_FILE']
assert args[args.index('-alias') + 1] == os.environ['ANDROID_KEY_ALIAS']
if os.environ['FAILURE'] == 'keytool':
    sys.exit(5)
Path(args[args.index('-file') + 1]).write_bytes(b'permanent release certificate')
''')
                keytool.chmod(0o755)
                artifacts = root / 'artifacts'
                artifacts.mkdir()
                apk = artifacts / 'Yutaka release.apk'
                if failure != 'apk':
                    apk.write_bytes(b'original APK')
                if failure == 'extra-apk':
                    (artifacts / 'unexpected.apk').write_bytes(b'original APK')
                temp = root / 'runner temp'
                temp.mkdir()
                password = 'test-only password with $() and `backticks`'
                env = dict(os.environ, ANDROID_HOME=str(sdk), RUNNER_TEMP=str(temp),
                           PATH=str(bin_dir) + os.pathsep + os.environ['PATH'],
                           ANDROID_KEYSTORE_FILE=str(root / 'release key.jks'),
                           ANDROID_KEYSTORE_PASSWORD=password, ANDROID_KEY_PASSWORD=password,
                           ANDROID_KEY_ALIAS='release alias', FAILURE=failure, CERT_DIGEST=digest)
                result = subprocess.run(['bash', '-c', script], cwd=root, env=env,
                                        capture_output=True, text=True, timeout=10)
                if failure:
                    self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
                    if apk.exists():
                        self.assertEqual(apk.read_bytes(), b'original APK')
                else:
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                    self.assertEqual(apk.read_bytes(), b'signed APK')
                self.assertEqual(list(temp.iterdir()), [])
                self.assertNotIn(password, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
