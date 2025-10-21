const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHAR_TO_VALUE = new Map<string, number>(
  Array.from(ALPHABET).map((char, index) => [char, index]),
);

export interface PairingCodeResult {
  endpoint: string;
}

export function decodePairingCode(input: string): PairingCodeResult | null {
  const sanitized = input.toUpperCase().split('').filter((char) => CHAR_TO_VALUE.has(char));
  if (sanitized.length < 12) {
    return null;
  }

  const bytes = base32Decode(sanitized.join(''));
  if (bytes.length < 7) {
    return null;
  }

  const ipBytes = bytes.slice(0, 4);
  const portBytes = bytes.slice(4, 6);
  const checksum = bytes[6];
  const expected = [...ipBytes, ...portBytes].reduce((sum, value) => (sum + value) & 0xff, 0);

  if (checksum !== expected) {
    return null;
  }

  const address = ipBytes.join('.');
  const port = (portBytes[0] << 8) | portBytes[1];

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    return null;
  }

  return {
    endpoint: `ws://${address}:${port}`,
  };
}

function base32Decode(value: string): number[] {
  let buffer = 0;
  let bitsLeft = 0;
  const output: number[] = [];

  for (const char of value) {
    const digit = CHAR_TO_VALUE.get(char);
    if (digit === undefined) {
      continue;
    }
    buffer = (buffer << 5) | digit;
    bitsLeft += 5;

    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      const byte = (buffer >> bitsLeft) & 0xff;
      output.push(byte);
    }
  }

  return output;
}
