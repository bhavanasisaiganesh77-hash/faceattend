# Design Brief

## Direction

Cool Serene — a professional, institutional face recognition attendance system that builds trust through clarity and calm visual hierarchy.

## Tone

Editorial clarity with institutional authority — clean, serene, and precise. The interface conveys reliability and accuracy because the UI is visually organized and predictable.

## Differentiation

Real-time face recognition confidence indicator with teal glow feedback creates a distinctive moment of visual affirmation when attendance is successfully captured — users know exactly when they're recognized.

## Color Palette

| Token      | OKLCH          | Role                                  |
| ---------- | -------------- | ------------------------------------- |
| background | 0.98 0.008 230 | Cool off-white, light mode primary  |
| foreground | 0.18 0.015 230 | Deep blue-grey text                 |
| card       | 1.0 0.004 230  | Pure white content surfaces         |
| primary    | 0.42 0.14 240  | Deep ocean blue for trust & authority |
| accent     | 0.6 0.15 170   | Teal for confirmation & positive actions |
| muted      | 0.94 0.01 230  | Subtle backgrounds for secondary content |
| destructive| 0.55 0.22 25   | Red for critical actions            |

## Typography

- Display: Space Grotesk — sharp, technical, institutional headings and labels
- Body: DM Sans — clean, modern, readable interface text and descriptions
- Mono: Geist Mono — consistent code/ID displays and timestamp precision
- Scale: hero `text-5xl font-bold tracking-tight`, h2 `text-3xl font-bold`, label `text-sm font-semibold tracking-widest`, body `text-base`

## Elevation & Depth

Subtle cool shadows create depth without drama. Cards rest on light backgrounds with soft borders. Header has bottom border. Footer has top border. Content sections alternate between `bg-background` and `bg-muted/30`.

## Structural Zones

| Zone    | Background     | Border        | Notes                                           |
| ------- | -------------- | ------------- | ----------------------------------------------- |
| Header  | bg-card        | border-b      | Authentication state, role indicator, logo      |
| Content | bg-background  | —             | Main attendance/roster area with card grid      |
| Sidebar | bg-sidebar     | border-r      | Role-based nav (Student/Teacher), role selector |
| Footer  | bg-muted/30    | border-t      | Status info, session time, settings link        |

## Spacing & Rhythm

Spacious layout with 2–3rem gaps between major sections. Cards use consistent 1rem internal padding. Micro-spacing: 0.5rem for labels, 1rem for content grouping. Grid-based alignment at 8px increments creates visual order.

## Component Patterns

- Buttons: Primary `bg-primary text-primary-foreground rounded-md`, hover `opacity-90`. Secondary `border border-border text-foreground` hollow style.
- Cards: `bg-card rounded-md` with `shadow-sm`, `border border-border/50` for subtle depth. Hover `shadow-md transition-smooth`.
- Badges: Role indicator `bg-accent/20 text-accent` for active state, `bg-muted text-muted-foreground` for inactive.
- Face capture: Center canvas with `border-2 border-primary` active, `border-accent` when matched, confidence indicator as teal glow overlay.

## Motion

- Entrance: Fade-in on page load `opacity-0 → opacity-100` over 300ms. Stagger card entries 50ms apart.
- Hover: Cards lift `shadow-sm → shadow-md` over 200ms. Button color shift `opacity-100 → opacity-90`.
- Decorative: Confidence indicator pulse when face is detected `scale-100 → scale-105` looping gently. Timestamp updates refresh smoothly.

## Constraints

- No gradients, no heavy shadows, no neon effects. Confidence glow is single teal ring, not multi-color.
- Typefaces must be from bundled fonts only (Space Grotesk, DM Sans, Geist Mono).
- All colors must use CSS custom properties from `:root` or `.dark`, never raw hex or rgb().
- Face recognition feedback must be immediately visible — no delayed states.
- Buttons always use primary or secondary intent; never mix colors arbitrarily.

## Signature Detail

The confidence percentage glows teal with a subtle pulse when a face is recognized — a single, focused visual feedback moment that confirms successful attendance capture. This detail differentiates the interface from generic CRUD apps and signals precision to users.
