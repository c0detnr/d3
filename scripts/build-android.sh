#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run map:build
mkdir -p android/app/src/main/assets artifacts
# Only generated assets live here; the source of truth is dist-map.
node --input-type=module -e 'import {rmSync,cpSync} from "node:fs"; rmSync("android/app/src/main/assets",{recursive:true,force:true}); cpSync("dist-map","android/app/src/main/assets",{recursive:true});'
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
(cd android && ./gradlew --no-daemon assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/iron-dust-android.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify artifacts/iron-dust-android.apk
sha256sum artifacts/iron-dust-android.apk
