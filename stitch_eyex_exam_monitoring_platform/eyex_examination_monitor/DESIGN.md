---
name: EyeX Examination Monitor
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#466083'
  on-secondary: '#ffffff'
  secondary-container: '#bbd6ff'
  on-secondary-container: '#435d80'
  tertiary: '#004870'
  on-tertiary: '#ffffff'
  tertiary-container: '#006194'
  on-tertiary-container: '#b2d9ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#aec8f0'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#2d486a'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-code-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.05em
  label-code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-integrity, secure, and modern educational supervision platform tailored for Anglophone Cameroon Secondary Schools and institutional examination bodies (such as the GCE Board). It balances the authoritative gravitas of institutional governance with the streamlined responsiveness of modern cloud infrastructure.

### Aesthetic Movement: Institutional Modernism
The platform adopts an institutional modern aesthetic—a fusion of rigorous administrative structure and frictionless EdTech clarity. It avoids visual clutter, heavy ornamental gradients, and frivolous interactions, prioritizing clarity under high-stakes, time-sensitive examination conditions.

### Emotional Response & Principles
- **Vigilance & Trust:** Administrative personnel, invigilators, and regional inspectors experience unambiguous visibility into examination session integrity, candidate verification, and malpractice telemetry.
- **Calm Authority:** Under high-pressure exam cycles, pure white canvases and serene light blue surfaces curb cognitive fatigue and systemic panic.
- **Operational Precision:** High contrast, legible tabular hierarchies, and distinct status indicators ensure rapid assessment without ambiguity.

## Colors

The palette is engineered for prolonged viewing in variable classroom and administrative lighting across Cameroon examination centers, prioritizing high contrast and standardized administrative clarity.

### Primary & Brand Colors
- **Canvas Base (`#FFFFFF`):** Dominant pure white background for core content panes and modal sheets.
- **Surface Tint (`#F8FBFF`):** Ultra-pale blue used across page backdrops, table alt-striping, and nested panel containers.
- **Primary Action Blue (`#1D4ED8`):** Direct action vector for critical submissions, invigilator confirmations, and primary controls.
- **Institutional Navy (`#0B2A4A`):** Anchors high-priority headers, top-tier administrative framing, and high-contrast structural text.
- **Accent Highlight (`#EFF6FF`):** Soft active state highlights, hover fills, and subtle focus backdrops.
- **Structural Border (`#D6E4F0`):** Precise dividing lines for metrics cards, tabular data, and module perimeters.

### Functional Status System
- **Normal / Verified (`#16A34A`):** Valid candidate registration, confirmed check-in, verified biometric match.
- **Attention / Warning (`#F59E0B`):** Bandwidth degradation, late entry grace period, pending verification.
- **Critical / Flagged (`#DC2626`):** Malpractice flag, unauthorized device detection, session interruption.
- **Informational / Telemetry (`#0284C7`):** Active network ping, proctor sync status, room temperature or device telemetry.

## Typography

The typographic hierarchy implements three coordinated typefaces tailored for complex administrative and verification workflows:

- **Display & Section Headers (Plus Jakarta Sans):** Provides clean structural presence. The gentle geometric curves maintain approachability while asserting administrative clarity for center rosters, candidate names, and examination subject titles.
- **System Interface & Body (Inter):** Serves as the primary workhorse for tables, instructions, telemetry charts, and dialog interactions. Highly readable at compact resolutions on standard institutional monitors.
- **Monospaced Identifiers (JetBrains Mono):** Dedicated to critical data vectors—Candidate Index Numbers (e.g., `GCE-2025-SW04-0982`), Paper Session Access Codes, Session Countdowns, and Network Telemetry IDs. Ensures instant legibility without character confusion (e.g., differentiating `0` and `O`, `1` and `l`).

## Layout & Spacing

The layout operates on a disciplined 8pt baseline rhythm within a fluid grid framework designed to scale from tablet invigilation devices to high-resolution desktop control consoles.

### Grid Framework
- **Desktop (12 Columns):** Applied for regional monitoring dashboards and multi-hall oversight screens. 24px margins, 20px gutters. Standard card spans: 3 columns (metrics/stats), 4 columns (candidate identity feeds), 8 columns (hall map & video streams), 12 columns (tabular logs).
- **Tablet (8 Columns):** Tailored for roaming invigilators and hall supervisors. 16px margins, 16px gutters.
- **Mobile Handheld (4 Columns):** Optimized for center entrance biometric verification and fast QR scans. 16px margins, 12px gutters.

### Spacing Application
- Component internal padding uses strict multiples: `space-xs` (4px) for badge internals, `space-sm` (8px) for input padding and list rows, `space-md` (16px) for standard card padding, and `space-lg` (24px) for major modal and section offsets.

## Elevation & Depth

To preserve an institutional, technical demeanor, the platform minimizes dramatic blur or float effects in favor of structured planar stratification:

- **Surface Tiers:** Depth is established through subtle contrasting planes. Backgrounds sit at `#F8FBFF`, while active monitoring cards and panels exist at `#FFFFFF` bounded by 1px borders in `#D6E4F0`.
- **Restrained Elevation:**
  - **Flat Tier (Cards & Grid Units):** 0px offset, 0px blur, 1px structural border (`#D6E4F0`).
  - **Elevated Hover Tier (Interactive Candidates/Rows):** `0 2px 4px -1px rgba(11, 42, 74, 0.04), 0 4px 6px -1px rgba(11, 42, 74, 0.06)`, keeping focus tactile without visual noise.
  - **Floating Overlay Tier (Modals, Biometric Prompts, Alert Sheets):** `0 10px 15px -3px rgba(11, 42, 74, 0.08), 0 4px 6px -2px rgba(11, 42, 74, 0.03)` with a solid 1px `#D6E4F0` boundary.
- **Scrim Backdrop:** Fixed overlays utilize `#0B2A4A` at 40% opacity with a subtle 2px blur to focus invigilator intervention immediately on prompt tasks.

## Shapes

The interface embraces a structured, utilitarian profile (`roundedness: 1`), signaling security, discipline, and systematic organization:

- **Base Radius (0.25rem / 4px):** Applied to form inputs, verification status tags, Candidate Index pills, and data table check triggers.
- **Container Radius (`rounded-lg` - 0.5rem / 8px):** Applied to examination cards, video stream tiles, telemetry modules, and action dialogues.
- **Maximum Enclosure (`rounded-xl` - 0.75rem / 12px):** Reserved exclusively for root-level view containers and primary modal viewports.
- **Pure Pills (9999px):** Applied solely to session progress badges (e.g., "LIVE SESSION", "AWAITING MATERIALS") and candidate biometric confirmation markers.

## Components

### Buttons
- **Primary Administrative Action:** Solid `#1D4ED8` background, `#FFFFFF` text, 4px border radius. Hover: `#1E40AF`. Active: `#1E3A8A`. Internal padding: 8px 16px. Font: Inter Medium 14px.
- **Secondary / Action Support:** `#EFF6FF` background, `#1D4ED8` text, 1px `#D6E4F0` border.
- **Destructive / Flag Action:** `#DC2626` background, `#FFFFFF` text. Used for "Report Irregularity" or "Disqualify Candidate".

### Status Chips & Verification Pills
- Constructed with `space-xs` vertical and `space-sm` horizontal padding.
- **Verified:** `#DCFCE7` background, `#16A34A` text, 1px `#86EFAC` border.
- **Flagged:** `#FEE2E2` background, `#DC2626` text, 1px `#FCA5A5` border.
- **Pending/Grace:** `#FEF3C7` background, `#D97706` text, 1px `#FCD34D` border.
- Always display a 6px circular solid status dot preceding the uppercase label.

### Data Tables (Candidate Rosters & Audit Logs)
- Header row styled in `#F8FBFF` with `#0B2A4A` uppercase 11px micro-copy, tracking 0.05em.
- Row heights standardized at 48px to allow fast scanning while remaining touch-target safe for mobile tablets.
- Row divider: 1px solid `#D6E4F0`. Alternating zebra striping utilizes pure white and `#F8FBFF`.

### Input Fields & Identity Scanners
- Background `#FFFFFF`, 1px border `#D6E4F0`. Font: Inter 14px.
- Focused state: 1px border `#1D4ED8` accompanied by a 2px outer halo of `#EFF6FF`.
- Candidate ID Search fields format text directly into `JetBrains Mono` with automatic hyphenation.

### Verification Cards
- White surface `#FFFFFF` bounded by a 1px `#D6E4F0` perimeter.
- Top banner indicates exam room / hall designation (e.g., "Bilingual Grammar School Molyko - Hall 02").
- Left accent rail: 4px vertical bar colored dynamically according to center connection health (Green, Amber, or Red).
- Contains candidate biometric thumbnail, registered center subject codes, and monospace seating placement indicators.

### Session Timer Display
- Prominently anchored module using an `#0B2A4A` high-contrast background with `#FFFFFF` and `#38BDF8` JetBrains Mono typography for real-time exam countdowns, warning thresholds (last 15 minutes), and automatic script-collection synchronization locks.