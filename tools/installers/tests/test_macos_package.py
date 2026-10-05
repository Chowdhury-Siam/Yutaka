"""Check PKG composition, signing, and safe custom-setup handoff."""
import importlib.util
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from xml.etree import ElementTree as ET

SOURCE = Path(__file__).resolve().parents[1] / "macos"
spec = importlib.util.spec_from_file_location("macos_package", SOURCE / "package.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class MacPackageTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="Yutaka test ' ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.setup = self.root / "Yutaka Setup.app"
        binaries = self.setup / "Contents/MacOS"
        binaries.mkdir(parents=True)
        (binaries / "YutakaSetup").write_bytes(b"fixture")
        with (self.setup / "Contents/Info.plist").open("wb") as stream:
            plistlib.dump({"CFBundleIdentifier": "com.yutaka.siam.setup", "CFBundleExecutable": "YutakaSetup",
                          "CFBundlePackageType": "APPL", "CFBundleVersion": "1",
                          "CFBundleShortVersionString": "1.0.0", "LSMinimumSystemVersion": "10.15"}, stream)

    def test_package_contains_only_setup_with_universal_nonrelocatable_metadata(self):
        for identity in (None, "Developer ID Installer: Fixture (TEST)"):
            with self.subTest(signing=identity):
                output = self.root / ("signed.pkg" if identity else "unsigned.pkg")
                def run(command, **kwargs):
                    tool = Path(command[0]).name
                    if tool == "ditto":
                        shutil.copytree(command[1], command[2])
                    elif tool == "pkgbuild":
                        root = Path(command[command.index("--root") + 1])
                        self.assertEqual(list((root / "Applications").iterdir()), [root / "Applications/Yutaka Setup.app"])
                        components = plistlib.loads(Path(command[command.index("--component-plist") + 1]).read_bytes())
                        self.assertFalse(components[0]["BundleIsRelocatable"])
                        self.assertTrue(components[0]["BundleHasStrictIdentifier"])
                        script = Path(command[command.index("--scripts") + 1]) / "postinstall"
                        self.assertTrue(script.stat().st_mode & 0o111)
                        self.assertEqual(script.read_bytes(), (SOURCE / "postinstall").read_bytes())
                        Path(command[-1]).write_bytes(b"component")
                    elif tool == "productbuild":
                        xml = ET.parse(command[command.index("--distribution") + 1]).getroot()
                        self.assertEqual(xml.find("options").get("hostArchitectures"), "arm64,x86_64")
                        self.assertEqual(xml.find("domains").get("enable_anywhere"), "false")
                        self.assertEqual(xml.find(".//must-close/app").get("id"), "com.yutaka.siam.setup")
                        self.assertEqual("--sign" in command, bool(identity))
                        if identity:
                            self.assertEqual(command[command.index("--sign") + 1], identity)
                        Path(command[-1]).write_bytes(b"product")
                    return subprocess.CompletedProcess(command, 0)
                with patch.object(builder.subprocess, "run", side_effect=run):
                    builder.build(self.setup, output, "1.0.0", identity)
                self.assertEqual(output.read_bytes(), b"product")

    def test_invalid_version_identity_and_signature_fail_before_packaging(self):
        output = self.root / "Yutaka.pkg"
        for version, identity in [("bad", None), ("1.0.1", None), ("1.0.0", "Developer ID Application: Wrong")]:
            with self.subTest(version=version, identity=identity), self.assertRaises(ValueError):
                builder.build(self.setup, output, version, identity)
        with patch.object(builder.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "codesign")):
            with self.assertRaises(subprocess.CalledProcessError):
                builder.build(self.setup, output, "1.0.0")
        self.assertFalse(output.exists())

    def test_postinstall_handoff_never_launches_as_root_and_has_manual_fallback(self):
        commands = {
            "/usr/bin/codesign": 'exit "${SIGNATURE_RESULT:-0}"',
            "/usr/bin/stat": 'echo "$CONSOLE_CASE"',
            "/usr/bin/id": 'echo 501',
            "/bin/launchctl": 'printf "%s\\n" "$@" > "$HANDOFF_LOG"; exit "${LAUNCH_RESULT:-0}"',
        }
        script = (SOURCE / "postinstall").read_text()
        for index, (command, content) in enumerate(commands.items()):
            helper = self.root / f"command-{index}"
            helper.write_text("#!/bin/bash\n" + content + "\n")
            helper.chmod(0o755)
            script = script.replace(command, f'"{helper}"')
        for user, volume, signature, launch, expected in [
            ("test-user", "/", 0, 0, True), ("root", "/", 0, 0, False),
            ("loginwindow", "/", 0, 0, False), ("test-user", "/Volumes/Other", 0, 0, False),
            ("test-user", "/", 0, 1, True), ("test-user", "/", 1, 0, False),
        ]:
            with self.subTest(user=user, volume=volume, signature=signature, launch=launch):
                log = self.root / "handoff"
                log.unlink(missing_ok=True)
                env = dict(os.environ, CONSOLE_CASE=user, HANDOFF_LOG=str(log),
                           SIGNATURE_RESULT=str(signature), LAUNCH_RESULT=str(launch))
                result = subprocess.run(["bash", "-c", script, "postinstall", "package", "/", volume],
                                        env=env, capture_output=True, text=True, timeout=5)
                self.assertEqual(result.returncode, 1 if signature else 0, result.stderr)
                self.assertEqual(log.exists(), expected)
                if expected:
                    self.assertEqual(log.read_text().splitlines(), ["asuser", "501", "/usr/bin/sudo", "-H", "-u",
                                     user, "/usr/bin/open", "/Applications/Yutaka Setup.app"])
                if launch:
                    self.assertIn("Open Yutaka Setup from Applications", result.stdout)

    @unittest.skipUnless(sys.platform == "darwin", "Requires macOS pkgbuild, productbuild and codesign")
    def test_real_package_round_trip_preserves_setup_signature(self):
        source = self.root / "main.c"
        source.write_text("int main(void) { return 0; }\n")
        subprocess.run(["xcrun", "clang", str(source), "-o", str(self.setup / "Contents/MacOS/YutakaSetup")], check=True)
        subprocess.run(["/usr/bin/codesign", "--force", "--sign", "-", str(self.setup)], check=True)
        output = self.root / "Yutaka.pkg"
        builder.build(self.setup, output, "1.0.0")
        expanded = self.root / "expanded"
        subprocess.run(["/usr/sbin/pkgutil", "--expand-full", str(output), str(expanded)], check=True)
        setup = expanded / "YutakaSetup.pkg/Payload/Applications/Yutaka Setup.app"
        self.assertTrue((setup / "Contents/MacOS/YutakaSetup").is_file())
        subprocess.run(["/usr/bin/codesign", "--verify", "--deep", "--strict", str(setup)], check=True)


if __name__ == "__main__":
    unittest.main()
