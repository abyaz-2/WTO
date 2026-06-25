---

name: "WTO Launch Platform"
version: "1.0"

colors:
background:
primary: "#05162D"
secondary: "#0B2345"
elevated: "#112F5A"

text:
primary: "#FFFFFF"
secondary: "#B6C3D1"
muted: "#7D8DA0"

accent:
primary: "#1E6FE8"
secondary: "#6CA9FF"

border:
subtle: "rgba(255,255,255,0.08)"
strong: "rgba(255,255,255,0.16)"

typography:
display:
fontFamily: "Sora"
fontWeight: 800

heading:
fontFamily: "Sora"
fontWeight: 700

body:
fontFamily: "Inter"
fontWeight: 400

spacing:
xs: "8px"
sm: "16px"
md: "24px"
lg: "40px"
xl: "64px"
xxl: "96px"

radius:
sm: "8px"
md: "12px"
lg: "20px"

motion:
fast: "200ms"
medium: "400ms"
slow: "800ms"

layout:
maxWidth: "1440px"
contentWidth: "1200px"
sectionHeight: "100vh"
----------------------

# Design Intent

Create a premium WTO-inspired digital experience centered around global connectivity, trade, diplomacy, cooperation, and economic movement.

The visual language should feel institutional rather than corporate.

Reference organizations:

* World Trade Organization
* United Nations
* World Economic Forum
* International Monetary Fund
* Financial Times Interactive
* Bloomberg Graphics

The website should communicate authority before innovation.

Technology should feel invisible.

Motion should feel purposeful.

---

# Brand Personality

## Core Traits

* Global
* Diplomatic
* Authoritative
* Intelligent
* Structured
* Trustworthy
* Modern

## Avoid

* Startup aesthetics
* Tech-bro design trends
* Cryptocurrency visuals
* Neon futurism
* Gaming-inspired interfaces
* Excessive glassmorphism
* Excessive gradients

---

# Typography

## Primary Typeface

Sora

Reason:

Most websites use Inter, Geist, SF Pro, or Poppins.

Sora provides stronger geometric forms while maintaining readability.

It feels modern without appearing trendy.

It creates a stronger institutional presence than typical startup fonts.

---

## Type Hierarchy

### Display

Used for:

* Coming Soon
* Hero Headlines
* Major Statements

Properties:

* Weight: 800
* Letter spacing: -0.04em
* Line height: 0.95

Never exceed two lines.

---

### Heading

Used for:

* Section titles
* Large statements

Properties:

* Weight: 700
* Tight tracking
* High contrast

---

### Body

Used for:

* Supporting content
* Small descriptions

Properties:

* Weight: 400
* Comfortable spacing
* Maximum readability

---

# Layout System

## Philosophy

The layout should feel spacious.

Negative space is a design element.

Do not fill empty areas simply because space exists.

Large margins create perceived authority.

---

## Container Rules

Desktop:

1200px max content width

Large Screens:

1440px visual width

Mobile:

24px side padding minimum

Tablet:

48px side padding minimum

---

## Vertical Rhythm

All spacing must derive from the spacing scale.

Never introduce arbitrary spacing values.

Examples:

24px
40px
64px
96px

Avoid:

29px
51px
73px

---

# Visual Language

## Primary Visual Motif

Global trade networks.

Repeated visual elements:

* Geographic grids
* Latitude lines
* Longitude lines
* Connection paths
* Trade routes
* International corridors
* Data streams

The visual identity should consistently reinforce movement between regions.

---

## World Representation

Use abstraction.

Do not use realistic satellite imagery.

Prefer:

* Wireframes
* Vector maps
* Dot networks
* Arc connections
* Particle paths

This creates a timeless appearance.

---

# Motion Design

## Motion Philosophy

Everything should move.

Nothing should distract.

Users should feel movement before they consciously notice animation.

---

## Motion Characteristics

Movement should be:

* Smooth
* Continuous
* Predictable
* Slow

Avoid:

* Bounce
* Elastic effects
* Aggressive easing
* Sudden acceleration

Preferred easing:

ease-out
ease-in-out

---

## Scroll Behavior

Scrolling must feel cinematic.

Sections should transition naturally.

Users should feel as though they are travelling through one continuous environment.

Never create abrupt visual jumps between sections.

---

## Parallax Rules

Every major section should contain:

Background Layer

Midground Layer

Foreground Layer

Each layer moves independently.

Movement speed should increase as layers approach the user.

Example:

Background = 0.3x

Midground = 0.6x

Foreground = 1x

---

# Components

## Buttons

Appearance:

* Solid fill
* Medium radius
* Strong contrast

Primary button uses accent color.

Secondary button uses transparent background and border.

Avoid:

* Gradient buttons
* Pill buttons
* Floating action buttons

---

## Cards

Cards should be rare.

Use only when information requires containment.

Style:

* Subtle border
* Dark surface
* Minimal shadow

Avoid large elevation differences.

---

## Navigation

Navigation should be minimal.

Maximum items:

5

Visual weight should remain lower than page content.

Navigation exists to guide.

It should never dominate.

---

# Accessibility

Minimum contrast ratio:

4.5:1

Interactive elements must have visible focus states.

Reduced motion preference must be respected.

When reduced motion is enabled:

* Disable parallax
* Disable camera movement
* Retain fade transitions only

---

# Performance Standards

Target:

60 FPS

Lighthouse:

* Performance > 90
* Accessibility > 90
* Best Practices > 90
* SEO > 90

Avoid:

* Uncompressed assets
* Heavy textures
* Large video backgrounds

---

# Implementation Guidance

Preferred Stack:

* Next.js
* TypeScript
* TailwindCSS
* GSAP
* ScrollTrigger
* Framer Motion
* Three.js
* React Three Fiber

Animations should be GPU accelerated whenever possible.

Use transform and opacity instead of layout-shifting properties.

Avoid unnecessary re-renders during scroll interactions.

---

# Do

* Prioritize hierarchy
* Use large typography
* Use generous spacing
* Use smooth motion
* Maintain visual consistency
* Preserve institutional credibility

# Do Not

* Add decorative elements without purpose
* Use multiple accent colors
* Use trendy effects for attention
* Create crowded layouts
* Overuse animations
* Break spacing scale
* Mix more than two font families

---

# Success Criteria

The final experience should feel like the digital presence of a major international organization preparing to unveil an important global initiative.

Users should immediately associate the experience with:

* International cooperation
* Global trade
* Economic movement
* Institutional authority
* Long-term credibility

Every design decision should reinforce those associations.
