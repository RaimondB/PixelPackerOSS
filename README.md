# PixelPacker OSS

An open-source Android companion app for **Pix Backpacks**, built with React Native.

> **Disclaimer:** This project is an independent open-source initiative and is not affiliated with or endorsed by the original creators of Pix Backpack LED backpacks or their associated software.

## Background

The original companion app for Pix-style LED backpacks is no longer actively supported. This project reverse-engineered the BLE protocol from the original app's React Native bundle and re-implements the core functionality as a clean, maintainable open-source codebase.

## Features

- **Animation Editor** — Draw multi-frame pixel animations with a 16-color palette and upload them to the device
- **Built-in Animations** — Includes the original "Rolling" animation and 36 combination frames extracted from the original app
- **Scrolling Text** — Type any message and have it scroll across the display with selectable color and speed
- **Display Modes** — Switch between Animation, Clock, Scrolling, Stopwatch, Countdown, Bike, Pix Blocks, Pixel Breaker, and Crawler modes
- **Bike Mode** — Left/right turn signals and stop indicators
- **Pixel Breaker** — D-pad gamepad controller
- **Brightness Control** — Adjustable in steps or preset values
- **Auto-reconnect** — Automatically reconnects on Bluetooth drops with manual fallback

## Requirements

- Android 6.0+ (API 23+)
- A Pix Backpack LED display
- Bluetooth LE

## Getting Started

### Prerequisites

- Node.js 18+
- JDK 17
- Android SDK (API 34)
- React Native CLI

Use the included `setup.sh` to bootstrap the dev environment on Ubuntu / WSL2:

```bash
bash setup.sh
```

### Install dependencies

```bash
cd pix-connector
npm install
```

### Run on device

```bash
# Bundle JS
npx react-native bundle \
  --entry-file index.js \
  --platform android \
  --dev false \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# Build APK
cd android && ./gradlew assembleDebug

# Install (replace with your device IP if using ADB over Wi-Fi)
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## BLE Protocol

The device communicates over a proprietary BLE service. Key details:

| Opcode | Name | Description |
| ------ | ---- | ----------- |
| 0 | SET_FRAME | Upload a frame (8bpp palette-indexed, 16×20 = 320 bytes) |
| 1 | SET_PALETTE | Set palette (RGB triplets, up to 16 colors) |
| 2 | SET_FRAME_COUNT | Set number of active frames |
| 3 | SET_FRAMES_DURATIONS | Set per-frame durations (uint16 LE, ms) |
| 4 | SET_ANIMATION_DIRECTION | 0 = forward, 1 = reverse, 2 = alternate |
| 5 | SAVE_TO_PERSISTENT_MEMORY | Persist current animation to flash |
| 7 | SET_CONFIG | Set render mode and parameters |
| 8 | SET_INPUT | Send game/widget input |
| 9 | RESTART | Reboot device |

Three hardware revisions exist with different BLE service UUID bases; the app detects which variant is in use automatically.

## Project Structure

```text
pix-connector/
  src/
    ble/          # BLE service, device protocol, font bitmap data
    screens/      # UI screens (control, animation editor, scrolling text, …)
    storage/      # AsyncStorage-backed animation persistence
    data/         # Built-in animation data (auto-generated from original app)
  android/        # Android project
```

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE) for details.

This project is an independent open-source initiative and is not affiliated with or endorsed by Pix Backpack or its original creators.
