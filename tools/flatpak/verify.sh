#!/usr/bin/env bash
# Verify the installed runtime, not the SDK used while packaging.
set -euo pipefail
bundle="$1"
app_id=io.github.chowdhury_siam.Yutaka
flatpak install --user --noninteractive --assumeyes --no-related "$bundle"

flatpak run --command=sh "$app_id" -ec '
  test -f /.flatpak-info
  test -x /app/bin/yutaka
  test -x /app/lib/yutaka/yutaka
  test -d /app/lib/yutaka/data/flutter_assets
  test -s /app/lib/yutaka/lib/libjsoncpp.so.25
  export LD_LIBRARY_PATH=/app/lib/yutaka/lib
  find /app/lib/yutaka -type f \( -name "*.so" -o -name "*.so.*" -o -name yutaka \) -exec sh -ec '\''
    for library do
      dependencies=$(ldd "$library" 2>&1 || true)
      if printf "%s\n" "$dependencies" | grep -q "not found"; then
        printf "%s\n%s\n" "$library" "$dependencies" >&2
        exit 1
      fi
    done
  '\'' sh {} +
'

mkdir -p artifacts/build-logs
set +e
xvfb-run -a dbus-run-session -- timeout --kill-after=5s 20s \
  flatpak run --env=GDK_BACKEND=x11 --env=LIBGL_ALWAYS_SOFTWARE=1 \
  --env=NO_AT_BRIDGE=1 "$app_id" --enable-software-rendering \
  > artifacts/build-logs/flatpak-launch.log 2>&1
status=$?
set -e
cat artifacts/build-logs/flatpak-launch.log
if [ "$status" -ne 124 ]; then
  echo "Flatpak exited before the 20-second launch check (status $status)." >&2
  exit 1
fi

# Initialization must reach SQLite, not merely keep a blank window open.
database="$(find "$HOME/.var/app/$app_id" -type f -name yutaka_flutter.db -print -quit)"
test -n "$database"
test -s "$database"
echo "Flatpak launched with its database in private app storage."
