/**
 * Design tokens as JS, for places CSS variables cannot reach (chart libraries, canvas, email).
 * The CSS in styles/theme.css is the source of truth; keep these in sync.
 */
export const colors = {
  light: {
    bg: "#f7f7f9",
    surface1: "#ffffff",
    surface2: "#f1f1f4",
    surface3: "#e9e9ee",
    overlay: "#ffffff",
    borderSubtle: "#e4e4ea",
    borderStrong: "#cfcfd8",
    textPrimary: "#0b0b0f",
    textSecondary: "#52525e",
    textMuted: "#6f6f7c",
    success: "#059669",
    successDark: "#047857",
    successFg: "#04130d",
    danger: "#e11d48",
    dangerSolid: "#e11d48",
    warning: "#b45309",
    info: "#0284c7",
    ai: "#7c3aed",
  },
  dark: {
    bg: "#0b0b0f",
    surface1: "#121218",
    surface2: "#181820",
    surface3: "#1f1f29",
    overlay: "#23232e",
    borderSubtle: "#24242f",
    borderStrong: "#33333f",
    textPrimary: "#f4f4f6",
    textSecondary: "#a1a1ad",
    textMuted: "#6b6b78",
    success: "#10b981",
    successDark: "#0a8f63",
    successFg: "#04130d",
    danger: "#f43f5e",
    dangerSolid: "#e11d48",
    warning: "#f59e0b",
    info: "#38bdf8",
    ai: "#8b5cf6",
  },
} as const;

export type ThemeName = keyof typeof colors;

/** Chart series order from the guideline: income green, expenses sky, then amber, red, grey. */
export function chartPalette(theme: ThemeName = "light") {
  const c = colors[theme];
  return [c.success, c.info, c.warning, c.danger, c.textSecondary] as const;
}

export const typography = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  hero: { size: 48, lineHeight: 56, weight: 800 },
  display: { size: 32, lineHeight: 40, weight: 800 },
  h1: { size: 24, lineHeight: 32, weight: 700 },
  h2: { size: 20, lineHeight: 28, weight: 700 },
  h3: { size: 16, lineHeight: 24, weight: 600 },
  body: { size: 14, lineHeight: 20, weight: 500 },
  bodyLg: { size: 16, lineHeight: 24, weight: 500 },
  small: { size: 13, lineHeight: 18, weight: 500 },
  caption: { size: 12, lineHeight: 16, weight: 500 },
  overline: { size: 11, lineHeight: 16, weight: 600, letterSpacing: "0.06em", uppercase: true },
} as const;

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

export const radius = { badge: 6, control: 8, card: 12, overlay: 16, pill: 999 } as const;

export const layout = {
  sidebar: 264,
  sidebarCollapsed: 72,
  topbar: 64,
  drawer: 480,
  drawerLg: 640,
  drawerXl: 800,
  modal: 480,
  modalLg: 640,
  contentMaxWidth: 1440,
  minTouchTarget: 44,
  rowHeight: 48,
  rowHeightCompact: 40,
  breakpoints: { tablet: 768, desktop: 1024, wide: 1440 },
} as const;

export const motion = {
  fast: 120,
  overlay: 240,
  draw: 600,
  shimmer: 1400,
  easeOverlay: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;
