#!/usr/bin/env bash
# Usage: patch-android.sh VERSION_NAME VERSION_CODE
# Runs after "npx cap add android". Sets the version and signs every build with the secret key.
set -e
NAME="$1"; CODE="$2"
G=android/app/build.gradle
[ -n "$ANDROID_KEYSTORE_BASE64" ] || { echo "Secret ANDROID_KEYSTORE_BASE64 is empty. Add it in the repo settings (Secrets and variables, Actions)."; exit 1; }
[ -n "$ANDROID_KEYSTORE_PASSWORD" ] || { echo "Secret ANDROID_KEYSTORE_PASSWORD is empty. Add it in the repo settings (Secrets and variables, Actions)."; exit 1; }
[ -f "$G" ] || { echo "$G not found. Did 'npx cap add android' run?"; exit 1; }
echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/release.jks
sed -i -E "s/versionCode [0-9]+/versionCode $CODE/; s/versionName \"[^\"]*\"/versionName \"$NAME\"/" "$G"
# Release builds use the signing config, and debug builds too, so even a fallback debug APK carries the same key.
sed -i '/buildTypes {/,/^    }/ s/release {/release {\n            signingConfig signingConfigs.release/' "$G"
sed -i '0,/buildTypes {/s//buildTypes {\n        debug {\n            signingConfig signingConfigs.release\n        }/' "$G"
sed -i '0,/buildTypes {/s//signingConfigs {\n        release {\n            storeFile file("release.jks")\n            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n            keyAlias "traktnext"\n            keyPassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n        }\n    }\n    buildTypes {/' "$G"
grep -q "versionCode $CODE" "$G" || { echo "versionCode was not set in $G"; exit 1; }
grep -q "versionName \"$NAME\"" "$G" || { echo "versionName was not set in $G"; exit 1; }
[ "$(grep -c 'signingConfig signingConfigs.release' "$G")" -ge 2 ] || { echo "Signing config was not added to $G"; exit 1; }
grep -q 'storeFile file("release.jks")' "$G" || { echo "signingConfigs block was not added to $G"; exit 1; }
echo "Patched $G: version $NAME ($CODE), signed with the shared key."
