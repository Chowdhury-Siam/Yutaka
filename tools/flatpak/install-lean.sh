#!/usr/bin/env bash
# Install the runtime and active graphics support without optional media packs.
set -euo pipefail
app_id=io.github.chowdhury_siam.Yutaka
fail() { printf '%s\n' "$*" >&2; exit 1; }
command -v flatpak >/dev/null || fail 'Install Flatpak using your distribution package manager first.'

# Reuse the existing installation so upgrades retain the same data location.
scope=--user
if [[ "${1:-}" == --user || "${1:-}" == --system ]]; then
  scope="$1"
  shift
elif flatpak info --user "$app_id" >/dev/null 2>&1; then
  scope=--user
elif flatpak info --system "$app_id" >/dev/null 2>&1; then
  scope=--system
fi
[[ $# == 1 && -f "$1" && "$1" == *.flatpak ]] || fail \
  'Usage: bash Yutaka-Install-flatpak.sh [--user|--system] ./Yutaka-vVERSION-linux-ARCH.flatpak'
bundle="$(realpath -- "$1")"

flatpak remote-add "$scope" --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
# Keep dependency verification enabled; --no-related skips extensions, not the runtime.
flatpak install "$scope" --noninteractive --assumeyes --no-related "$bundle"
runtime="$(flatpak info "$scope" --show-runtime "$app_id")"
[[ "$runtime" =~ ^org\.gnome\.Platform/(x86_64|aarch64)/[0-9]+$ ]] || fail "Unexpected Yutaka runtime: $runtime"
arch="${runtime#*/}"
arch="${arch%%/*}"

# A per-user app may reuse a runtime already installed system-wide.
runtime_scope="$scope"
if ! metadata="$(flatpak info "$runtime_scope" --show-metadata "runtime/$runtime" 2>/dev/null)"; then
  runtime_scope=--system
  metadata="$(flatpak info "$runtime_scope" --show-metadata "runtime/$runtime")"
fi
origin="$(flatpak info "$runtime_scope" --show-origin "runtime/$runtime")"

# Read the Freedesktop GL ABI from the runtime instead of confusing it with GNOME 51.
gl_versions=
gl_version=
in_gl=false
while IFS= read -r line; do
  line="${line%$'\r'}"
  case "$line" in
    '[Extension org.freedesktop.Platform.GL]') in_gl=true ;;
    '['*) in_gl=false ;;
    *)
      # Runtime key files can use spaces around '=' (GNOME 51 does).
      if "$in_gl" && [[ "$line" =~ ^[[:blank:]]*(versions|version)[[:blank:]]*=[[:blank:]]*(.*) ]]; then
        case "${BASH_REMATCH[1]}" in
          versions) gl_versions="${BASH_REMATCH[2]}" ;;
          version) gl_version="${BASH_REMATCH[2]}" ;;
        esac
      fi ;;
  esac
done <<< "$metadata"
# The singular version can be NVIDIA's 1.4 even when versions lists Mesa too.
# Prefer the full list regardless of key order and skip NVIDIA/extra branches.
gl_versions="${gl_versions:-$gl_version}"
IFS=';' read -r -a gl_branches <<< "$gl_versions"
gl_branch=
for branch in "${gl_branches[@]}"; do
  if [[ "$branch" =~ ^[[:blank:]]*([0-9]+\.[0-9]+)[[:blank:]]*$ ]]; then
    branch="${BASH_REMATCH[1]}"
    if [[ "$branch" != 1.4 ]]; then
      gl_branch="$branch"
      break
    fi
  fi
done
[[ -n "$gl_branch" ]] || fail \
  "Could not determine the runtime graphics branch (declared: ${gl_versions:-missing}); installation is incomplete."

graphics=("runtime/org.freedesktop.Platform.GL.default/$arch/$gl_branch")
drivers="$(flatpak --gl-drivers)"
while IFS= read -r driver; do
  if [[ "$driver" =~ ^nvidia-[0-9]+(-[0-9]+)+$ ]]; then
    [[ ";$gl_versions;" == *';1.4;'* ]] || fail 'The runtime does not declare NVIDIA graphics support.'
    graphics+=("runtime/org.freedesktop.Platform.GL.$driver/$arch/1.4")
  fi
done <<< "$drivers"
flatpak install "$runtime_scope" --noninteractive --assumeyes --no-related --or-update \
  "$origin" "${graphics[@]}"
printf '%s\n' 'Yutaka installed with its runtime and active graphics libraries.' \
  'Optional video codecs, VAAPI drivers, extra Mesa codecs and runtime language packs were skipped.' \
  'Use this installer for newer bundles too. Normal Flatpak updates may add runtime extras again.'
