import * as Clipboard from 'expo-clipboard';

import type { ClipboardContentType } from '@/lib/models/clipboard';

export interface ClipboardSnapshot {
  contentType: ClipboardContentType;
  text?: string | null;
  html?: string | null;
  image?: ClipboardImageContent | null;
}

export type ClipboardMonitorCallback = (snapshot: ClipboardSnapshot) => void | Promise<void>;

const POLL_INTERVAL_MS = 1500;

export type ClipboardImageContent = {
  data: string;
  width: number;
  height: number;
  format?: string;
};

function fingerprint(snapshot: ClipboardSnapshot): string {
  return JSON.stringify({
    type: snapshot.contentType,
    text: snapshot.text ?? null,
    html: snapshot.html ?? null,
    imageKey: snapshot.image ? `${snapshot.image.width}x${snapshot.image.height}:${snapshot.image.data.length}` : null,
  });
}

async function readClipboard(): Promise<ClipboardSnapshot | null> {
  try {
    if (typeof Clipboard.getContentAsync === 'function') {
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

    if (typeof Clipboard.hasStringAsync === 'function' && (await Clipboard.hasStringAsync())) {
      const text = await Clipboard.getStringAsync();
      return {
        contentType: 'text',
        text,
      };
    }

    return null;
  } catch (error) {
    console.warn('[clipboard] Failed to read clipboard', error);
    return null;
  }
}

export class ClipboardMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastFingerprint: string | null = null;

  constructor(private readonly callback: ClipboardMonitorCallback) {}

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
    const hash = fingerprint(snapshot);
    if (hash === this.lastFingerprint) {
      return;
    }
    this.lastFingerprint = hash;
    await this.callback(snapshot);
  }
}
