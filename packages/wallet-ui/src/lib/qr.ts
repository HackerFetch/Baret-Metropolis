/**
 * A small QR code encoder for the receive screen: byte mode, error
 * correction level M, versions 1 to 10 (up to 213 bytes, far more than an
 * address needs). Written here because the wallet takes no new packages
 * offline; checked module for module against a reference encoder for every
 * mask (qr.test.ts holds the fixtures).
 *
 * The output is the module grid, true for dark. Drawing it (and the quiet
 * zone) is the caller's job.
 */

// ---------------------------------------------------------------------------
// Galois field GF(256), primitive polynomial x^8 + x^4 + x^3 + x^2 + 1.

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255] ?? 0;
}

function mul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : (EXP[(LOG[a] ?? 0) + (LOG[b] ?? 0)] ?? 0);
}

/** The generator polynomial of degree n, highest coefficient first. */
function generator(n: number): number[] {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] = (next[j] ?? 0) ^ (poly[j] ?? 0);
      next[j + 1] = (next[j + 1] ?? 0) ^ mul(poly[j] ?? 0, EXP[i] ?? 0);
    }
    poly = next;
  }
  return poly;
}

/** Reed-Solomon error correction codewords for one block. */
export function correction(data: readonly number[], n: number): number[] {
  const gen = generator(n);
  const rest = [...data, ...new Array<number>(n).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const factor = rest[i] ?? 0;
    if (factor === 0) continue;
    for (let j = 0; j < gen.length; j++)
      rest[i + j] = (rest[i + j] ?? 0) ^ mul(gen[j] ?? 0, factor);
  }
  return rest.slice(data.length);
}

// ---------------------------------------------------------------------------
// Level M, versions 1 to 10: EC codewords per block, and the blocks as
// [count, data codewords] groups (ISO/IEC 18004 table 9).

const LEVEL_M: readonly { ec: number; groups: readonly (readonly [number, number])[] }[] = [
  { ec: 10, groups: [[1, 16]] },
  { ec: 16, groups: [[1, 28]] },
  { ec: 26, groups: [[1, 44]] },
  { ec: 18, groups: [[2, 32]] },
  { ec: 24, groups: [[2, 43]] },
  { ec: 16, groups: [[4, 27]] },
  { ec: 18, groups: [[4, 31]] },
  {
    ec: 22,
    groups: [
      [2, 38],
      [2, 39],
    ],
  },
  {
    ec: 22,
    groups: [
      [3, 36],
      [2, 37],
    ],
  },
  {
    ec: 26,
    groups: [
      [4, 43],
      [1, 44],
    ],
  },
];

const ALIGNMENT: readonly (readonly number[])[] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/** Leftover bits after the codewords, per version. */
const REMAINDER = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0] as const;

function dataCapacity(version: number): number {
  const spec = LEVEL_M[version - 1];
  return spec ? spec.groups.reduce((sum, [count, size]) => sum + count * size, 0) : 0;
}

/** The smallest version whose level-M byte-mode capacity holds `length` bytes. */
export function versionFor(length: number): number | null {
  for (let version = 1; version <= LEVEL_M.length; version++) {
    const countBits = version < 10 ? 8 : 16;
    if (4 + countBits + length * 8 <= dataCapacity(version) * 8) return version;
  }
  return null;
}

/** Mode, count, data, terminator and padding, as data codewords. */
function dataCodewords(bytes: readonly number[], version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);
  const capacity = dataCapacity(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    words.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  for (let pad = 0; words.length < capacity / 8; pad++) words.push(pad % 2 === 0 ? 0xec : 0x11);
  return words;
}

/** Data blocks with their correction, interleaved into the final sequence. */
function interleave(words: readonly number[], version: number): number[] {
  const spec = LEVEL_M[version - 1];
  if (!spec) return [];
  const blocks: number[][] = [];
  let offset = 0;
  for (const [count, size] of spec.groups) {
    for (let i = 0; i < count; i++) {
      blocks.push(words.slice(offset, offset + size));
      offset += size;
    }
  }
  const ecBlocks = blocks.map((block) => correction(block, spec.ec));
  const out: number[] = [];
  const longest = Math.max(...blocks.map((block) => block.length));
  for (let i = 0; i < longest; i++)
    for (const block of blocks) if (i < block.length) out.push(block[i] ?? 0);
  for (let i = 0; i < spec.ec; i++) for (const block of ecBlocks) out.push(block[i] ?? 0);
  return out;
}

// ---------------------------------------------------------------------------
// The matrix.

type Grid = boolean[][];

function bchFormat(mask: number): number {
  // Level M is 00; the 15-bit format string, masked with 101010000010010.
  const data = (0b00 << 3) | mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  return ((data << 10) | rem) ^ 0x5412;
}

function bchVersion(version: number): number {
  let rem = version << 12;
  for (let i = 17; i >= 12; i--) if ((rem >>> i) & 1) rem ^= 0x1f25 << (i - 12);
  return (version << 12) | rem;
}

const MASKS: readonly ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** The function patterns, and which modules they take (so data skips them). */
function frame(version: number): { grid: Grid; reserved: boolean[][] } {
  const size = version * 4 + 17;
  const grid: Grid = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (r: number, c: number, dark: boolean) => {
    const row = grid[r];
    const held = reserved[r];
    if (!row || !held || c < 0 || c >= size) return;
    row[c] = dark;
    held[c] = true;
  };

  // Finders and their separators.
  for (const [top, left] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ] as const) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = top + r;
        const cc = left + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        set(rr, cc, r >= 0 && r <= 6 && c >= 0 && c <= 6 && ring !== 2);
      }
    }
  }
  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // Alignment patterns, except where they would sit on a finder.
  const centres = ALIGNMENT[version - 1] ?? [];
  for (const r of centres) {
    for (const c of centres) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6))
        continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++)
          set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
      }
    }
  }
  // The dark module, and the format and version areas (filled in later).
  set(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (!reserved[8]?.[i]) set(8, i, false);
    if (!reserved[i]?.[8]) set(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    set(8, size - 1 - i, false);
    if (i < 7) set(size - 1 - i, 8, false);
  }
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      set(a, b, false);
      set(b, a, false);
    }
  }
  return { grid, reserved };
}

function placeFormat(grid: Grid, mask: number): void {
  const size = grid.length;
  const bits = bchFormat(mask);
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  const put = (r: number, c: number, dark: boolean) => {
    const row = grid[r];
    if (row) row[c] = dark;
  };
  for (let i = 0; i <= 5; i++) put(8, i, bit(14 - i));
  put(8, 7, bit(8));
  put(8, 8, bit(7));
  put(7, 8, bit(6));
  for (let i = 9; i <= 14; i++) put(14 - i, 8, bit(14 - i));
  for (let i = 0; i < 8; i++) put(8, size - 1 - i, bit(i));
  for (let i = 8; i < 15; i++) put(size - 15 + i, 8, bit(i));
}

function placeVersion(grid: Grid, version: number): void {
  if (version < 7) return;
  const size = grid.length;
  const bits = bchVersion(version);
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = Math.floor(i / 3);
    const b = (i % 3) + size - 11;
    const rowA = grid[a];
    const rowB = grid[b];
    if (rowA) rowA[b] = dark;
    if (rowB) rowB[a] = dark;
  }
}

function placeData(
  grid: Grid,
  reserved: boolean[][],
  codewords: readonly number[],
  version: number,
): void {
  const size = grid.length;
  const bits: number[] = [];
  for (const word of codewords) for (let i = 7; i >= 0; i--) bits.push((word >>> i) & 1);
  for (let i = 0; i < (REMAINDER[version - 1] ?? 0); i++) bits.push(0);
  let index = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (const c of [right, right - 1]) {
        if (reserved[r]?.[c]) continue;
        const row = grid[r];
        if (row) row[c] = (bits[index] ?? 0) === 1;
        index++;
      }
    }
    upward = !upward;
  }
}

function applyMask(grid: Grid, reserved: boolean[][], mask: number): Grid {
  const test = MASKS[mask] ?? MASKS[0];
  return grid.map((row, r) =>
    row.map((dark, c) => (reserved[r]?.[c] || !test?.(r, c) ? dark : !dark)),
  );
}

/**
 * The four penalty rules of ISO/IEC 18004 section 7.8.3. Where the standard
 * leaves room (finder-like runs at the edge, the dark-share steps), this
 * follows the reference encoder the tests compare against.
 */
export function penalty(grid: Grid): number {
  const size = grid.length;
  const at = (r: number, c: number) => grid[r]?.[c] === true;
  let score = 0;
  // N1: runs of five or more in a row or column.
  for (let i = 0; i < size; i++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let j = 1; j <= size; j++) {
        const same =
          j < size && (horizontal ? at(i, j) === at(i, j - 1) : at(j, i) === at(j - 1, i));
        if (same) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
    }
  }
  // N2: 2x2 blocks of one colour.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = at(r, c);
      if (at(r, c + 1) === v && at(r + 1, c) === v && at(r + 1, c + 1) === v) score += 3;
    }
  }
  // N3: a 1:1:3:1:1 finder-like run with four light modules on one side,
  // counted in 11-module windows inside the grid.
  const FINDER_AFTER = 0b10111010000;
  const FINDER_BEFORE = 0b00001011101;
  for (let i = 0; i < size; i++) {
    let row = 0;
    let col = 0;
    for (let j = 0; j < size; j++) {
      row = ((row << 1) & 0x7ff) | (at(i, j) ? 1 : 0);
      col = ((col << 1) & 0x7ff) | (at(j, i) ? 1 : 0);
      if (j >= 10 && (row === FINDER_AFTER || row === FINDER_BEFORE)) score += 40;
      if (j >= 10 && (col === FINDER_AFTER || col === FINDER_BEFORE)) score += 40;
    }
  }
  // N4: the share of dark modules away from half, in 5 % steps.
  let dark = 0;
  for (const row of grid) for (const value of row) if (value) dark++;
  score += Math.abs(Math.ceil((dark * 100) / (size * size) / 5) - 10) * 10;
  return score;
}

export interface QrCode {
  readonly version: number;
  readonly mask: number;
  /** Row by row, true for a dark module. */
  readonly modules: readonly (readonly boolean[])[];
}

/** Encode `text` as UTF-8. `mask` forces a mask pattern; otherwise the lowest penalty wins. */
export function encode(text: string, mask?: number): QrCode | null {
  const bytes = [...new TextEncoder().encode(text)];
  const version = versionFor(bytes.length);
  if (version === null) return null;
  const codewords = interleave(dataCodewords(bytes, version), version);
  const { grid, reserved } = frame(version);
  placeData(grid, reserved, codewords, version);
  placeVersion(grid, version);

  const candidates = mask === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [mask];
  let best: QrCode | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const m of candidates) {
    const masked = applyMask(grid, reserved, m);
    placeFormat(masked, m);
    const score = mask === undefined ? penalty(masked) : 0;
    if (score < bestScore) {
      bestScore = score;
      best = { version, mask: m, modules: masked };
    }
  }
  return best;
}
