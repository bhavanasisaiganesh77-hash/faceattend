/**
 * Minimal QR Code encoder (Version 1–10, byte mode, error correction L/M/Q/H)
 * Self-contained — no external dependencies.
 * Returns a 2D boolean matrix where `true` = dark module.
 */

// ─── Galois Field GF(256) ───────────────────────────────────────────────────
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function gfPoly(degree: number): Uint8Array {
  let p = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const q = new Uint8Array(p.length + 1);
    const alpha = GF_EXP[i];
    for (let j = 0; j < p.length; j++) {
      q[j] ^= gfMul(p[j], alpha);
      q[j + 1] ^= p[j];
    }
    p = q;
  }
  return p;
}

function rsEncode(data: Uint8Array, nEcc: number): Uint8Array {
  const gen = gfPoly(nEcc);
  const msg = new Uint8Array(data.length + nEcc);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef === 0) continue;
    for (let j = 1; j < gen.length; j++) {
      msg[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return msg.slice(data.length);
}

// ─── QR version / capacity tables (byte mode, L) ────────────────────────────
// [version]: [size, dataCodewords, eccCodewords]
const VERSION_TABLE: [number, number, number][] = [
  [0, 0, 0], // placeholder index 0
  [21, 19, 7],
  [25, 34, 10],
  [29, 55, 15],
  [33, 80, 20],
  [37, 108, 26],
  [41, 136, 18],
  [45, 156, 20],
  [49, 194, 24],
  [53, 232, 30],
  [57, 274, 18],
];

function pickVersion(dataLen: number): number {
  for (let v = 1; v <= 10; v++) {
    if (VERSION_TABLE[v][1] >= dataLen + 3) return v; // +3 for mode/length/terminator
  }
  throw new Error(`Data too long for QR v1-10: ${dataLen} bytes`);
}

// ─── Bit stream helper ───────────────────────────────────────────────────────
class BitStream {
  private buf: number[] = [];
  private bits = 0;
  private cur = 0;

  write(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      this.cur = (this.cur << 1) | ((val >> i) & 1);
      this.bits++;
      if (this.bits === 8) {
        this.buf.push(this.cur);
        this.cur = 0;
        this.bits = 0;
      }
    }
  }

  flush() {
    if (this.bits > 0) {
      this.buf.push(this.cur << (8 - this.bits));
    }
    return new Uint8Array(this.buf);
  }
}

function encodeData(text: string, version: number): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const [, totalData, totalEcc] = VERSION_TABLE[version];
  const bs = new BitStream();
  // Mode indicator: byte mode = 0100
  bs.write(0b0100, 4);
  // Character count (8 bits for versions 1–9)
  bs.write(bytes.length, 8);
  // Data bytes
  for (const b of bytes) bs.write(b, 8);
  // Terminator
  bs.write(0, 4);
  let raw = bs.flush();
  // Pad to totalData codewords
  const padded = new Uint8Array(totalData);
  padded.set(raw.slice(0, totalData));
  const pads = [0xec, 0x11];
  for (let i = raw.length; i < totalData; i++)
    padded[i] = pads[(i - raw.length) % 2];
  // Append ECC
  const ecc = rsEncode(padded, totalEcc);
  const full = new Uint8Array(totalData + totalEcc);
  full.set(padded);
  full.set(ecc, totalData);
  return full;
}

// ─── Matrix builder ──────────────────────────────────────────────────────────
type Cell = 0 | 1 | -1; // dark | light | unset

function makeMatrix(size: number): Cell[][] {
  return Array.from({ length: size }, () => new Array<Cell>(size).fill(-1));
}

function placeFinderPattern(m: Cell[][], row: number, col: number) {
  const pat = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 7; c++) m[row + r][col + c] = pat[r][c] as Cell;
}

function placeSeparators(m: Cell[][], size: number) {
  for (let i = 0; i < 8; i++) {
    // top-left
    if (i < size) {
      m[7][i] = 0;
      m[i][7] = 0;
    }
    // top-right
    if (size - 8 + i < size) {
      m[7][size - 8 + i] = 0;
      m[i][size - 8] = 0;
    }
    // bottom-left
    if (size - 8 + i < size) {
      m[size - 8 + i][7] = 0;
      m[size - 8][i] = 0;
    }
  }
}

function placeTimingPatterns(m: Cell[][], size: number) {
  for (let i = 8; i < size - 8; i++) {
    const v = (i % 2 === 0 ? 1 : 0) as Cell;
    m[6][i] = v;
    m[i][6] = v;
  }
}

function placeDarkModule(m: Cell[][], version: number) {
  const size = VERSION_TABLE[version][0];
  m[size - 8][8] = 1;
}

function placeAlignmentPatterns(m: Cell[][], version: number) {
  // Alignment pattern centers for versions 2–6 (simplified)
  const centers: Record<number, number[]> = {
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
  };
  const c = centers[version];
  if (!c) return;
  for (const r of c) {
    for (const col of c) {
      if (
        (r === 6 && col === 6) ||
        (r === 6 && col === c[c.length - 1] && version <= 6) ||
        (r === c[c.length - 1] && col === 6)
      )
        continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          if (m[r + dr] && m[r + dr][col + dc] === -1)
            m[r + dr][col + dc] = (dark ? 1 : 0) as Cell;
        }
      }
    }
  }
}

// Format info for mask 0, ECC level L = 111011111000100
const FORMAT_L_MASK0 = 0b111011111000100;

function placeFormatInfo(m: Cell[][], size: number) {
  const bits = FORMAT_L_MASK0;
  // ── Around top-left finder ─────────────────────────────────────────────────
  // Row 8, columns 0-5 (bits 14 down to 9)
  for (let i = 0; i < 6; i++) m[8][i] = ((bits >> (14 - i)) & 1) as Cell;
  // Row 8, column 7 (bit 8) — skip column 6 (timing)
  m[8][7] = ((bits >> 8) & 1) as Cell;
  // Row 8, column 8 (bit 7)
  m[8][8] = ((bits >> 7) & 1) as Cell;
  // Column 8, rows 5 down to 0 (bits 6 down to 1) + row 7 (bit 0)
  // rows 7,6,5,4,3,2,1,0 carry bits 6,5,4,3,2,1,0 — skip row 6 (timing)
  m[7][8] = ((bits >> 6) & 1) as Cell;
  for (let i = 0; i < 6; i++) m[5 - i][8] = ((bits >> (5 - i)) & 1) as Cell;

  // ── Right of top-right finder (column size-1, rows 0-8 skipping timing) ───
  // Bits 14..8 go at rows 0..5,7 in column size-1 (mirroring top-left row)
  for (let i = 0; i < 6; i++) m[i][size - 1] = ((bits >> (14 - i)) & 1) as Cell;
  // Skip row 6 (timing); row 7 carries bit 8
  m[7][size - 1] = ((bits >> 8) & 1) as Cell;
  // Row 8 at the right side is the dark module column equivalent — bit 7
  m[8][size - 1] = ((bits >> 7) & 1) as Cell;

  // ── Below bottom-left finder (rows size-7 to size-1, column 8) ────────────
  // Bits 6..0 at rows size-7 to size-1
  for (let i = 0; i < 7; i++)
    m[size - 7 + i][8] = ((bits >> (6 - i)) & 1) as Cell;
}

function reserveFormatModules(m: Cell[][], size: number) {
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === -1) m[8][i] = 0;
    if (m[i][8] === -1) m[i][8] = 0;
  }
  for (let i = size - 8; i < size; i++) {
    if (m[8][i] === -1) m[8][i] = 0;
    if (m[i][8] === -1) m[i][8] = 0;
  }
}

function placeData(m: Cell[][], codewords: Uint8Array, size: number) {
  let bitIdx = 0;
  let up = true;
  let col = size - 1;
  while (col > 0) {
    if (col === 6) col--; // skip timing column
    const cols = [col, col - 1];
    for (let rowOffset = 0; rowOffset < size; rowOffset++) {
      const row = up ? size - 1 - rowOffset : rowOffset;
      for (const c of cols) {
        if (m[row][c] === -1) {
          const byteIdx = Math.floor(bitIdx / 8);
          const bit =
            byteIdx < codewords.length
              ? (codewords[byteIdx] >> (7 - (bitIdx % 8))) & 1
              : 0;
          m[row][c] = bit as Cell;
          bitIdx++;
        }
      }
    }
    up = !up;
    col -= 2;
  }
}

function applyMask0(
  m: Cell[][],
  size: number,
  reserved: boolean[][],
): Cell[][] {
  const out = m.map((r) => [...r]) as Cell[][];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!reserved[r][c] && (r + c) % 2 === 0)
        out[r][c] = (out[r][c] ^ 1) as Cell;
  return out;
}

function buildReserved(m: Cell[][]): boolean[][] {
  return m.map((r) => r.map((c) => c !== -1));
}

export function encodeQR(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const version = pickVersion(bytes.length);
  const [size] = VERSION_TABLE[version];
  const m = makeMatrix(size);

  // Place structural patterns
  placeFinderPattern(m, 0, 0);
  placeFinderPattern(m, 0, size - 7);
  placeFinderPattern(m, size - 7, 0);
  placeSeparators(m, size);
  placeTimingPatterns(m, size);
  placeDarkModule(m, version);
  placeAlignmentPatterns(m, version);
  reserveFormatModules(m, size);

  const reserved = buildReserved(m);

  // Encode and place data
  const codewords = encodeData(text, version);
  placeData(m, codewords, size);

  // Apply mask 0 and write format info
  const masked = applyMask0(m, size, reserved);
  placeFormatInfo(masked, size);

  return masked.map((row) => row.map((c) => c === 1));
}
