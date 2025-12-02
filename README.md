# Clipboard Sync (Android ↔︎ macOS)

This workspace contains two companion apps that work together to capture clipboard changes on Android and stream them to a macOS bridge while maintaining a searchable, device-aware history.

## Project layout

- `clipboard_sync/` – Expo/React Native client for Android
- `clipboard_sync_desktop/` – SwiftUI macOS bridge and history viewer

## Getting started (Android)

```bash
cd clipboard_sync
npm install
npx expo start --android
```

## Getting started (macOS)

Open `clipboard_sync_desktop/clipboard_sync_desktop.xcodeproj` in Xcode 16 and run the `clipboard_sync_desktop` target. The desktop app ships with:

- A live clipboard watcher that captures text, rich text, and images from the general pasteboard.
- Persistent on-device history stored under Application Support (capped at 500 entries).
- A SwiftUI split view that groups pinned items, previews content, and exposes metadata.
- A relay-backed WebSocket client that connects to `bridge.edwardsmoses.com` and fans out clipboard updates to every paired phone.

## Pairing flow (current snapshot)

1. Launch the macOS bridge — it mints a secure relay session, begins syncing the pasteboard, and shows a one-time pairing code.
2. On Android, visit the Devices tab, tap “Pair a device,” and enter the 12-character code from the Mac. The phone dials `bridge.edwardsmoses.com` over TLS, so no LAN tweaks are required.
3. Copy anything and watch it glow in the Clipboard Vault timeline; the relay keeps every paired device in sync even when they’re on different networks.

## Next steps

- Add relay-side authentication/rate limiting plus a QR-based onboarding shortcut.
- Promote the Android clipboard watcher into a foreground service for reliability on OEM builds.
- Build menu bar & launch-agent helpers on macOS so the bridge runs headless.
- Expand payload support to include files and contextual metadata (app name, source URL, etc.).
