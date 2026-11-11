#!/usr/bin/env bash
# Usage: verify-apk.sh APK VERSION_CODE VERSION_NAME
# Fails the build if the APK is not signed with the key in fingerprint.txt or has the wrong version.
set -e
APK="$1"; CODE="$2"; NAME="$3"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
BT=$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)
WANT=$(tr -d ' \n:' < android-signing/fingerprint.txt | tr 'A-F' 'a-f')
GOT=$("$BT/apksigner" verify --print-certs "$APK" | grep 'certificate SHA-256 digest' | head -1 | sed 's/.*: *//' | tr -d ' :' | tr 'A-F' 'a-f')
[ -n "$GOT" ] || { echo "Could not read the signing certificate of $APK"; exit 1; }
[ "$GOT" = "$WANT" ] || { echo "Signing key mismatch. APK: $GOT, expected (fingerprint.txt): $WANT"; exit 1; }
BADGING=$("$BT/aapt2" dump badging "$APK" | head -1)
echo "$BADGING" | grep -q "versionCode='$CODE'" || { echo "APK versionCode is not $CODE: $BADGING"; exit 1; }
echo "$BADGING" | grep -q "versionName='$NAME'" || { echo "APK versionName is not $NAME: $BADGING"; exit 1; }
echo "APK OK: signed with the expected key, version $NAME ($CODE)."
