const AVATAR_PALETTE = [
  { bg: "#CECBF6", text: "#26215C" },
  { bg: "#9FE1CB", text: "#04342C" },
  { bg: "#F0997B", text: "#4A1B0C" },
  { bg: "#F4C0D1", text: "#4B1528" },
  { bg: "#B5D4F4", text: "#042C53" },
  { bg: "#C0DD97", text: "#173404" },
  { bg: "#FAC775", text: "#412402" },
];

const DOT_PALETTE = [
  "#1D9E75",
  "#D85A30",
  "#7F77DD",
  "#378ADD",
  "#D4537E",
  "#639922",
  "#BA7517",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColors(name: string) {
  const palette = AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length];
  return palette;
}

export function getSubjectDotColor(name: string): string {
  return DOT_PALETTE[hashString(name) % DOT_PALETTE.length];
}
