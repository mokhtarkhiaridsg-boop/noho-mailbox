/**
 * Pure-TypeScript Code 128B barcode generator (no dependencies).
 *
 * Code 128B encodes the printable ASCII range (32-127). Each data symbol is
 * 11 modules wide (alternating bars and spaces). The bar pattern is followed
 * by a modulo-103 checksum and a 13-module stop pattern.
 */

export type BarcodeOptions = {
  height?: number;
  moduleWidth?: number;
  showText?: boolean;
  textSize?: number;
  background?: string;
  foreground?: string;
  margin?: number;
};

// Code 128 patterns: index 0..106. Each pattern is 11 modules ('1' = bar,
// '0' = space) except the stop (index 106) which is 13 modules and includes
// the trailing termination bar.
const CODE128_PATTERNS: readonly string[] = [
  "11011001100", // 0
  "11001101100", // 1
  "11001100110", // 2
  "10010011000", // 3
  "10010001100", // 4
  "10001001100", // 5
  "10011001000", // 6
  "10011000100", // 7
  "10001100100", // 8
  "11001001000", // 9
  "11001000100", // 10
  "11000100100", // 11
  "10110011100", // 12
  "10011011100", // 13
  "10011001110", // 14
  "10111001100", // 15
  "10011101100", // 16
  "10011100110", // 17
  "11001110010", // 18
  "11001011100", // 19
  "11001001110", // 20
  "11011100100", // 21
  "11001110100", // 22
  "11101101110", // 23
  "11101001100", // 24
  "11100101100", // 25
  "11100100110", // 26
  "11101100100", // 27
  "11100110100", // 28
  "11100110010", // 29
  "11011011000", // 30
  "11011000110", // 31
  "11000110110", // 32
  "10100011000", // 33
  "10001011000", // 34
  "10001000110", // 35
  "10110001000", // 36
  "10001101000", // 37
  "10001100010", // 38
  "11010001000", // 39
  "11000101000", // 40
  "11000100010", // 41
  "10110111000", // 42
  "10110001110", // 43
  "10001101110", // 44
  "10111011000", // 45
  "10111000110", // 46
  "10001110110", // 47
  "11101110110", // 48
  "11010001110", // 49
  "11000101110", // 50
  "11011101000", // 51
  "11011100010", // 52
  "11011101110", // 53
  "11101011000", // 54
  "11101000110", // 55
  "11100010110", // 56
  "11101101000", // 57
  "11101100010", // 58
  "11100011010", // 59
  "11101111010", // 60
  "11001000010", // 61
  "11110001010", // 62
  "10100110000", // 63
  "10100001100", // 64
  "10010110000", // 65
  "10010000110", // 66
  "10000101100", // 67
  "10000100110", // 68
  "10110010000", // 69
  "10110000100", // 70
  "10011010000", // 71
  "10011000010", // 72
  "10000110100", // 73
  "10000110010", // 74
  "11000010010", // 75
  "11001010000", // 76
  "11110111010", // 77
  "11000010100", // 78
  "10001111010", // 79
  "10100111100", // 80
  "10010111100", // 81
  "10010011110", // 82
  "10111100100", // 83
  "10011110100", // 84
  "10011110010", // 85
  "11110100100", // 86
  "11110010100", // 87
  "11110010010", // 88
  "11011011110", // 89
  "11011110110", // 90
  "11110110110", // 91
  "10101111000", // 92
  "10100011110", // 93
  "10001011110", // 94
  "10111101000", // 95
  "10111100010", // 96
  "11110101000", // 97
  "11110100010", // 98
  "10111011110", // 99
  "10111101110", // 100
  "11101011110", // 101
  "11110101110", // 102
  "11010000100", // 103 - Start A
  "11010010000", // 104 - Start B
  "11010011100", // 105 - Start C
  "1100011101011", // 106 - Stop (13 modules incl. terminator)
];

const START_B = 104;
const STOP = 106;

/**
 * Map an ASCII character to its Code 128B value (index in the pattern table).
 * Returns -1 for characters outside the supported range.
 */
function code128BValue(ch: string): number {
  const c = ch.charCodeAt(0);
  if (c >= 32 && c <= 127) return c - 32;
  return -1;
}

/**
 * Sanitize the input by replacing unsupported characters with '?' (which is
 * within the Code 128B range) so the barcode remains valid even if the caller
 * passes Unicode or control characters.
 */
function sanitize(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const v = code128BValue(value[i]);
    out += v === -1 ? "?" : value[i];
  }
  return out;
}

/**
 * Compute the modulo-103 checksum for a Code 128B payload.
 * checksum = (start + sum(value[i] * (i+1))) % 103
 */
function checksum(values: number[]): number {
  let sum = START_B;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * (i + 1);
  }
  return sum % 103;
}

/**
 * Build the full module string (concatenated patterns) for the given value.
 */
function buildModules(value: string): string {
  const sanitized = sanitize(value);
  const values: number[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    values.push(code128BValue(sanitized[i]));
  }
  const cs = checksum(values);
  let modules = CODE128_PATTERNS[START_B];
  for (const v of values) modules += CODE128_PATTERNS[v];
  modules += CODE128_PATTERNS[cs];
  modules += CODE128_PATTERNS[STOP];
  return modules;
}

/**
 * Compute the total SVG width in pixels for a given value.
 */
export function getCode128Width(
  value: string,
  moduleWidth: number = 2,
  margin: number = 10,
): number {
  const sanitized = sanitize(value);
  // start + n data + checksum = 11 modules each; stop = 13 modules
  const moduleCount = 11 * (1 + sanitized.length + 1) + 13;
  return moduleCount * moduleWidth + margin * 2;
}

/**
 * Escape characters that have special meaning inside an SVG text node.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate an SVG string containing a Code 128B barcode for the given value.
 */
export function generateCode128(
  value: string,
  opts: BarcodeOptions = {},
): string {
  const height = opts.height ?? 60;
  const moduleWidth = opts.moduleWidth ?? 2;
  const showText = opts.showText ?? true;
  const textSize = opts.textSize ?? 12;
  const background = opts.background ?? "transparent";
  const foreground = opts.foreground ?? "#000";
  const margin = opts.margin ?? 10;

  const modules = buildModules(value);
  const totalWidth = modules.length * moduleWidth + margin * 2;
  const textPadding = showText ? textSize + 4 : 0;
  const barsHeight = height;
  const totalHeight = barsHeight + textPadding;

  // Coalesce consecutive '1' modules into a single <rect> to keep the SVG
  // small and easier to render.
  const rects: string[] = [];
  let i = 0;
  while (i < modules.length) {
    if (modules[i] === "1") {
      let run = 1;
      while (i + run < modules.length && modules[i + run] === "1") run++;
      const x = margin + i * moduleWidth;
      const w = run * moduleWidth;
      rects.push(
        `<rect x="${x}" y="0" width="${w}" height="${barsHeight}" fill="${foreground}"/>`,
      );
      i += run;
    } else {
      i++;
    }
  }

  const bgRect =
    background && background !== "transparent"
      ? `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${background}"/>`
      : "";

  const textNode = showText
    ? `<text x="${totalWidth / 2}" y="${barsHeight + textSize}" font-family="monospace" font-size="${textSize}" text-anchor="middle" fill="${foreground}">${escapeXml(sanitize(value))}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" shape-rendering="crispEdges">${bgRect}${rects.join("")}${textNode}</svg>`;
}
