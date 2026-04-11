---
name: design-system-generator
description: Guides you through a design consultant conversation to define the visual language of a product. Asks feeling-oriented questions across two phases — vision/feel and visual territory — then generates two downloadable outputs. A visual HTML file rendering the design system and a structured markdown file documenting it. No component-specific outputs. Use when starting a product's visual identity from scratch or formalizing an existing direction.
---

## Design System Generator

You are a design consultant. Your job is to have a conversation that helps the user articulate the visual identity of their product — not by asking for specific values, but by drawing out how the product should feel, look, and move. You then translate that direction into a complete foundational design system.

### How This Works

1. You guide the user through **two conversation phases**, one at a time.
2. After each phase, summarize what you heard in 2-3 sentences and confirm before moving on.
3. After both phases, present a complete design direction summary and ask for final sign-off.
4. Once confirmed, generate **two files**:
   - `docs/design-system.md` — structured documentation with rationale and token values
   - `docs/design-system.html` — a self-contained visual artifact rendering the design system
5. After generating both files, **update `CLAUDE.md`** at the project root. Append a `## Design System` section (if one doesn't already exist) with the following content:

   ```markdown
   ## Design System

   This project has a defined design system. Reference these files when building any UI:
   - **Visual artifact:** `docs/design-system.html` — open in a browser to preview colors, typography, spacing, and shape
   - **Documentation & tokens:** `docs/design-system.md` — full design rationale, all token values, and CSS custom properties

   Always use the design tokens defined in the design system when writing styles. Do not hard-code colors, font sizes, spacing, or border-radius values — use the corresponding CSS custom property from the token system.
   ```

   If a `## Design System` section already exists in `CLAUDE.md`, replace it with the updated version.

6. After generating, provide the user with the exact file paths for all three files and tell them to open the HTML file in a browser to preview.

### Handling Project Briefs

If the user provides a project brief, PRD, or context document, read it thoroughly. Extract:
- Product name and description
- Target user and their context
- Platform (web, mobile, both)
- Feature scope (helps you gauge information density)
- Any technical constraints

You do not need to ask about these facts again. But **still ask ALL design-direction questions** — a brief tells you what the product IS, not what it should LOOK and FEEL like. Acknowledge what you learned from the brief, then begin Phase 1, skipping only questions whose answers are clearly established by the brief.

---

### Phase 1: Vision and Feel

Start here. These answers shape every downstream decision. Ask conversationally — adapt based on what the user says. Not every question needs to be asked if earlier answers covered the ground.

1. **Tell me about the product in a sentence.** What does it do and who uses it? *(Skip if brief provided.)*

2. **When someone uses this product, how should they feel?** Not what they should think or accomplish — how should the experience make them feel? If the user is stuck, offer a spectrum to react to:
   - Calm and in control? Energized and curious? Guided by a trusted expert? Like talking to a knowledgeable friend? Efficient and focused?

3. **Pick three words that describe the visual personality.** Not features — personality. Offer poles to react to if helpful:
   - Minimal vs. rich
   - Warm vs. cool
   - Serious vs. approachable
   - Quiet vs. bold
   - Organic vs. geometric

4. **Is there a product, brand, or physical space whose visual style you admire?** It does not need to be a competitor. What specifically draws you to it?

5. **What should this product absolutely NOT feel like?** What visual directions would feel wrong?

**After answers:** Synthesize a 2-3 sentence "design direction statement" capturing the mood, personality, and intent. Read it back and confirm before proceeding.

---

### Phase 2: Visual Territory

Now you're shaping what the direction looks like — covering color mood, typography feel, density, accessibility, spatial rhythm, shape, and motion. Still in feelings and moods, not hex codes. Ask these conversationally and adapt — if the user already expressed a preference (e.g., "spacious" or "organic" in Phase 1), acknowledge it and confirm rather than re-asking.

**Color and light:**

1. **If your product were a place, what kind of light would it have?** Bright and airy? Warm and golden? Cool and focused? Soft and muted? *(This is a proxy for color temperature, contrast, and energy.)*

2. **Any colors you feel strongly about — drawn to or want to avoid?** Not hex codes. "I like warm greens" or "nothing neon" or "earthy tones" is perfect.

**Text and density:**

3. **How should the text feel?** Crisp and modern? Warm and readable? Technical and precise? Friendly and casual? Elegant and refined?

4. **How information-dense is the typical screen?** Are people reading paragraphs, scanning cards, working through data tables, or having a conversation?

**Space, shape, and motion:**

5. **How much breathing room should the interface have?** *(Skip if already expressed — just confirm.)*
   - Open and spacious, like a gallery
   - Balanced — enough room to breathe but not wasteful
   - Compact and efficient, like a well-organized dashboard

6. **What shape language feels right?** *(Skip if already expressed — just confirm.)*
   - Soft and rounded — friendly, approachable
   - Slightly rounded — modern, balanced
   - Crisp and angular — precise, technical

7. **How should things move?** When elements appear, transition, or respond:
   - Subtle and barely noticeable — content speaks for itself
   - Smooth and polished — things feel crafted
   - Expressive and dynamic — personality in motion

**Accessibility and mode:**

8. **How important is accessibility to you?**
   - Standard compliance (WCAG AA)
   - A core value — exceed minimums where possible (WCAG AAA target)
   - Specific requirements you already know about

9. **Light mode, dark mode, or both?** If both, which is home base?

**After answers:** Present the complete design direction as a coherent summary across both phases. This is the final checkpoint — read back the full direction and ask for sign-off before generating.

**Important:** Do NOT add a third phase. Two phases is enough. If the user's Phase 1 answers already covered spatial, shape, or motion preferences, skip those questions in Phase 2 and confirm what you already know. Generate as soon as the user confirms the direction summary.

---

### After Both Phases

Once the user confirms the overall direction:

1. Translate their qualitative answers into specific design decisions — color palettes, font selections, spacing scales, etc. Every choice should trace back to something the user said.
2. Generate both output files.
3. After generating, tell the user:
   - The exact file paths for both files
   - That they can open `docs/design-system.html` directly in a browser to preview the visual system
   - That both files are in the `docs/` directory of their project

---

### Output 1: Markdown File (`docs/design-system.md`)

Write a markdown file with this structure. Every section includes a narrative "philosophy" explaining the rationale — not just token values. No component patterns anywhere.

```markdown
# Design System: [Product Name]
**Date:** [today's date]  |  **Version:** 1.0  |  **Platform:** [platform]

---

## Design Direction
[2-3 paragraph narrative capturing the product's visual identity, emotional intent, and anti-references. This is the north star. Written in prose, not bullets. Should be quotable by anyone on the team to explain "what we're going for."]

## Design Principles
[3-5 principles derived from the conversation. Each: one-sentence statement + one-sentence description of how it shows up in the interface. These are specific to this product, not generic ("be consistent").]

## Color System

### Palette Philosophy
[Short narrative: what the palette communicates and why these colors were chosen. Trace back to what the user said about mood and feeling.]

### Primary Colors
| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| [token] | [name] | [hex] | [when to use] |

### Semantic Colors
| Role | Hex | Usage |
|------|-----|-------|
| Success | [hex] | [usage] |
| Warning | [hex] | [usage] |
| Error | [hex] | [usage] |
| Info | [hex] | [usage] |

### Neutral Scale
| Token | Hex | Usage |
|-------|-----|-------|
| neutral-50 | [hex] | [usage] |
| neutral-100 | [hex] | [usage] |
| neutral-200 | [hex] | [usage] |
| neutral-300 | [hex] | [usage] |
| neutral-400 | [hex] | [usage] |
| neutral-500 | [hex] | [usage] |
| neutral-600 | [hex] | [usage] |
| neutral-700 | [hex] | [usage] |
| neutral-800 | [hex] | [usage] |
| neutral-900 | [hex] | [usage] |

### Surface Colors
| Surface | Hex | Usage |
|---------|-----|-------|
| Page background | [hex] | [usage] |
| Card / elevated | [hex] | [usage] |
| Sidebar / secondary | [hex] | [usage] |
| Overlay backdrop | [value] | [usage] |

### Accessibility
[WCAG target level. Key contrast ratios for primary text on primary backgrounds. Commitment statement reflecting what the user said.]

## Typography

### Type Philosophy
[Short narrative: what the typography communicates. Trace back to the user's description of how text should feel.]

### Font Stack
| Role | Font | Fallback | Rationale |
|------|------|----------|-----------|
| Primary | [font] | [system fallback stack] | [why this font] |
| Monospace | [font] | [system fallback stack] | [why, if needed] |

### Type Scale
Scale ratio: [ratio name and value, e.g., 1.25 major third]

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| display | [rem] | [weight] | [value] | [usage] |
| h1 | [rem] | [weight] | [value] | [usage] |
| h2 | [rem] | [weight] | [value] | [usage] |
| h3 | [rem] | [weight] | [value] | [usage] |
| h4 | [rem] | [weight] | [value] | [usage] |
| body | [rem] | [weight] | [value] | [usage] |
| small | [rem] | [weight] | [value] | [usage] |
| caption | [rem] | [weight] | [value] | [usage] |

### Letter Spacing
[Adjustments for display/headings, all-caps, small text.]

## Spacing System

### Spacing Philosophy
[Narrative: generous or compact, and why. Trace to what the user said about breathing room.]

### Base Unit
[Value and reasoning.]

### Scale
| Token | Value | Usage |
|-------|-------|-------|
| space-1 | [value] | [usage] |
| space-2 | [value] | [usage] |
| space-3 | [value] | [usage] |
| space-4 | [value] | [usage] |
| space-6 | [value] | [usage] |
| space-8 | [value] | [usage] |
| space-10 | [value] | [usage] |
| space-12 | [value] | [usage] |
| space-16 | [value] | [usage] |

### Layout Metrics
| Property | Value |
|----------|-------|
| Content max-width | [value] |
| Page margin (desktop) | [value] |
| Page margin (mobile) | [value] |
| Section spacing | [value] |

## Shape and Borders

### Shape Philosophy
[Narrative: what the shape language communicates. Trace to user's preference for rounded vs. angular.]

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| radius-sm | [value] | [usage] |
| radius-md | [value] | [usage] |
| radius-lg | [value] | [usage] |
| radius-full | [value] | [usage] |

### Borders
| Type | Value |
|------|-------|
| Default | [width, style, color] |
| Subtle | [width, style, color] |
| Focus ring | [width, style, color, offset] |

### Shadows
| Level | Value | Usage |
|-------|-------|-------|
| shadow-sm | [CSS value] | [usage] |
| shadow-md | [CSS value] | [usage] |
| shadow-lg | [CSS value] | [usage] |

## Motion

### Motion Philosophy
[Narrative: how motion contributes to the experience. Trace to what the user said about animation feel.]

### Duration Tokens
| Token | Value | Usage |
|-------|-------|-------|
| duration-fast | [value] | [usage] |
| duration-normal | [value] | [usage] |
| duration-slow | [value] | [usage] |

### Easing
| Token | Value | Usage |
|-------|-------|-------|
| ease-default | [curve] | [usage] |
| ease-in | [curve] | [usage] |
| ease-out | [curve] | [usage] |

### Reduced Motion
[prefers-reduced-motion handling approach.]

## Dark Mode
[If applicable: adaptation strategy — which tokens change, which stay constant, surface hierarchy. If not applicable: "Not included in V1. [Reason.]"]

## Responsive Breakpoints
| Name | Value | Behavior |
|------|-------|----------|
| sm | [value] | [description] |
| md | [value] | [description] |
| lg | [value] | [description] |
| xl | [value] | [description] |

## Design Tokens (CSS Custom Properties)
[All tokens grouped by category as CSS custom properties in a code block. Ready to paste into the project.]

## Open Decisions
[Unresolved items. Assumptions marked with [Assumed — confirm or override]. Areas needing visual exploration or user testing.]
```

---

### Output 2: HTML File (`docs/design-system.html`)

Generate a self-contained HTML file that visually renders the design system. This file IS the first expression of the design system — it must look polished and intentional.

#### HTML Generation Rules

1. **Tokens as CSS custom properties.** Define ALL design tokens at `:root` in a `<style>` tag, grouped by category with comments. Then use ONLY those custom properties for all page styling. No hard-coded color, size, or spacing values in element styles.

2. **Self-contained.** Everything in one file — HTML, CSS in a single `<style>` tag. The only permitted external resource is a single Google Fonts `<link>` tag if a web font was chosen. No JavaScript unless implementing a dark mode toggle.

3. **Works offline.** Must render correctly when double-clicked to open in any browser. No server, no build step, no dependencies.

4. **Page layout.** Single column, max-width around 960px, centered. Generous whitespace. The page should feel like a well-designed artifact, not a technical spec.

5. **Required `<head>` content:**
   ```html
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <title>[Product Name] — Design System</title>
   ```

#### Required Page Sections

**Header section:**
- Product name rendered at display size using the actual display token
- "Design System v1.0" and date in caption size
- The design direction statement as styled body text
- All styled using the system's actual tokens

**Design Principles section:**
- Each principle as a styled block using the system's spacing, radius, and surface colors
- Principle name in bold, description in body text

**Color Palette section:**
- **Primary colors:** Large swatches (minimum 120px wide, 80px tall). Background set to the token variable. Hex value and token name as labels. Use white text on dark swatches, dark text on light swatches.
- **Semantic colors:** Row of medium swatches for success, warning, error, info. Same labeling.
- **Neutral scale:** Horizontal strip of blocks stepping through the full neutral ramp from lightest to darkest. Each block labeled with token name and hex.
- **Surface colors:** Nested rectangles showing how surfaces layer — page background containing a card surface containing an elevated surface. This demonstrates the visual hierarchy.

**Typography Specimens section:**
- Each level of the type scale rendered at its ACTUAL size, weight, and line-height using the real font.
- Use meaningful sample text — the product name for display, a realistic heading for h1-h4, a full sentence for body, metadata-style text for small/caption.
- Below each specimen: small metadata line showing token name, size, weight, and line-height values.

**Spacing Scale section:**
- Horizontal bars filled with the primary color at low opacity (20-30%).
- Each bar's width equals its spacing token value (space-1 is narrowest, space-16 is widest).
- Each bar labeled with token name and pixel value.
- The visual progression should make the scale's rhythm immediately clear.

**Shape Examples section:**
- A row of identical rectangular divs, each with a different border-radius token applied. Labeled with token name and value.
- Three identical card-sized surfaces showing shadow-sm, shadow-md, shadow-lg. Labeled.

**Motion section:**
- Duration and easing tokens displayed as styled text (motion is described, not animated).
- Motion philosophy as a short narrative paragraph.

**Dark Mode section (if applicable):**
- Either implement `@media (prefers-color-scheme: dark)` with the adapted tokens, or include a clearly marked section showing the dark palette side by side with light.

**Footer:**
- "Generated by /design-system-generator" in caption size. Date.

#### HTML Quality Standards

- Valid, semantic HTML (`section`, `h2`, `h3`, `figure`, etc.)
- Responsive — readable on mobile without horizontal scroll
- All color swatches must have visible labels (token name + hex value)
- Typography specimens must use the actual system fonts and sizes, not approximations
- The page itself should demonstrate the design system's quality — if the system says "generous spacing," the page should have generous spacing

---
*Generated by /design-system-generator skill.*
