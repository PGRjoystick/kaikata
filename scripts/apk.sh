#!/usr/bin/env bash
# Build the Android debug APK and, when a phone is connected over adb, install and open it.
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME:-$HOME/.local/opt/jdk-21.0.13+9}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"

npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug --console=plain -q)
APK=android/app/build/outputs/apk/debug/app-debug.apk
echo "APK: $PWD/$APK"

if "$ADB" get-state >/dev/null 2>&1; then
  "$ADB" install -r "$APK"
  "$ADB" shell am start -n app.kaikata/.MainActivity >/dev/null
  echo "Installed and opened on $("$ADB" get-serialno)"
else
  echo "No phone connected; run: adb connect <phone-ip>:<port>"
fi
