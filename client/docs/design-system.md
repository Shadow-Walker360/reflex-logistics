# Reflex Logistics — Design System

This documents the visual system implemented in `client/src`. Every claim
here is backed by code that actually exists — `tailwind.config.ts` and
`src/index.css` are the source of truth; this file explains the reasoning
behind what's there.

---

## 1. Design principles

Reflex is an operational logistics tool, not a marketing site. Every
decision below optimizes for **information hierarchy and legibility
first**, decoration second. Concretely, that means:

- No gradients on structural surfaces (only the sign-in brand panel and a
  subtle radial glow use one, deliberately, as a one-time "brand moment")
- No decorative illustrations
- Color carries meaning (status, role, semantic state) — it's never applied
  just to look lively
- Motion is short and purposeful (150–220ms), never looping or ambient

---

## 2. Color system

### 2.1 Palette → semantic mapping

The brief specifies six palette colors. Each maps to a semantic role, and
components consume the **semantic token**, not the raw palette step,
wherever practical:

| Palette color | Tailwind family | Semantic token(s) | Used for |
|---|---|---|---|
| Graphite | `graphite-50…950` | `background`, `foreground`, `muted`, `border`, `surface` | Structure: nav, text, surfaces, dividers |
| Olive green | `olive-50…900` | `primary`, `primary-hover`, `success` | Primary actions, active nav, delivered/success states |
| Yellow (amber) | `amber-50…900` | `warning`, `accent` | Pending states, attention, key-metric emphasis |
| Teal | `teal-50…900` | `info` | Realtime/tracking, connectivity, map UI |
| Crimson | `crimson-50…900` | `danger` | Failures, incidents, destructive actions |
| Wine | `wine-50…900` | `premium` | Sparse premium/secondary emphasis (e.g. admin identity, a "wine" badge tone) |

### 2.2 Semantic CSS custom properties

Defined once in `src/index.css` under `:root`, consumed via Tailwind's
`<alpha-value>` pattern so opacity modifiers work (`bg-primary/10`):

```css
--color-background       /* page background */
--color-surface          /* card/panel background */
--color-surface-elevated /* reserved for elevated surfaces (currently same as surface) */
--color-foreground       /* primary text */
--color-muted            /* secondary text */
--color-border           /* hairline borders */

--color-primary / --color-primary-hover
--color-success
--color-warning
--color-info
--color-danger
--color-accent
--color-premium
```

Components should reach for `bg-primary`, `text-danger`, `border-border`,
etc. — not `bg-olive-600` — except in two deliberate cases: (1) role-identity
accents (§8, e.g. `bg-teal-600` for the dispatcher nav dot) where a specific
hue from the palette is the point, and (2) multi-step scales a single
semantic token can't express (e.g. `StatusIndicator`'s per-status dot
colors, which span several palette families).

### 2.3 Status color mapping

Implemented in `src/components/StatusIndicator.tsx`:

| Status | Color | Rationale |
|---|---|---|
| `REQUESTED` | teal (light) | Neutral/awaiting — not yet acted on |
| `ASSIGNED` | olive | Operational progress begins |
| `ACCEPTED` | olive (darker) | Rider has committed |
| `PICKED_UP` | amber | In-hand, attention-worthy transition |
| `IN_TRANSIT` | teal | Active tracking |
| `DELIVERED` | olive | Success |
| `CANCELLED` | graphite dot + crimson-tinted text | Muted, but flagged |
| `FAILED` | crimson | Danger |
| `REASSIGNMENT_REQUIRED` | crimson | Needs dispatcher attention |

**Color is never the only signal.** Every status renders a text label next
to its dot, and exceptional statuses (`FAILED`, `CANCELLED`,
`REASSIGNMENT_REQUIRED`) additionally get `font-semibold` versus
`font-medium` for everything else — two independent visual cues, not one.

---

## 3. Typography

Two families: **Space Grotesk** (display — headings) and **Inter** (body).
A monospace (**JetBrains Mono**) is available for anything tabular/numeric
that benefits from fixed-width digits, though nothing currently uses it.

Defined as named Tailwind font-size utilities (`tailwind.config.ts`), so
"page title" or "metric" is a class name, not a magic pixel value repeated
across files:

| Token | Size | Weight | Use |
|---|---|---|---|
| `text-page-title` | 28px | 600 | Top of a page (`PageHeader`) |
| `text-section-title` | 18px | 600 | A section within a page |
| `text-card-title` | 15px | 600 | Card/panel headings, drawer titles |
| `text-metric` / `text-metric-sm` | 36px / 24px | 700 | Dashboard numbers (`StatCard`) — the strongest weight in the system, reserved for numbers that matter operationally |
| `text-body` | 14px | 400 | Default UI text |
| `text-supporting` | 13px | 400 | Secondary/context text |
| `text-caption` | 12px | 500 | Table headers, small labels |
| `text-status-label` | 12px | 600 | `StatusIndicator` text |

Not everything is bold. Weight is reserved for titles, metrics, and
exceptional status — body text stays regular so the hierarchy stays
readable rather than shouting.

---

## 4. Glass-pearl surfaces

Two utility classes in `src/index.css`: `.glass-pearl` (light) and
`.glass-pearl-dark` (for dark contexts — currently unused but available).

```css
.glass-pearl {
  background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.55));
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,.6);
  box-shadow: /* soft, layered — see index.css for exact values */;
}
```

**Where it's used:** the sign-in card (`LoginPage`), `Modal`, and `Card`'s
optional `glass` prop (used once, on `DeliveryConfirmationPage`'s success
card, as a deliberate "moment" rather than a default).

**Where it's deliberately NOT used:** `DataTable`, the dispatcher queue
list, any dense list of rows — per the brief, translucency behind dense
text hurts legibility, so those stay opaque (`bg-surface`).

The distinction from generic "glassmorphism": no saturated color bleeding
through, no heavy blur-everything, a visible (if soft) border and shadow
so the surface still reads as solid furniture, not a floating pane.

---

## 5. Spacing & radius

Named spacing tokens on top of Tailwind's default scale:

- `section-gap` (2rem) — between major page sections (see `PageHeader`'s
  bottom margin, dashboard stat-row-to-list gaps)
- `card-pad` (1.25rem) — internal card padding (`Card` component default)
- `page-pad` (1.5rem) — outer page padding on layout `<main>` elements

Radius scale: `sm` (6px) for tight controls (badges' pill shape uses
`rounded-full` instead), `DEFAULT`/`md`/`lg`/`xl` (8/10/14/18px) for
inputs → cards → modals → the largest surfaces, so bigger surfaces get
proportionally bigger corners.

---

## 6. Shadows

Three pearl shadow tokens (`shadow-pearl-sm`, `shadow-pearl`,
`shadow-pearl-lg`) — soft, layered, low-opacity shadows rather than harsh
drop shadows, used for: buttons (`sm`), hover-lift on rider delivery cards
(`pearl`), and drawers/toasts/modals (`lg`).

---

## 7. Button variants

`src/components/Button.tsx` implements exactly the five variants named in
the brief:

- **Primary** — filled olive, for the one main action on a screen
- **Secondary** — outlined graphite, for alternative/cancel actions
- **Danger** — filled crimson, for destructive actions
- **Ghost** — transparent, for low-emphasis actions (e.g. "Log out" in nav)
- **Icon** — circular, transparent, icon-only (available; not yet used in
  a shipped screen, but the variant exists for e.g. a future close/kebab
  button)

Every variant has a visible `:hover`, `:focus-visible` (2px outline), and
`:disabled` (50% opacity, `cursor-not-allowed`) state — verified in code,
not just described.

---

## 8. Role identity

Each of the four workspaces gets **one accent color**, used consistently
in exactly two places: the top-nav accent dot (`Navigation`'s
`accentClassName`) and, for desktop nav, the sidebar's active-link left
bar (`Sidebar`'s `accentClassName`):

| Role | Accent | Component |
|---|---|---|
| Retailer | Olive | `RetailerLayout` |
| Dispatcher | Teal | `DispatcherLayout` |
| Rider | Amber | `RiderLayout` |
| Admin | Wine | `AdminLayout` (placeholder) |

This is deliberately thin — one accent dot, not a full re-theme — so the
four roles read as "one product, four workspaces," per the brief's
explicit instruction not to build four separate themes.

---

## 9. Forms

Labels are always real, visible `<label>` elements — never a placeholder
standing in for a label. Every `Input`/`Select` supports label, optional
hint, error (wired via `aria-describedby` + `aria-invalid`), disabled, and
loading is handled at the form level (submit button's `isLoading`).
Required fields show a visual asterisk that is `aria-hidden` (the
`required` HTML attribute already gets announced natively by screen
readers — an unlabeled visual asterisk would double up or confuse that).

---

## 10. Sign-in composition

Desktop: 50/50 split. Left panel is `graphite-950` with an abstract SVG
(`AuthVisual.tsx`) — a grid, soft radial glow, dashed "route" polylines,
and small circular "delivery nodes" in olive/teal/amber. It is explicitly
**not** a real map and not any literal cultural imagery — abstract
geometry that reads as "logistics" without being a stereotype. Right panel
is the glass-pearl sign-in card. Below `md`, the left panel is hidden
entirely and the card becomes the full-width, single-column experience —
the brief's requirement that the form stay primary on mobile.

---

## 11. Accessibility principles

- Every interactive element has a visible `:focus-visible` outline
  (`src/index.css` sets a global 2px `primary`-colored outline as the
  baseline; components don't suppress it)
- Color is never the sole signal — see §2.3 for status, and `Alert`
  additionally pairs every tone with a small glyph (`ⓘ`, `✓`, `!`, `✕`)
- `Modal`/`Drawer` use `role="dialog"` + `aria-modal="true"`, close on
  `Escape`, and move focus into the dialog on open
- Form errors use `role="alert"` so assistive tech announces them
- `prefers-reduced-motion: reduce` is respected globally (`index.css`
  forces all animations/transitions to ~0 duration)

---

## 12. Animation principles

Three keyframe utilities: `animate-fade-in` (180ms), `animate-rise-in`
(220ms, slight upward translate — used for toasts and the drawer), and
`animate-scale-in` (160ms, slight scale — used for the modal). All use an
"ease-out"-family easing so entrances decelerate rather than bounce.
Nothing loops, nothing floats, nothing parallaxes. Reduced-motion users get
effectively instant transitions (§11).
