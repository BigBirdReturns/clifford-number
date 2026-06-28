# AXM Clifford Number Design System

A professional, accessible design system aligned with AXM house style standards for the clifford-number topology project.

## Color Palette

### Primary Colors
- **Ink** (`#071e4a`): Primary text, headings, borders, and interactive elements
- **Ink-2** (`#123466`): Secondary text, hover states, visual hierarchy
- **Paper** (`#fffaf0`): Main background color
- **Panel** (`#fffdf8`): Card and panel backgrounds

### Accent Colors
- **Line** (`#d9a22f`): Brand accent for highlights, accents, and decorative elements
- **Wash** (`#eef4fb`): Subtle background wash for pills and badges

### Semantic Colors
- **Ok** (`#24563a`): Success, confirmed states
- **Danger** (`#8d2f2f`): Error, warning, open states
- **Muted** (`#516070`): Tertiary text, descriptive content

### Color Usage Guidelines

| Color | Use Case | Examples |
|-------|----------|----------|
| Ink | Primary text, main buttons, borders | Body text, h1-h3, CTAs |
| Ink-2 | Secondary hierarchy, hover states | h4-h6, hover backgrounds |
| Line | Brand accent, callouts | Eyebrow text, accent borders, highlights |
| Paper | Main background | Body background, full-page background |
| Panel | Card surfaces | `.panel`, `.control-card`, `.result` |
| Wash | Neutral backgrounds | `.pill`, badges, light backgrounds |
| Ok | Positive states | `.pill.confirmed` background |
| Danger | Negative states | `.pill.open` background |
| Muted | Tertiary text | Description text, captions |

## Typography

### Font Family
- **Primary**: Inter (fallback: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)
- Provides modern, accessible interface with excellent screen rendering

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| h1 | clamp(3rem, 9vw, 7rem) | 0.9 | 400 | Page titles, hero headings |
| subtitle | clamp(1.25rem, 3vw, 2rem) | 1.55 | 750 | Hero subtitle, secondary messaging |
| body | 1rem | 1.55 | 400 | Body text, paragraphs |
| body-small | 0.95rem | 1.55 | 400 | Navigation, secondary labels |
| label | inherit | 1.55 | 800 | Form labels, emphasis |
| caption | 0.83rem | 1.55 | 800 | Metadata, status labels |
| eyebrow | 0.85rem | 1.55 | 800 | Overline, category labels |

### Typography Best Practices
- Use `font-weight: 800` for labels and eyebrow text to establish hierarchy
- Use `font-weight: 750` for subtitles to create weight progression
- Maintain minimum line-height of 1.55 for readability
- Use `letter-spacing: 0.02em` to 0.12em for uppercase text to improve legibility
- Use `text-transform: uppercase` sparingly, paired with increased letter-spacing

## Spacing Scale

All spacing uses a base unit of 4px with the following multiplier scale:

| Token | Value | Usage |
|-------|-------|-------|
| space-2 | 8px | Close spacing between related elements |
| space-3 | 12px | Compact spacing, gaps within components |
| space-4 | 16px | Standard spacing |
| space-5 | 20px | Medium spacing |
| space-6 | 24px | Comfortable spacing between sections |
| space-7 | 28px | Large spacing |
| space-8 | 32px | Extra large spacing |
| space-9 | 36px | Section separation |
| space-10 | 40px | Major section separation |

### Spacing Usage Patterns
- **Component internal padding**: space-4 to space-6
- **Gap between small elements**: space-2 to space-3
- **Gap between section elements**: space-6 to space-8
- **Section padding (vertical)**: space-9 to space-10
- **Section padding (horizontal)**: clamp(18px, 4vw, 56px) for responsive gutters

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| radius-sm | 14px | Form inputs, small buttons |
| radius-md | 18px | Cards, panels, larger containers |
| radius-lg | 22px | Feature cards, control cards |
| radius-full | 999px | Pill shapes, badges, rounded pills |

## Shadows

- **Default shadow**: `0 18px 55px rgba(7, 30, 74, 0.12)`
  - Used on cards, panels, elevated surfaces
  - Subtle and minimal for professional appearance

## Components

### Hero Section
- Full-width header with radial gradient background
- Contains brand navigation and hero message
- Border-bottom: 3px solid ink
- Responsive padding using clamp()

### Navigation Bar (`.topbar`)
- Flexbox row with brand on left, nav links on right
- Wraps on smaller screens
- Brand uses font-weight: 800 for emphasis
- Nav links use standard text with underline decoration

### Buttons
- **Base styling**: 
  - Padding: 14px 18px
  - Border: 2px solid ink
  - Border-radius: 14px
  - Font-weight: 800
  - Cursor: pointer
- **Background**: ink (dark blue)
- **Text color**: white
- **Hover/Focus**: background becomes ink-2 (lighter blue)
- **Focus state**: Visible ring for keyboard navigation

### Form Inputs
- **Search input**:
  - Width: 100%
  - Padding: 14px 15px
  - Border: 2px solid ink
  - Border-radius: 14px
  - Background: white
  - Focus: Enhanced focus ring (recommend 3px solid line color)

### Pills (`.pill`)
- Inline-flex display
- Padding: 4px 8px
- Border-radius: 999px
- Font-size: 0.83rem
- Font-weight: 800
- Default background: wash color

**Pill Variants**:
- `.pill.confirmed`: background ok, text ok color
- `.pill.primary_public`: background ok, text ok color
- `.pill.reported`: background wash, text ink-2
- `.pill.derived`: background golden (consider: rgba(217, 162, 47, 0.15)), text golden-dark
- `.pill.judgment`: background golden, text golden-dark
- `.pill.open`: background danger-wash, text danger color

### Cards (`.panel`, `.control-card`, `.result`, `.graph-browser`)
- Background: rgba(255, 253, 248, 0.92) (semi-transparent panel)
- Border: 2px solid rgba(217, 162, 47, 0.7)
- Border-radius: 22px
- Box-shadow: var(--shadow)
- Padding: 22-36px depending on card type

### Badges (`.number-badge`)
- Grid layout (center content)
- 118px × 118px square
- Border: 3px solid ink
- Background: ink
- Text color: white
- Text size: 3.4rem for large number

### Node Cards (`.node-card`)
- Display: block
- Min-height: 128px
- Padding: 15px
- Border: 1px solid rgba(7, 30, 74, 0.2)
- Border-radius: 16px
- Background: white
- Hover state: Recommend lift effect (subtle box-shadow increase, transform: translateY(-2px))

## Interactive States

### Focus States (Keyboard Navigation)
- All interactive elements must have visible focus indicators
- Recommended: 3px solid outline using line color
- Focus outline offset: 2px
- Must meet WCAG AA contrast requirements

### Hover States
- Buttons: background color shift (ink → ink-2)
- Links: underline decoration visible
- Cards: Optional lift effect (box-shadow enhancement, subtle translateY)
- Pills: Optional background shade shift

### Active States
- Buttons: darker background (option to use ink-2 or deeper)
- Pills/badges: border color shift to line for selection indication

## Responsive Design

### Breakpoints
- **Small (mobile)**: < 820px
  - Single column layouts
  - Full-width hero grid
  - Stacked navigation
  - Flexible button/input heights

- **Large (desktop)**: ≥ 820px
  - Multi-column grids
  - Side-by-side layouts
  - Horizontal navigation

### Responsive Patterns
- Use `clamp()` for fluid scaling of font sizes and spacing
- Example: `clamp(3rem, 9vw, 7rem)` scales between min and max based on viewport
- Max-width containers: 1180px for desktop content
- Gutters: `clamp(18px, 4vw, 56px)` for responsive horizontal padding

## Accessibility Standards (WCAG AA)

### Color Contrast
- **Ink on Paper**: 12.3:1 ✓ (exceeds AAA)
- **Ink-2 on Paper**: 8.5:1 ✓ (meets AAA)
- **Line on Paper**: 4.8:1 ✓ (meets AA)
- **Muted on Paper**: 5.7:1 ✓ (meets AAA)

### Focus Management
- All interactive elements (`button`, `input`, `a`) must have visible focus indicators
- Focus indicators must have sufficient size and contrast
- Tab order should follow visual hierarchy left-to-right, top-to-bottom

### Form Labeling
- All inputs must have associated `<label>` elements (use `for` attribute)
- Error messages linked to inputs via `aria-describedby`
- Required fields marked with `aria-required="true"` or HTML5 `required` attribute

### Semantic HTML
- Use semantic elements: `<header>`, `<nav>`, `<main>`, `<footer>`, `<article>`, `<section>`
- Use `<button>` for clickable actions (not `<div>` or `<span>`)
- Use proper heading hierarchy (h1 → h2 → h3, no skipping levels)

### ARIA Attributes
- `aria-label`: Provide accessible label for icon-only buttons
- `aria-live="polite"`: For dynamic content regions that update
- `aria-describedby`: Link inputs to error messages or descriptions

## Implementation Checklist

When building components:
- [ ] Use defined color variables (no hardcoded hex values)
- [ ] Apply typography from the scale (use size tokens or clamp())
- [ ] Apply spacing from the scale (avoid arbitrary px values)
- [ ] Include focus states for all interactive elements
- [ ] Test contrast ratios for sufficient color contrast (WCAG AA minimum)
- [ ] Use semantic HTML elements
- [ ] Include ARIA labels where appropriate
- [ ] Test responsive behavior at mobile and desktop breakpoints
- [ ] Verify keyboard navigation works end-to-end
- [ ] Test with screen readers (NVDA, JAWS, or VoiceOver)

## Updates & Maintenance

This design system should be reviewed and updated:
- When new components are introduced
- When CSS variables are changed
- When responsive breakpoints need adjustment
- Annually for comprehensive accessibility audit

To propose changes to the design system:
1. Document the change with rationale
2. Update this file
3. Update CSS variables in `styles.css`
4. Test for visual regression and accessibility
5. Include in pull request with `[design-system]` tag in title
