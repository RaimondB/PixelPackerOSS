#!/usr/bin/env bash
# Pix Connector dev environment bootstrap for Ubuntu (including WSL2)
set -euo pipefail

ANDROID_HOME="$HOME/Android/Sdk"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

echo "=== [1/5] Installing system packages ==="
sudo apt-get update -q
sudo apt-get install -y openjdk-17-jdk-headless watchman unzip wget curl

echo "=== [2/5] Setting Java 17 as default ==="
sudo update-alternatives --set java  /usr/lib/jvm/java-17-openjdk-amd64/bin/java
sudo update-alternatives --set javac /usr/lib/jvm/java-17-openjdk-amd64/bin/javac
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

echo "=== [3/5] Installing Android command-line tools ==="
mkdir -p "$ANDROID_HOME/cmdline-tools"
TMP=$(mktemp -d)
wget -q "$CMDLINE_TOOLS_URL" -O "$TMP/cmdline-tools.zip"
unzip -q "$TMP/cmdline-tools.zip" -d "$TMP"
rm -rf "$ANDROID_HOME/cmdline-tools/latest"
mv "$TMP/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
rm -rf "$TMP"

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "=== [4/5] Installing SDK packages ==="
yes | sdkmanager --licenses > /dev/null
sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "ndk;26.1.10909125"

echo "=== [5/5] Generating debug keystore ==="
KEYSTORE="$(dirname "$0")/pix-connector/android/app/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkey -v \
        -keystore "$KEYSTORE" \
        -storepass android \
        -alias androiddebugkey \
        -keypass android \
        -dname "CN=Android Debug,O=Android,C=US" \
        -keyalg RSA -keysize 2048 -validity 10000 2>/dev/null
    echo "  debug.keystore created"
else
    echo "  debug.keystore already exists, skipping"
fi

# Persist env vars in .bashrc (idempotent)
MARKER="# pix-connector android env"
if ! grep -q "$MARKER" "$HOME/.bashrc" 2>/dev/null; then
    cat >> "$HOME/.bashrc" << BASHRC

$MARKER
export ANDROID_HOME="\$HOME/Android/Sdk"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
export PATH="\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH"
BASHRC
    echo "  Added ANDROID_HOME / JAVA_HOME to .bashrc"
fi

echo ""
echo "=== Setup complete! Next steps ==="
echo "1.  source ~/.bashrc"
echo "2.  cd pix-connector && npm install"
echo "3.  Connect your Android phone, enable USB debugging"
echo "     (WSL2: use 'adb connect <phone-ip>:5555' for Wi-Fi ADB instead)"
echo "4.  npx react-native run-android"
echo ""
echo "WSL2 Wi-Fi ADB quick-start:"
echo "  On phone: Settings → Developer options → Wireless debugging → enable"
echo "  Then: adb connect <phone-ip>:5555"
