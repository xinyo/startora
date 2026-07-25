---
name: Startora
description: A clean, modern dashboard for managing applications and deployments.
colors:
  primary: "#7F56D9"
  secondary: "#737373"
  tertiary: "#42307D"
  neutral: "#FAFAFA"
typography:
  display-2xl:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  display-xl:
    fontFamily: Inter
    fontSize: 60px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  display-md:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.27
  display-xs:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.33
  xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.5
  lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.56
  md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  3xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
---

## Overview

Startora is a clean, modern dashboard interface for managing applications.
The UI follows a restrained, high-contrast design language — crisp white
surfaces grounded by deep near-black text and punctuated with a vibrant
purple brand accent. The aesthetic is professional and focused, emphasizing
clarity and usability over decoration.

## Colors

The palette is built on a monochromatic neutral foundation with a single
vibrant purple accent for brand identity and interactive elements.

- **Primary (#7F56D9):** A vivid purple used exclusively for primary actions,
  brand identity, focus rings, and interactive highlights. It provides a
  confident, modern presence without overwhelming the interface.
- **Secondary (#737373):** A balanced mid-gray for secondary text, captions,
  borders, and metadata. It recedes visually to let content and actions
  take precedence.
- **Tertiary (#42307D):** A deep, grounded purple derived from the primary.
  Used for text on brand backgrounds and hover states to maintain
  readability while staying within the brand family.
- **Neutral (#FAFAFA):** A soft off-white foundation for page backgrounds.
  Warmer than pure white, it reduces eye strain during prolonged use while
  keeping the interface feeling light and airy.

## Typography

Startora uses Inter as its single typeface across all levels, relying on
weight and size variations to establish hierarchy.

- **Display:** Inter Bold at 24–72 px for page titles and hero sections.
  Tight letter-spacing (-0.02em) at larger sizes reinforces a polished,
  modern feel.
- **Headlines:** Inter Semi-Bold at 20 px for section headings,
  balancing prominence with readability.
- **Body:** Inter Regular at 14–18 px for content and form controls.
  The 16 px base size ensures comfortable long-form reading.
- **Labels:** Inter Regular at 12 px for captions, metadata, and
  supporting text. Compact but legible.

## Layout

The layout follows a **Fixed-Max-Width** model with a maximum container
width of 1280 px, centered on the viewport. A strict 4 px base spacing
unit (with 8 px, 16 px, 24 px, 32 px, 48 px, and 64 px steps) maintains
consistent vertical and horizontal rhythm. Components are grouped with
generous internal padding, and the overall structure prioritizes
scan-ability for data-dense dashboard views.

## Shapes

Startora uses a progressive rounded corner scale. Interactive elements
like buttons and inputs use moderate rounding (4–8 px) to feel approachable
without appearing soft. Cards and containers use slightly larger radii
(12–16 px). The system avoids fully circular shapes except for avatars
and badges (9999 px). The result is clean, structured, and modern.

## Components

### Buttons

Buttons use the primary purple fill for default and primary actions, with
hover states shifting to the deeper tertiary purple. Secondary and ghost
variants use neutral backgrounds and borders. All buttons use a base
`lg` rounded corner (8 px) with consistent internal padding matched to
their size variant (xs through xl).

- **Sizes:** xs, sm, md, lg, xl
- **Variants:** solid (primary), outline (secondary), ghost (tertiary)
- **States:** default, hover, focus-visible, active, disabled

### Input Fields

Inputs use a light neutral background with a subtle border. Focus states
use the brand purple ring. Labels sit above the input in body-sm size.
Error states use a dedicated red border and helper text.

### Tags & Chips

Tags use neutral backgrounds with secondary text. Interactive chips
(chosen/selected) use the brand purple as a subtle background wash
with primary text.

## Do's and Don'ts

- Do use the primary purple only for the single most important action per screen.
- Don't mix multiple accent colors; rely on the neutral scale for differentiation.
- Do maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
- Don't use more than two font weights on a single screen.
- Do use the spacing scale consistently; avoid arbitrary pixel values.
- Don't nest interactive elements within each other (e.g., button inside a link).
