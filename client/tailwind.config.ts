import type { Config } from "tailwindcss";

/**
 * Reflex Logistics design system.
 *
 * Palette (docs/design-system.md has the full rationale):
 *  - graphite: structural — nav, headings, high-contrast surfaces
 *  - olive:    primary brand/action — CTAs, active nav, operational success
 *  - amber:    attention/accent ("yellow" in the brief) — warnings, pending states
 *  - teal:     information/realtime — tracking, connectivity, map UI
 *  - crimson:  danger — failures, incidents, destructive actions
 *  - wine:     premium secondary accent — used sparingly for emphasis
 *
 * Components should reach for the semantic names (primary, success, warning,
 * info, danger, accent) rather than a raw palette step wherever practical —
 * see docs/design-system.md §2. Semantic CSS custom properties live in
 * src/index.css and are what most components actually consume.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — what components should reach for day to day.
        // Backed by CSS custom properties (src/index.css :root) so the
        // mapping lives in one place and could support theming later
        // without touching component code. See docs/design-system.md §2.
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-elevated": "rgb(var(--color-surface-elevated) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",
        },
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        premium: "rgb(var(--color-premium) / <alpha-value>)",

        // Raw palette — used for role-identity accents and anywhere a
        // semantic token doesn't fit (see docs/design-system.md §8).
        graphite: {
          950: "#0E1210",
          900: "#161C19",
          800: "#212925",
          700: "#313B35",
          600: "#48544C",
          500: "#647266",
          400: "#8A968B",
          300: "#B4BEB4",
          200: "#D6DCD5",
          100: "#ECEFEB",
          50: "#F7F8F6",
        },
        olive: {
          900: "#2B3A1F",
          800: "#3C4F29",
          700: "#4C6533",
          600: "#5E7A3F",
          500: "#71904C",
          400: "#8FAC69",
          300: "#B2C695",
          200: "#D5E2C1",
          100: "#EBF1E1",
          50: "#F5F8F0",
        },
        amber: {
          900: "#5C3D05",
          700: "#8A5B08",
          600: "#B3780D",
          500: "#D99A1E",
          400: "#E6B750",
          300: "#EFCC80",
          200: "#F6E2B3",
          100: "#FBF1DA",
          50: "#FDF8EE",
        },
        teal: {
          900: "#0B3B3E",
          700: "#115256",
          600: "#166468",
          500: "#1D7A7F",
          400: "#3E9BA0",
          300: "#7DBEC1",
          200: "#B8DEDF",
          100: "#DEF0F0",
          50: "#F1F9F9",
        },
        crimson: {
          900: "#4C0F16",
          700: "#7A1620",
          600: "#9A1D29",
          500: "#B92834",
          400: "#D14C56",
          300: "#E58A90",
          200: "#F1BEC1",
          100: "#F9E0E1",
          50: "#FDF2F2",
        },
        wine: {
          900: "#3A1224",
          700: "#571A35",
          600: "#6E2143",
          500: "#8A2C55",
          400: "#A85677",
          300: "#C68DA3",
          200: "#E1C1CE",
          100: "#F1E2E8",
          50: "#F9F1F4",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        "page-title": ["1.75rem", { lineHeight: "2.1rem", fontWeight: "600" }],
        "section-title": ["1.125rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        "card-title": ["0.9375rem", { lineHeight: "1.35rem", fontWeight: "600" }],
        metric: ["2.25rem", { lineHeight: "2.5rem", fontWeight: "700", letterSpacing: "-0.02em" }],
        "metric-sm": ["1.5rem", { lineHeight: "1.75rem", fontWeight: "700", letterSpacing: "-0.01em" }],
        body: ["0.875rem", { lineHeight: "1.375rem", fontWeight: "400" }],
        supporting: ["0.8125rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
        "status-label": ["0.75rem", { lineHeight: "1rem", fontWeight: "600" }],
      },
      spacing: {
        "section-gap": "2rem",
        "card-pad": "1.25rem",
        "page-pad": "1.5rem",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      boxShadow: {
        "pearl-sm": "0 1px 2px 0 rgb(14 18 16 / 0.04), 0 1px 3px 0 rgb(14 18 16 / 0.06)",
        pearl: "0 4px 16px -4px rgb(14 18 16 / 0.10), 0 2px 6px -2px rgb(14 18 16 / 0.06)",
        "pearl-lg": "0 12px 32px -8px rgb(14 18 16 / 0.16), 0 4px 12px -4px rgb(14 18 16 / 0.08)",
        "pearl-inset": "inset 0 1px 0 0 rgb(255 255 255 / 0.4)",
      },
      backdropBlur: {
        pearl: "16px",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "rise-in": "rise-in 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
