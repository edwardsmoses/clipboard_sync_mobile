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

The Android client now includes:

- A timeline view with search, pinning, and quick copy-back actions.
- A device tab that surfaces the current device identity and recently seen peers.
- Settings where you can paste the pairing endpoint exposed by the macOS bridge and tweak sync preferences.
- Background clipboard monitoring that persists entries to SQLite and emits them to the sync layer.

## Getting started (macOS)

Open `clipboard_sync_desktop/clipboard_sync_desktop.xcodeproj` in Xcode 16 and run the `clipboard_sync_desktop` target. The desktop app ships with:

- A live clipboard watcher that captures text, rich text, and images from the general pasteboard.
- Persistent on-device history stored under Application Support (capped at 500 entries).
- A SwiftUI split view that groups pinned items, previews content, and exposes metadata.
- A Network.framework-based WebSocket listener (advertised over Bonjour) ready to receive Android clients.

## Pairing flow (current snapshot)

1. Launch the macOS bridge — it will spin up the WebSocket listener and begin watching the pasteboard.
2. On Android, open Settings → Sync preferences and paste the `wss://` endpoint URL along with the one-time token (UI pending).
3. Copy text on Android to see it appear in the history list; the macOS bridge broadcasts its own clipboard events to all paired clients.

## Next steps

- Harden the WebSocket handshake with mutual TLS and QR-based onboarding.
- Promote the Android clipboard watcher into a foreground service for reliability on OEM builds.
- Build menu bar & launch-agent helpers on macOS so the bridge runs headless.
- Expand payload support to include files and contextual metadata (app name, source URL, etc.).
