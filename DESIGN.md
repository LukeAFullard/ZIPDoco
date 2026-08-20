# TimeDoco Design System

A reference for replicating this app's visual style and feel in other projects. Extracted directly from the working codebase (Tailwind CSS, React), not idealized — every value and snippet below is real and currently in production use.

---

## 1. Design Philosophy

The overall feel is **calm, editorial, and restrained** — closer to a well-typeset document or a Muji-style physical product than a typical SaaS dashboard. Concretely, that means:

- **No default framework colors.** Never use Tailwind's stock `blue-600`, `gray-500`-as-primary, etc. Every color in the palette is custom-named and intentional (see §2).
- **One accent color per semantic role**, used consistently everywhere that role appears — not "whatever blue is handy this time." Primary actions, focus states, and "active" indicators all share one accent; destructive actions share another; positive/success states share a third. Mixing in a stray `blue-600` button anywhere reads as a bug, not a style choice.
- **Low contrast, high intention.** Panels and cards sit close in tone to the page background — separation comes from a deliberate, thin border and a very slight shadow, not from a loud drop shadow or a jump in color. The goal is content that feels like it belongs on the page, not boxes stacked on top of it.
- **Numbers get their own voice.** Anything numeric/tabular (durations, currency, hours) uses the monospace typeface with tabular figures, everything else uses the humanist sans. This alone does a lot of work signaling "this is data" vs. "this is prose."
- **Dark mode is a first-class palette swap, not an inversion filter.** Every color has a deliberate dark-mode counterpart chosen for the same emotional register (warm/muted), not just a flipped lightness value.

---

## 2. Color Palette

Defined once in `tailwind.config.js`, referenced by name everywhere — never by raw hex in component code.

```js
// tailwind.config.js
colors: {
  ink: '#10161C',                              // near-black, warm not pure black
  stone: '#EEF0EC',                             // near-white, warm not pure white
  graphite: '#26313A',                          // dark neutral, dark-mode surface
  signal: { DEFAULT: '#D9A54A', dim: '#8A6A2F' }, // mustard gold — primary accent
  verdigris: { DEFAULT: '#3E7368', dim: '#295148' }, // muted teal-green — positive/secondary accent
  rust: '#B85C3E',                               // burnt terracotta — destructive/warning accent
}
```

### Semantic roles (this is the important part — the exact hex values matter less than what each color is *for*)

| Role | Light mode | Dark mode |
|---|---|---|
| Page background | `bg-stone` | `dark:bg-ink` |
| Raised surface (card/panel/modal) | `bg-white` | `dark:bg-graphite` — deliberately *different* from the page bg (`bg-stone` light / `dark:bg-ink` dark) so cards read as raised off the page in both themes |
| Primary text | `text-graphite` / `text-gray-900` | `dark:text-stone` / `dark:text-gray-100` |
| Secondary/muted text | `text-gray-500` | `dark:text-gray-400` |
| Primary accent (active states, links, focus rings) | `text-signal-dim` (text/icons — `signal` itself fails contrast on light backgrounds, see note below) | `dark:text-signal` |
| Positive / success | `text-verdigris` | same, works in both modes |
| Destructive / delete / error | `text-rust` | same, works in both modes |
| Primary button fill | `bg-graphite` (dark ink on light) | `dark:bg-stone` (light on dark) — **buttons invert relative to the page**, everything else doesn't |

**Contrast note, learned the hard way:** `signal` (#D9A54A) has a contrast ratio of only ~1.9:1 against `stone` and ~2.2:1 against white — it fails WCAG AA for text on light backgrounds even though it looks fine to the eye. Use `signal-dim` (#8A6A2F, ~4.4–5:1) for any *text or icon* use of the accent color in light mode. `signal` itself is reserved for: dark-mode text (8.2:1, passes easily), backgrounds/fills, borders, and focus rings (UI-component contrast only needs 3:1, which `signal` clears).

Icon/text drawn *on* a `bg-signal` fill now uses `text-ink`, not white — white-on-signal measures ~2.2:1 and fails even the 3:1 UI-component threshold.

### Never use directly
- Tailwind's default `blue-*` as a primary/brand color anywhere.
- Pure `#000000` / `#FFFFFF` — always the warm `ink`/`stone` pair instead (except for raised surfaces in light mode using `bg-white`).

---

## 3. Typography

```js
// tailwind.config.js
fontFamily: {
  sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui'],
  mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
}
```

```css
/* loaded via @fontsource */
@import '@fontsource/ibm-plex-sans';
@import '@fontsource/ibm-plex-mono';
```

**Rule: sans for everything you read, mono for everything you calculate with.** Body text, labels, buttons, headings → sans (the default). Durations, currency, hours, any tabular/numeric data → mono, with tabular figures so digits align in columns:

```css
.tabular { font-variant-numeric: tabular-nums; }
```
```tsx
<span className="text-4xl font-mono tabular font-medium">{formatDuration(totalSeconds)}</span>
<span className="font-mono tabular">{currencySymbol}{amount.toFixed(2)}</span>
```

### Scale in practice
- Page/section title: `text-xl font-bold` (e.g. "Analysis & Reports")
- Subsection heading: `text-lg font-semibold`
- Card label (small caps-style): `text-xs font-semibold uppercase tracking-wide`
- Body: default size, `text-graphite dark:text-stone`
- Secondary/meta text: `text-sm` or `text-xs`, `text-gray-500 dark:text-gray-400`
- Hero numbers (big stat displays): `text-4xl font-mono tabular font-medium`

---

## 4. Spacing, Radius & Elevation

- **Corner radius:** one custom token, `rounded-panel` = `8px`, used for every card, button, input, and modal. Not `rounded-lg`/`rounded-xl` — always the named token, so a future radius change is one line.
- **Elevation is border + shadow, not color jumps.** The standard raised-surface treatment:

```tsx
// the shared Panel primitive — this is the canonical "card" look
<div className="bg-white dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
```

  Note the border opacity is tuned deliberately (20% light / 20% dark) — subtle enough to feel calm, strong enough to actually read as an edge. Dark-mode border opacity was raised from 15% to 20% everywhere for improved definition.

- **Inset vs. outset shadow matters.** `shadow-inner` makes an element recede (used sparingly, e.g. the tab-bar's pill background). `shadow-sm` (outer) makes it lift slightly — that's the default for cards in light mode.
- **Dark-mode top-inset highlight:** `shadow-sm` alone doesn't render effectively on dark surfaces, so a top-inset highlight has been introduced:
```tsx
dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
```
  Paired with `shadow-sm` for light mode. Currently applied on the `Panel` primitive and the active-timer card.
- **Page layout:** centered column, `max-w-3xl` for normal content, wider (`max-w-5xl`) only for data-dense views (tables/matrices) — and the page-level width constraint must actually be lifted for those views, not just requested and then clipped by a narrower parent.
- **Vertical rhythm:** major sections separated by `mt-8`/`mb-8`, not by relying on child components' own incidental margins — be explicit about spacing between siblings.

---

## 5. Core Components

### Button

Four variants, two of which invert light/dark rather than just fading:

```tsx
// primary — the one used for the main action on a screen
'bg-graphite hover:bg-ink dark:bg-stone dark:hover:bg-gray-300 text-stone dark:text-ink'

// secondary — default, most buttons are this
'bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/20 dark:hover:bg-gray-800 text-graphite'

// danger — destructive actions only (settled with rust accent)
'bg-rust hover:bg-rust/90 text-white'

// ghost — lowest emphasis, icon buttons, toolbar actions
'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
```

All variants share: `inline-flex items-center justify-center font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-stone dark:ring-offset-graphite focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`

### Input

```tsx
'w-full px-3 py-2 border border-graphite/20 dark:border-white/20 rounded-panel bg-white dark:bg-graphite text-graphite dark:text-stone focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-stone dark:ring-offset-graphite focus-visible:ring-offset-2 transition-colors'
```

Inputs use `bg-white dark:bg-graphite`, sharing the standard raised-surface treatment with Panel.

### Focus ring — universal, non-negotiable

Every interactive element gets the same focus treatment: `focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2`. One accent color for every focus indicator in the app, always `focus-visible` (not `focus`) so it only appears for keyboard navigation, not mouse clicks.

`ring-offset-2` is paired with an explicit, theme- and surface-aware offset color rather than defaulting to Tailwind's white:
- Controls on a raised surface (Button, Input): `ring-offset-stone dark:ring-offset-graphite`
- Controls on the page itself (e.g. tab bar): `ring-offset-stone dark:ring-offset-ink`

### Tooltip (contextual help, not decoration)

A small `?`-style icon button next to any label that needs a one-line explanation — not a whole design pattern of its own, just a reusable primitive:

```tsx
<button
  aria-label="Help"
  className="text-graphite/40 dark:text-stone/40 hover:text-signal-dim dark:hover:text-signal focus-visible:ring-2 focus-visible:ring-signal rounded-full"
>
  <HelpCircle size={14} />
</button>
// on hover/focus, shows an absolutely-positioned bubble:
'bg-graphite text-stone dark:bg-stone dark:text-graphite rounded-md px-2.5 py-2 shadow-lg text-xs'
```

Note the tooltip bubble **inverts** relative to the page (dark bubble on light page, light bubble on dark page) — same logic as primary buttons, used anywhere something needs to visually "pop" above the normal surface hierarchy.

### Modal shell

Centered overlay, same `rounded-panel` + border language as cards, with a focus trap on open (see §7). Close button (icon-only `X`) always needs `aria-label="Close"` — icon-only buttons are a recurring accessibility gap if you forget this on every new modal.

---

## 6. Iconography

- **Library:** `lucide-react` exclusively. Don't mix icon sets.
- **Sizing convention:** `14` for inline/tooltip icons, `16` for buttons with adjacent text, `20`–`24` for standalone icon buttons (header actions). Pick from this set, don't use arbitrary sizes.
- **Icon-only buttons always need an accessible name** — `aria-label` (and ideally `title` too, for a mouse-hover tooltip) at minimum, or visually-hidden text via `sr-only`. This app's biggest recurring a11y gap has been forgetting this on new icon buttons — treat it as mandatory, not optional polish.
- Semantic icon choices are kept consistent: a repeated concept (e.g. "install/download," "backup/save," "delete") always uses the same icon everywhere it appears, never swapped arbitrarily between similar icons (e.g. `Download` vs `Save` — pick one per concept and stick to it, especially when two such buttons might appear near each other).

---

## 7. Interaction & Motion

- **Transitions are subtle and functional, never decorative.** `transition-colors` on virtually everything interactive; no elaborate enter/exit animations, no bouncy easing.
- **One motion exception:** a slow "breathing" opacity pulse (2.5s ease-in-out) for a live "recording" indicator — the one place where motion is meaningful (something is actively happening) rather than just chrome:
```css
@keyframes breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.recording-dot { animation: breathe 2.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .recording-dot { animation: none; } }
```
Always gate custom animation behind `prefers-reduced-motion`.
- **Modals trap focus** on open and restore it on close; don't let a re-render steal focus mid-interaction (a real bug we hit: an effect with an unstable dependency re-ran on every keystroke and yanked focus back to the modal container — keep focus-management effects scoped to `[]`/mount-only unless they genuinely need to react to changing props).

---

## 8. Layout Patterns

- **Responsive nav:** icon-only below a breakpoint, icon+label above it (`<span className="hidden sm:inline">Label</span>`), rather than shrinking text illegibly or overflowing.
- **Filter/toolbar rows:** `flex flex-wrap gap-2` so controls wrap gracefully rather than overflowing or getting clipped — and never put a wrapping flex row inside a parent with `overflow-hidden`, that combination silently clips content instead of wrapping it.
- **Metadata/label+value pairs** (form-like info, not filters) get their own vertical stack with real `<label>` text above/beside each field — don't rely on placeholder text alone once a field has content, the placeholder disappears and the field becomes unlabeled.
- **Dense tabular data** (matrices, detailed tables) gets a horizontal-scroll wrapper (`overflow-x-auto` on a `min-w-[...]` table) rather than trying to force small screens to fit — this is the one place horizontal scroll is the right call, not a bug.
- **Mobile date/native inputs** need an explicit visible label — native `<input type="date">` on mobile browsers often shows no placeholder text at all when empty, unlike desktop.

---

## 9. Accessibility Baseline (part of the style, not separate from it)

This palette and component set is only "on-brand" if it's also accessible — treat these as required, not optional:
- Every focus state uses the same visible ring (§5) — never remove focus outlines without replacing them.
- Every icon-only control has an accessible name.
- Every modal has exactly one `<h1>`/`<h2>` and one properly-labeled close control.
- Check new text/background color combinations against WCAG AA (4.5:1 normal text, 3:1 large text/UI components) before shipping — don't assume a color "looks readable enough."
- Dynamic status messages (toasts, save confirmations) use `role="status" aria-live="polite"` so they're announced, not just visually shown.

---

## 10. Quick Reference — Starting a New Component

1. Background: `bg-white dark:bg-graphite` if it's a raised surface, `bg-stone dark:bg-ink` if it's page-level.
2. Border: `border border-graphite/20 dark:border-white/20`.
3. Radius: `rounded-panel`.
4. Text: `text-graphite dark:text-stone` primary, `text-gray-500 dark:text-gray-400` secondary.
5. Any accent needed: `signal`/`signal-dim` (primary), `verdigris` (positive), `rust` (destructive) — never a stock Tailwind color.
6. Numbers: `font-mono tabular`.
7. Focus: `focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2` (paired with appropriate surface `ring-offset-*` color) on everything interactive.
8. Icons: `lucide-react`, accessible name on anything icon-only.
9. Motion: `transition-colors` and nothing louder, unless it's communicating genuinely live/active state.
