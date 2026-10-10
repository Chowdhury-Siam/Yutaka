# Standalone Flatpak and Flathub preparation

The Linux GitHub Actions workflow now packages standalone Flatpaks for x64 and
ARM64. These packages are for GitHub distribution, not Flathub submission.
The manifest here was prepared with Codex and packages the already-compiled Linux
release bundle. It is not eligible for Flathub under its current manifest and
source-build policies. A human maintainer must independently author the Flathub
manifest, complete the metadata, test that build, and submit it manually.

## Build and download on GitHub

Commit these changes to `Chowdhury-Siam/Yutaka`, then open **Actions → Build Linux
Releases → Run workflow**. Pushing the changed files to main/master also triggers
the workflow. No local Linux computer or additional secrets are needed.

The existing Linux jobs build Flutter and the real embedded Worker bundle.
They pass a tar archive preserving executable permissions to separate native
x86_64/aarch64 jobs, which use the GNOME 51 Flatpak build image and the official
Flatpak builder action. The payload includes libjsoncpp.so.25 required by secure
storage; other desktop dependencies come from GNOME. CI checks library resolution
inside the installed runtime, launches the app under Xvfb, and checks that its
database was initialized in private app storage before uploading the package.
This smoke check does not replace interactive backup, export and sync testing.

The Linux runner disables optional CMake JNI discovery, including a cached
`JNI_FOUND` result. `path_provider_android` brings the JNI plugin transitively,
but Linux uses `path_provider_linux` and does not need a Java VM. This keeps
`libdartjni.so` out of the Linux bundles on both architectures while leaving
the strict Flatpak dependency check intact.

Successful runs provide `yutaka-linux-flatpak-x64` and
`yutaka-linux-flatpak-arm64` artifacts containing
`Yutaka-v<version>-linux-<arch>.flatpak` and its matching
`Yutaka-v<version>-linux-<arch>-Install-flatpak.sh`. The existing stable-release publisher
includes both after all platform workflows succeed for the same source commit.
Build or verification failures block publication and retain launch failure logs.

On a Linux computer with Flatpak installed, download both release files and run
the lean installer (replace the filenames for ARM64 or a later release):

```bash
bash ./Yutaka-v1.0.1283-linux-x64-Install-flatpak.sh ./Yutaka-v1.0.1283-linux-x64.flatpak
flatpak run io.github.chowdhury_siam.Yutaka
```

The installer uses Flatpak's `--no-related` option while retaining dependency
verification. It installs the required GNOME runtime, the runtime's standard
Mesa graphics extension, and only the NVIDIA graphics version reported active
by `flatpak --gl-drivers`, when present. It skips VAAPI video drivers, extra
video codecs, the extra Mesa codec branch and runtime language packs. The
Freedesktop graphics branch comes from the installed runtime's metadata; it
is not the GNOME version. Graphics libraries remain necessary for rendering.

Existing user/system installations retain their scope automatically; a fresh
install defaults to per-user. Pass `--user` or `--system` before the bundle
filename to choose explicitly. Existing shared packages and application data
are left in place. A user app can reuse an existing system runtime. Local
bundles use `--reinstall`, so rerunning the same installer/bundle also succeeds
without deleting private app data. CI installs once with the lean installer,
then verifies that per-user installation without installing the bundle again.

The plain `flatpak install FILE.flatpak` command and normal graphical Flatpak
updates can still fetch the runtime's optional extensions. The app manifest
cannot disable those runtime-owned downloads. Use the lean installer for
subsequent bundle updates, and `flatpak update --no-related` for runtime/graphics
security updates without adding more extensions. Do not use `--no-deps` or
remove graphics support. To include all media/language extensions instead,
use the standard installation command:

```bash
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user ./Yutaka-v1.0.1283-linux-x64.flatpak
```

CI tests the lean installation in fresh user/system Flatpak directories, checks
that the skipped extensions were not installed, then runs the library/startup
and private database checks. It does not remove the SDK/build image's packages.
AppImage and Setup.run remain available for users who want to avoid a separate
Flatpak runtime download entirely.

These standalone files do not provide an automatic update repository. To update,
download the newer matching-architecture Flatpak and run the installer over the existing
one. Keep the same app ID so private finance data remains in the same directory.

## Authorship and Flathub policy

Read the current [Flathub requirements](https://docs.flathub.org/docs/for-app-authors/requirements#generative-ai-policy).
As checked on 2026-10-06, manifests may not contain AI-generated or AI-assisted
content. AI tools may not create submission pull requests or write their commit
messages, descriptions, review comments or replies. Other included AI-generated
material must be disclosed, identifying affected parts and approximate extent;
reviewers decide whether to accept it.

The Flatpak-specific app changes, tests, desktop file, draft MetaInfo, standalone
manifest, packaging workflow and this guide were prepared with Codex. Yutaka also contains earlier Codex-assisted
changes. The maintainer must review the project history to assess the full extent
before submission. This is an upstream authorship record, not submission text.

## App integration

The proposed ID is `io.github.chowdhury_siam.Yutaka`, tied to
`https://github.com/Chowdhury-Siam/Yutaka`. Confirm this ID before publishing.
The desktop file, installed icon name and MetaInfo ID must match it. Changing the
ID later also changes the private data directory.

The app recognizes the `YUTAKA_LINUX_DISTRIBUTION` Dart build define with value
`flatpak`, or the standard `/.flatpak-info` file at runtime. In that edition:

- Settings hides the app Updates entry and startup skips app-update checks.
- The GitHub app-release checker makes no network requests; Linux installer
  downloads and launches are refused, including previously downloaded packages.
- Database, internal backups and report-save fallback use application support
  storage. Preferences and profile media retain their existing platform storage.
- Optional Worker deployment and Worker updates remain available; these update
  the user's cloud service, not the installed app.

Finance records are never cleared or automatically imported from a host install.
To move from AppImage to Flatpak, create a local backup in the old edition and
restore it through the new edition's file picker, or use the existing sync flow.
Keep the original backup until all records have been checked.

## Requirements for the human-authored build

Refer to the [Flatpak documentation](https://docs.flatpak.org/),
[flatpak-flutter](https://github.com/TheAppgineer/flatpak-flutter), and
[Flathub requirements](https://docs.flathub.org/docs/for-app-authors/requirements).

- Use a currently supported runtime/SDK available on Flathub, with GTK 3 support.
- Build the Flutter app from a pinned source commit corresponding to a stable
  release. The Linux source directory is currently generated by Flutter; the
  existing Linux workflow documents that preparation and branding step.
- Resolve the pinned Flutter SDK, Dart packages and all native dependencies
  before the offline build. Include the generated Worker deployment JavaScript
  or build it from its source with pinned offline Node dependencies. The checked-in
  placeholder Worker asset is not a usable release bundle.
- The existing CI SQLite prefetch downloads a prebuilt library and is not the
  Flathub build path. The pinned sqlite3 3.5.2 package supports source-built or
  system-provided SQLite through its build-hook configuration. Choose and test
  a runtime-provided or source-built library with the unversioned library name
  expected by the hook; do not allow its default binary download during the build.
  See the [sqlite3 hook documentation](https://github.com/simolus3/sqlite3.dart/blob/main/sqlite3/doc/hook.md).
- Install the complete Flutter release bundle, including its `lib` and `data`
  directories. Export a `yutaka` command pointing to the installed binary.
- Install the desktop file in the app's applications directory, the existing
  `assets/icons/app_icon.png` under the proposed ID in the icon theme, the
  completed MetaInfo in the metainfo directory, and the project license.
- Support `x86_64` and `aarch64` only after both builds work. Existing AppImage
  builds on both architectures do not prove Flatpak compatibility.

The Flathub manifest, dependency manifests and their submission history must be
prepared independently by a human in accordance with Flathub's policy. The
standalone manifest here must not be copied into a Flathub submission.

## Sandbox checks

Follow the [permission guide](https://docs.flatpak.org/en/latest/sandbox-permissions.html).
Verify graphics/display access for Flutter, network access for optional sync,
and Secret Service access for secure credentials. Use file chooser portals for
user-selected files and avoid broad home/host access as a shortcut.

Check normal launch, theme and desktop menu icon; transaction creation and
database persistence after closing/reopening and after an update; local restore
and export; PDF/XLSX/TXT save; selected automatic-backup folder access across
restarts; profile media; browser links; sync and account switching; secure
credential persistence. A file-picker selection alone does not prove a folder
remains accessible for later automatic backups. Desktop notifications are not
currently advertised as supported by Yutaka.

## Finish the draft metadata

`io.github.chowdhury_siam.Yutaka.metainfo.xml` is intentionally a draft. Before
submission:

- Add genuine screenshots of the running Linux app, with direct HTTPS image
  URLs pinned to a published tag or commit. Installer artwork and mobile
  screenshots are not substitutes for a desktop app screenshot.
- Review the app's content using the [OARS questionnaire](https://hughsie.github.io/oars/)
  and add its rating. Do not assume a rating for a financial app.
- Confirm the developer identity, GPL license interpretation, release version
  and actual release date. Update the date if publication happens later.
- Run the official AppStream and Flatpak linters and resolve their findings.

## Tests and submission

The Linux CI runs the distribution tests in direct mode and with the Flatpak
build define. Those tests cover updater blocking, Settings visibility and private
database/backup persistence. They are not a Flatpak sandbox or offline-build test.

For Flathub, after an independently human-authored manifest exists, follow the
official [build, lint and submission instructions](https://docs.flathub.org/docs/for-app-authors/submission).
Submit manually against the `new-pr` branch of `flathub/flathub`, then maintain
the app's Flathub repository after acceptance. The current GitHub release
workflow does not automatically publish to Flathub.
