import type { ClipboardContentType } from '@/lib/models/clipboard';

export interface ClipboardSnapshot {
  contentType: ClipboardContentType;
  text?: string | null;
  html?: string | null;
  image?: ClipboardImageContent | null;
}

export type ClipboardMonitorCallback = (snapshot: ClipboardSnapshot) => void | Promise<void>;
export type ClipboardMonitorShouldIgnore = (snapshot: ClipboardSnapshot, fingerprint: string) => boolean;

export interface ClipboardMonitorOptions {
  shouldIgnore?: ClipboardMonitorShouldIgnore;
}

const POLL_INTERVAL_MS = 1500;

export type ClipboardImageContent = {
  data: string;
  width: number;
  height: number;
  format?: string;
};

type ExpoClipboardModule = typeof import('expo-clipboard');

let clipboardModulePromise: Promise<ExpoClipboardModule | null> | null = null;

async function loadClipboardModule(): Promise<ExpoClipboardModule | null> {
  if (!clipboardModulePromise) {
    clipboardModulePromise = import('expo-clipboard')
      .then((module) => module)
      .catch((error) => {
        console.warn('[clipboard] expo-clipboard unavailable; attempting browser fallback', error);
        return null;
      });
  }
  return clipboardModulePromise;
}

async function readClipboard(): Promise<ClipboardSnapshot | null> {
  try {
    const Clipboard = await loadClipboardModule();

    if (Clipboard?.getContentAsync) {
      const content = await Clipboard.getContentAsync();
      if (!content) {
        return null;
      }

      if (content.text) {
        return {
          contentType: 'text',
          text: content.text,
          html: content.html ?? null,
        };
      }

      if (content.image) {
        return {
          contentType: 'image',
          image: {
            data: content.image.data,
            width: content.image.width,
            height: content.image.height,
            format: (content.image as ClipboardImageContent).format,
          },
        };
      }
    }

    if (Clipboard?.hasStringAsync && (await Clipboard.hasStringAsync())) {
      const text = await Clipboard.getStringAsync();
      return {
        contentType: 'text',
        text,
      };
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text) {
        return {
          contentType: 'text',
          text,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('[clipboard] Failed to read clipboard', error);
    return null;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    const Clipboard = await loadClipboardModule();
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(text);
      return true;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('[clipboard] Failed to copy to clipboard', error);
  }
  return false;
}

export class ClipboardMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastFingerprint: string | null = null;

  constructor(
    private readonly callback: ClipboardMonitorCallback,
    private readonly options: ClipboardMonitorOptions = {},
  ) {}

  start(): void {
    if (this.intervalId) {
      return;
    }
    void this.checkClipboard();
    this.intervalId = setInterval(() => {
      void this.checkClipboard();
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.lastFingerprint = null;
  }

  private async checkClipboard() {
    const snapshot = await readClipboard();
    if (!snapshot) {
      return;
    }
    const hash = fingerprintSnapshot(snapshot);
    if (hash === this.lastFingerprint) {
      return;
    }
    if (this.options.shouldIgnore?.(snapshot, hash)) {
      this.lastFingerprint = hash;
      return;
    }
    this.lastFingerprint = hash;
    await this.callback(snapshot);
  }
}

export function fingerprintSnapshot(snapshot: ClipboardSnapshot): string {
  return JSON.stringify({
    type: snapshot.contentType,
    text: snapshot.text ?? null,
    html: snapshot.html ?? null,
    imageKey: snapshot.image ? `${snapshot.image.width}x${snapshot.image.height}:${snapshot.image.data.length}` : null,
  });
}
