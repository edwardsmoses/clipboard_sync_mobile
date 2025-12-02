import { RELAY_WEBSOCKET_URL } from '@/constants/relay';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ALLOWED_CHARS = new Set(ALPHABET.split(''));
const TOKEN_LENGTH = 12;

export interface PairingCodeResult {
  endpoint: string;
}

export function decodePairingCode(input: string): PairingCodeResult | null {
  const sanitized = normalizeCode(input);
  if (sanitized.length !== TOKEN_LENGTH) {
    return null;
  }
  return {
    endpoint: buildRelayEndpoint(sanitized),
  };
}

function normalizeCode(value: string): string {
  return value
    .toUpperCase()
    .split('')
    .filter((char) => ALLOWED_CHARS.has(char))
    .join('');
}

function buildRelayEndpoint(token: string): string {
  const separator = RELAY_WEBSOCKET_URL.includes('?') ? '&' : '?';
  return `${RELAY_WEBSOCKET_URL}${separator}token=${encodeURIComponent(token)}&role=client`;
}
