const RESERVED_MASTER_PATHS = new Set([
  "",
  "login",
  "companies",
  "settings",
  "assets",
  "api",
  "uploads",
]);

export function getTenantSlugFromPath(pathname?: string): string | null {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  let stripped = path;
  if (stripped.startsWith("/absensi")) {
    stripped = stripped.slice("/absensi".length);
  }
  const firstSegment = stripped.replace(/^\/+/, "").split("/")[0] || "";
  if (!firstSegment || RESERVED_MASTER_PATHS.has(firstSegment.toLowerCase())) {
    return null;
  }
  return firstSegment;
}

export function hexToHslString(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "43 74% 49%";
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslStringToHex(hsl: string | null | undefined): string {
  if (!hsl) return "#4CAF50";
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#4CAF50";
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getCutoffPeriodDates(
  cutoffStartDay = 1,
  cutoffEndDay = 31,
  refDate = new Date()
): { startDate: string; endDate: string } {
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed

  let startYear = year;
  let startMonth = month;
  if (cutoffStartDay > cutoffEndDay || (cutoffStartDay === cutoffEndDay && cutoffStartDay > 1)) {
    // Cross-month period e.g. 25 Mar - 25 Apr
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const maxStartDay = new Date(startYear, startMonth + 1, 0).getDate();
  const clampedStartDay = Math.min(cutoffStartDay, maxStartDay);

  const maxEndDay = new Date(year, month + 1, 0).getDate();
  const clampedEndDay = Math.min(cutoffEndDay, maxEndDay);

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    startDate: `${startYear}-${pad(startMonth + 1)}-${pad(clampedStartDay)}`,
    endDate: `${year}-${pad(month + 1)}-${pad(clampedEndDay)}`,
  };
}
