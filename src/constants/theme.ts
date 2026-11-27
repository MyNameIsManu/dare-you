/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

/**
 * THE place for colours. Change the values in BASE and everything derived
 * from them (glow, soft fills, urgency, dark text tone) follows.
 *
 * Rules:
 * - Components never contain hex values: use `useTheme()` (or
 *   `<ThemedText themeColor>` / `<ThemedView type>`).
 * - `StyleSheet.create` can't call hooks. While the app is light-only,
 *   `Colors.light.x` is the static way to reach a token there. When dark mode
 *   comes back, move those spots to inline `theme.x`.
 */
const BASE = {
  /** The one brand colour: primary actions, rings, progress, links */
  accent: "#466995",
  ink: "#1A1A1F",
  mute: "#5A5A63",
  ground: "#F4F6F9",
  danger: "#C62828",
  success: "#2E7D32",
} as const;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "#RRGGBB" + alpha (0–1) → "rgba(r,g,b,a)" */
export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = channels(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Mix a colour with black: amount 0 = unchanged, 1 = black. */
function darken(hex: string, amount: number) {
  const [r, g, b] = channels(hex).map((c) => Math.round(c * (1 - amount)));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export const Colors = {
  light: {
    // Base
    text: BASE.ink,
    textSecondary: BASE.mute,
    background: BASE.ground,
    backgroundElement: withAlpha(BASE.ink, 0.05),
    backgroundSelected: withAlpha(BASE.ink, 0.1),

    // Accent (derived from BASE.accent)
    accent: BASE.accent,
    /** Darker tone for text on light/glass surfaces (contrast) */
    accentText: darken(BASE.accent, 0.18),
    /** Text and icons on top of an accent fill */
    onAccent: "#FFFFFF",
    accentSoft: withAlpha(BASE.accent, 0.12),
    accentGlow: withAlpha(BASE.accent, 0.25),

    // Glass surfaces
    glass: "rgba(255,255,255,0.58)",
    glassBorder: "rgba(255,255,255,0.8)",
    glassHighlight: "rgba(255,255,255,0.95)",
    glassShadow: "rgba(30,45,70,0.09)",
    /** Soft colour spots behind the glass (see GlassScreen) */
    orb: withAlpha(BASE.accent, 0.3),
    orbFade: withAlpha(BASE.accent, 0),

    // Feedback
    danger: BASE.danger,
    success: BASE.success,

    // Deadline urgency (see utils/dare-progress.ts)
    urgencyCalm: BASE.ink,
    urgencySoon: BASE.accent,
    urgencyUrgent: darken(BASE.accent, 0.18),
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
