export const BURMESE_GLYPH_TIERS = [
  ["ဃ", "ဎ", "ဍ", "ဌ", "ဏ", "ဉ", "ဦ", "ဩ", "အ", "ဟ", "သ", "၉", "၈", "၆"],
  ["က", "ခ", "ဂ", "င", "စ", "ဆ", "ဇ", "ည", "တ", "ထ", "ဒ", "န", "မ", "၇", "၅", "၄"],
  ["ယ", "ရ", "လ", "ဝ", "ပ", "ဖ", "ဗ", "ဘ", "ဧ", "ဣ", "၀", "၁", "၂", "၃"],
  ["။", "၊", "·", "-", " ", " "]
];

export const ASCII_GLYPH_TIERS = [
  ["@", "#", "$", "%", "&", "8", "B", "M", "W", "Q", "R", "D", "0"],
  ["A", "E", "F", "G", "H", "K", "N", "P", "S", "X", "Z", "2", "3", "5", "6", "9", "?", "+"],
  ["a", "b", "c", "e", "g", "h", "i", "l", "n", "o", "r", "s", "t", "u", "v", "x", "1", "4", "7", "/", "=", ":"],
  [".", ",", "'", "`", "-", "_", " ", " "]
];

export const HYBRID_GLYPH_TIERS = [
  ["ဃ", "ဎ", "အ", "ဟ", "သ", "@", "#", "$", "%", "&", "8", "B", "W", "၉", "၈"],
  ["က", "ခ", "ဂ", "င", "စ", "ဆ", "ဇ", "ည", "A", "E", "K", "N", "S", "X", "5", "၆"],
  ["တ", "ထ", "ဒ", "န", "မ", "ယ", "ရ", "လ", "a", "e", "i", "o", "r", "t", "1", "၃"],
  ["။", "၊", ".", ",", "'", "-", "_", " ", " "]
];

export const LOVE_GLYPH_TIERS = [
  ["♥", "❤", "အချစ်", "အ", "ချ", "စ်", "LOVE", "love", "A", "E", "I", "O", "U", "Y", "R", "S", "T", "L", "N"],
  ["က", "ခ", "မ", "ယ", "ရ", "လ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "x", "y", "z"],
  ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "*", "=", "~"],
  ["♡", "။", "၊", ".", ",", "'", "`", "-", "_", " ", " "]
];

export const SYMBOL_GLYPH_TIERS = [
  ["▓", "▒", "░", "█", "■", "◆", "◇", "●", "◉", "✦", "✧", "✺", "✹", "✸"],
  ["+", "*", "×", "÷", "=", "~", "^", "%", "#", "@", "&", "?", "!", "§", "※"],
  ["(", ")", "[", "]", "{", "}", "/", "\\", "|", ":", ";", "<", ">", "¬"],
  [".", ",", "'", "`", "-", "_", " ", " "]
];

export const CUTE_GLYPH_TIERS = [
  ["♡", "♥", "☆", "★", "✿", "❀", "❁", "୨", "୧", "૮", "ა", "ᵕ", "ᴗ", "˘"],
  ["uwu", "owo", "xoxo", "luv", "cute", "kira", "mimi", "nya", "အ", "ချစ်", "လှ"],
  ["૮₍", "₎ა", "ᰔ", "꒰", "꒱", "˖", "˚", "୭", "ꕤ", "♡", "✧", "･"],
  [".", "·", "˙", " ", " "]
];

export const INTERNET_GLYPH_TIERS = [
  ["✦", "✧", "☻", "☹", "☺", "☾", "☼", "⌁", "⌬", "⌘", "⌗", "မြန်", "စာ", "အင်", "နက်", "၀၀"],
  ["web", "net", "core", "cyber", "glitch", "pixel", "dream", "404", "html", "gif", "mp4", "ဖိုရမ်", "ဘလော့", "ဆိုက်"],
  ["<3", ":)", ":3", "://", ".com", "www", "lol", "brb", "omg", "zzz", "မင်္ဂလာ", "အိပ်မက်"],
  ["*", "+", "~", ".", "_", "-", "၊", "။", "·", " ", " "]
];

export const PRESETS = {
  terminal: {
    fgColor: "#55ff92",
    depthColor: "#fff4a8",
    bgColor: "#020805",
    saturation: 1.05,
    glow: 10,
    contrast: 1.25,
    blend: 0.86
  },
  cyberpunk: {
    fgColor: "#00f0ff",
    depthColor: "#ff2bd6",
    bgColor: "#090011",
    saturation: 1.55,
    glow: 22,
    contrast: 1.42,
    blend: 0.92
  },
  thingyan: {
    fgColor: "#ffd166",
    depthColor: "#ff6b35",
    bgColor: "#1c1306",
    saturation: 1.25,
    glow: 17,
    contrast: 1.18,
    blend: 0.9
  },
  mono: {
    fgColor: "#f1f1e8",
    depthColor: "#9ca3a3",
    bgColor: "#111111",
    saturation: 0,
    glow: 4,
    contrast: 1.05,
    blend: 0.82
  },
  love: {
    fgColor: "#ff4d73",
    depthColor: "#ffd1dc",
    bgColor: "#120006",
    saturation: 1.7,
    glow: 24,
    contrast: 1.35,
    blend: 0.95
  }
};

export function glyphSet(mode, pack = "core") {
  return glyphTiers(mode, pack).flat();
}

export function randomGlyphForBrightness(mode, brightness, x = 0, y = 0, time = 0, pack = "core") {
  const tiers = glyphTiers(mode, pack);
  const tierIndex = Math.min(tiers.length - 1, Math.floor(clamp(brightness, 0, 0.999) * tiers.length));
  const tier = tiers[tierIndex];
  const tick = Math.floor(time * 10);
  const index = hash(x, y, tick, tierIndex) % tier.length;
  return tier[index] || " ";
}

function glyphTiers(mode, pack) {
  if (pack === "symbols") return SYMBOL_GLYPH_TIERS;
  if (pack === "cute") return CUTE_GLYPH_TIERS;
  if (pack === "internet") return INTERNET_GLYPH_TIERS;
  if (mode === "ascii") return ASCII_GLYPH_TIERS;
  if (mode === "hybrid") return HYBRID_GLYPH_TIERS;
  if (mode === "love") return LOVE_GLYPH_TIERS;
  return BURMESE_GLYPH_TIERS;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hash(x, y, tick, salt) {
  let value = Math.imul(x + 11, 73856093) ^ Math.imul(y + 17, 19349663) ^ Math.imul(tick + 23, 83492791) ^ Math.imul(salt + 3, 2654435761);
  value ^= value >>> 13;
  value = Math.imul(value, 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}
