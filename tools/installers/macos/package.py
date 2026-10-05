#!/usr/bin/env python3
"""Package the signed custom setup app as a universal macOS Installer PKG."""
import argparse
import plistlib
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET

SOURCE = Path(__file__).resolve().parent
IDENTIFIER = "com.yutaka.siam.setup.pkg"


def build(setup, output, version, signing_identity=None):
    if setup.name != "Yutaka Setup.app" or output.suffix.lower() != ".pkg":
        raise ValueError("Use Yutaka Setup.app and a .pkg output path.")
    if output.exists():
        raise FileExistsError(output)
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("The package version must contain three numeric components.")
    if signing_identity and not signing_identity.startswith("Developer ID Installer:"):
        raise ValueError("PKGs require a Developer ID Installer signing identity.")
    with (setup / "Contents/Info.plist").open("rb") as stream:
        info = plistlib.load(stream)
    if info.get("CFBundleIdentifier") != "com.yutaka.siam.setup" or info.get("CFBundleShortVersionString") != version:
        raise ValueError("Setup identity/version does not match this release.")
    subprocess.run(["/usr/bin/codesign", "--verify", "--deep", "--strict", str(setup)], check=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="yutaka-pkg-") as directory:
        work = Path(directory)
        root = work / "root"
        target = root / "Applications/Yutaka Setup.app"
        target.parent.mkdir(parents=True)
        # ditto retains bundle resource forks, signatures and stapled tickets.
        subprocess.run(["/usr/bin/ditto", str(setup), str(target)], check=True)
        components = work / "components.plist"
        with components.open("wb") as stream:
            plistlib.dump([{"RootRelativeBundlePath": "Applications/Yutaka Setup.app",
                           "BundleIsRelocatable": False, "BundleHasStrictIdentifier": True,
                           "BundleIsVersionChecked": True, "BundleOverwriteAction": "upgrade"}], stream)
        scripts = work / "scripts"
        scripts.mkdir()
        shutil.copy2(SOURCE / "postinstall", scripts / "postinstall")
        (scripts / "postinstall").chmod(0o755)
        component = work / "YutakaSetup.pkg"
        subprocess.run(["/usr/bin/pkgbuild", "--root", str(root), "--install-location", "/",
                        "--component-plist", str(components), "--scripts", str(scripts),
                        "--ownership", "recommended", "--identifier", IDENTIFIER,
                        "--version", version, str(component)], check=True)
        resources = work / "resources"
        resources.mkdir()
        (resources / "welcome.html").write_text(
            "<html><body><h1>Yutaka</h1><p>Your finances. Your control.</p>"
            "<p>This package prepares Yutaka's custom setup. It opens automatically next, "
            "so you can choose a folder and install Yutaka.</p>"
            "<p>Your accounts, transactions and settings stay in place.</p></body></html>")
        (resources / "conclusion.html").write_text(
            "<html><body><h1>Continue in Yutaka Setup</h1>"
            "<p>Choose your installation folder, then click Install Yutaka in the custom window.</p>"
            "<p>If the window did not open, open <b>Yutaka Setup</b> from Applications.</p></body></html>")
        distribution = ET.Element("installer-gui-script", minSpecVersion="2")
        ET.SubElement(distribution, "title").text = "Yutaka Setup"
        ET.SubElement(distribution, "options", customize="never", hostArchitectures="arm64,x86_64")
        ET.SubElement(distribution, "domains", enable_anywhere="false",
                      enable_currentUserHome="false", enable_localSystem="true")
        ET.SubElement(distribution, "welcome", file="welcome.html", **{"mime-type": "text/html"})
        ET.SubElement(distribution, "conclusion", file="conclusion.html", **{"mime-type": "text/html"})
        check = ET.SubElement(distribution, "volume-check")
        allowed = ET.SubElement(check, "allowed-os-versions")
        ET.SubElement(allowed, "os-version", min=info.get("LSMinimumSystemVersion", "10.15"))
        outline = ET.SubElement(distribution, "choices-outline")
        ET.SubElement(outline, "line", choice="setup")
        choice = ET.SubElement(distribution, "choice", id="setup", title="Yutaka Setup",
                               description="Prepare and open the custom Yutaka installer.", visible="false")
        ET.SubElement(choice, "pkg-ref", id=IDENTIFIER)
        ET.SubElement(distribution, "pkg-ref", id=IDENTIFIER, version=version).text = component.name
        close = ET.SubElement(ET.SubElement(distribution, "pkg-ref", id=IDENTIFIER), "must-close")
        ET.SubElement(close, "app", id="com.yutaka.siam.setup")
        xml = work / "Distribution.xml"
        ET.ElementTree(distribution).write(xml, encoding="utf-8", xml_declaration=True)
        command = ["/usr/bin/productbuild", "--distribution", str(xml),
                   "--package-path", str(work), "--resources", str(resources)]
        if signing_identity:
            command.extend(["--sign", signing_identity])
        subprocess.run([*command, str(output)], check=True)
    print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--setup", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--sign")
    args = parser.parse_args()
    build(args.setup.resolve(), args.output.resolve(), args.version, args.sign)
