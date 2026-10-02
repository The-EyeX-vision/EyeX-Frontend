# EyeX Platform — Frontend Design Tokens & Asset Specification
**Target Audience:** Frontend Engineering Team, UI Developers & Mobile/Terminal Engineers  
**System Version:** v1.0.0 (Clean White & Blue Edition — Anglophone Cameroon Secondary Schools)  
**Primary Font:** `Plus Jakarta Sans`, sans-serif | Monospace: `JetBrains Mono` / `ui-monospace`

---

## 1. Executive Summary & Design Principles

The EyeX platform UI is engineered for high-stakes secondary school examination monitoring across Anglophone Cameroon (MINESEC and Cameroon GCE Board accredited centers).
The interface maintains:
- **Calm, Authoritative Visuals:** Avoiding aggressive alarmism while delivering clear, high-contrast signals for invigilators and exam officers.
- **Generous Whitespace & Information Rhythm:** Clear 8px base grid rhythm to prevent cognitive fatigue during multi-hour exam sessions.
- **Tamper-Evident Status Communication:** Distinct semantic color mappings for audit clearance, flagged evidence, and offline/network sync states.

---

## 2. Color Palette & Token Architecture

All tokens are organized by category and map directly to CSS custom properties / Tailwind CSS configuration tokens.

### 2.1 Primary & Brand Colors (MINESEC Blue)
The core brand signature represents institutional trust, state governance, and cryptographic precision.

| Token Name | Hex Value | RGB / HSL | Usage Description |
|---|---|---|---|
| `--color-primary-900` | `#0f2963` | `rgb(15, 41, 99)` | Heavy brand text, deep contrast headers |
| `--color-primary-800` | `#173a8f` | `rgb(23, 58, 143)` | Active sidebar / tab active state backgrounds |
| `--color-primary-700` | `#1d4ed8` | `rgb(29, 78, 216)` | **Core Brand Primary**: Primary CTA buttons, key active icons, key outlines |
| `--color-primary-600` | `#2563eb` | `rgb(37, 99, 235)` | Interactive hover state for primary buttons |
| `--color-primary-500` | `#3b82f6` | `rgb(59, 130, 246)` | Focus rings, focus outlines, secondary links |
| `--color-primary-200` | `#bfdbfe` | `rgb(191, 219, 254)`| Subtle borders on selected cards, grid desk selection |
| `--color-primary-100` | `#dbeafe` | `rgb(219, 234, 254)`| Light blue pill tags (e.g. subject codes, active seat badges) |
| `--color-primary-50`  | `#eff6ff` | `rgb(239, 246, 255)`| Active table row tint, info callout background |

### 2.2 Surface, Background & Structural Neutral Colors
Clean white and soft cool blues provide an uncluttered, high-legibility canvas that minimizes glare during full-day invigilation sessions.

| Token Name | Hex Value | Usage Description |
|---|---|---|
| `--color-surface-bg` | `#f8f9ff` | Root application background across all dashboard pages |
| `--color-surface-card` | `#ffffff` | Primary container background (cards, tables, modals) |
| `--color-surface-elevated` | `#ffffff` | Dropdowns, popovers, tooltips (with elevation shadow) |
| `--color-surface-dim` | `#eff4ff` | Secondary card fills, sidebar hover fills, inactive tab bars |
| `--color-surface-subtle` | `#f1f5f9` | Disabled inputs, read-only token displays, table headers |
| `--color-border-subtle` | `#e2e8f0` | Standard divider lines, table cell bottom borders |
| `--color-border-card` | `#e0e7ff` | Crisp card borders with slight cool-blue hue |
| `--color-border-focused`| `#1d4ed8` | 2px focused input or active matrix desk outline |

### 2.3 Semantic & Functional Colors (Audit, Flags & Telemetry)

#### A. Integrity & Clearance (Verified Safe / Success)
Used for biometric match confirmed, clear candidates, in-sync telemetry, and verified paper custody seals.
- **Text / Icon:** `#15803d` (`green-700`)
- **Interactive / Dot:** `#16a34a` (`green-600`)
- **Badge Fill:** `#f0fdf4` (`green-50`)
- **Badge Border:** `#bbf7d0` (`green-200`)

#### B. Active Telemetry & Real-Time Sync (Live / Online)
Used for online hall nodes, live RTSP camera feeds, and real-time heartbeat indicators.
- **Text / Icon:** `#0284c7` (`sky-600`) or `#0d9488` (`teal-600`)
- **Live Pulse Dot:** `#059669` (`emerald-600`) with CSS radar ping animation
- **Badge Fill:** `#ecfdf5` (`emerald-50`)
- **Badge Border:** `#a7f3d0` (`emerald-200`)

#### C. Malpractice Alert & Critical Incident (Flagged / Emergency)
Used for AI-detected cellular devices, unauthorized materials, impounded items, and the top-level Emergency Protocol banner.
- **Text / Icon:** `#b91c1c` (`red-700`)
- **Badge Fill:** `#fef2f2` (`red-50`)
- **Badge Border:** `#fecaca` (`red-200`)
- **Emergency Button Fill:** `#dc2626` (`red-600`) / Hover: `#b91c1c` (`red-700`)
- **Seating Matrix Alert Desk Fill:** `#dc2626` text with `#fee2e2` background

#### D. Review Pending & Warning (Under Examination / In Grace Period)
Used for candidate identity review, pending disciplinary hearing, or high camera packet latency.
- **Text / Icon:** `#b45309` (`amber-700`)
- **Badge Fill:** `#fffbeb` (`amber-50`)
- **Badge Border:** `#fde68a` (`amber-200`)

#### E. Neutral Status (Scheduled / Standby / Unoccupied)
- **Text / Icon:** `#475569` (`slate-600`)
- **Badge Fill:** `#f8fafc` (`slate-50`)
- **Badge Border:** `#cbd5e1` (`slate-300`)

### 2.4 Typography & Text Colors
| Token Name | Hex Value | Purpose |
|---|---|---|
| `--color-text-primary` | `#0f172a` (`slate-900`) | Main headlines, candidate names, primary values |
| `--color-text-secondary` | `#475569` (`slate-600`) | Section subheads, table secondary text, form hints |
| `--color-text-muted` | `#64748b` (`slate-500`) | Field labels, timestamps, audit footnote disclaimers |
| `--color-text-inverted` | `#ffffff` | Text on primary buttons, emergency banners, active badges |

---

## 3. Tailwind CSS Theme Config Snippet

Developers should integrate this palette into `tailwind.config.ts`:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        eyex: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8', // Main Brand
          800: '#173a8f',
          900: '#0f2963',
        },
        surface: {
          bg: '#f8f9ff',
          card: '#ffffff',
          dim: '#eff4ff',
          subtle: '#f1f5f9',
        },
        status: {
          success: { text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
          alert: { text: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
          warning: { text: '#b45309', bg: '#fffbeb', border: '#fde68a' },
          info: { text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card-subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'modal-elevated': '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
      }
    }
  }
}
```

---

## 4. Iconography System & Guidelines

### 4.1 Recommended Icon Library
- **Library:** **Lucide Icons** (`lucide-react` / `lucide-vue-next` / `@lucide/angular`)
- **Default Visual Attributes:**
  - `stroke-width`: `1.75px` (standard UI) / `2px` (status badges & micro-indicators)
  - `size`:
    - Micro (inside badges/tables): `14px` × `14px`
    - Standard UI (buttons, inputs, sub-items): `16px` × `16px`
    - Section / Card headers: `20px` × `20px`
    - Metric summary hero icons: `24px` × `24px` (contained in `40px` rounded container)

### 4.2 Comprehensive Icon Mapping Table by Module

| Functional Area | Lucide Icon Component | Visual Context & Usage on EyeX Screens |
|---|---|---|
| **Global Navigation** | | |
| Dashboard Overview | `<LayoutDashboard />` | Main navbar link to `/dashboard` |
| Live Monitoring Hub | `<Tv2 />` or `<Radio />` | Live multi-hall real-time streaming link |
| Exams & Sessions | `<CalendarDays />` | Examination schedule & master roster |
| Examination Halls | `<Building2 />` | Hall directory & classroom physical mapping |
| Students & Candidates | `<Users2 />` | Candidate directory & enrollment lists |
| Evidence & Violations | `<FileWarning />` or `<ShieldAlert />` | Malpractice dossier ledger & flagged items |
| Invigilator Code / Terminal | `<KeyRound />` | Fast-path 8-character access token portal |
| Station Settings | `<SlidersHorizontal />` | Institution profile & AI threshold setup |
| Emergency Protocol | `<AlertTriangle />` | Red high-priority protocol button on top bar |
| Profile / Chief Officer | `<UserCircle2 />` | Top right officer profile menu |
| **Hall & Room Infrastructure** | | |
| Physical Desks / Capacity | `<Armchair />` or `<Grid3X3 />` | Seating capacity metrics (e.g. "120 Desks") |
| Camera Stream (RTSP/WebRTC) | `<Video />` or `<Cctv />` | Dual-angle camera rigs (Front / Rear) |
| Add Auxiliary Camera | `<CameraPlus />` | Dashed card button for extra optical sensor |
| Camera Calibration | `<ScanEye />` | Field of view (FOV) recalibration modal |
| Dynamic 8-Char Code | `<KeySquare />` | Temporary hall passcode (`7K4P-92XM`) |
| Copy to Clipboard | `<Copy />` | One-click copy for passcodes and hashes |
| Print Invigilator Slip | `<Printer />` | Physical printout for hall invigilators |
| Floorplan Export | `<FileSpreadsheet />` | Batch export of hall seating plans |
| **Examination & Candidate Roster** | | |
| Subject / Exam Paper | `<GraduationCap />` | Mathematics, Physics, Chemistry cards |
| Time / Duration Timer | `<Clock />` or `<Hourglass />` | Remaining exam duration clock |
| Biometric Verification | `<Fingerprint />` | Biometric sync confirmed badge |
| Facial Match Status | `<ScanFace />` | 99.4% biometric facial validation score |
| Special Exemption | `<Accessibility />` | Extended time (+30m) or medical seating |
| Seating Matrix View | `<LayoutGrid />` | Interactive 6-column desk grid toggle |
| Attendance Roll Call | `<CheckSquare />` | Roll call list tab & verification count |
| Candidate Absent | `<UserX />` | Unoccupied desk slot in seating matrix |
| Candidate Seated | `<UserCheck />` | Verified seated candidate status |
| **Evidence & Integrity Protocol** | | |
| Cellular Device Flag | `<Smartphone />` | Phone detection bounding box marker |
| Paper / Cheat Slip Flag | `<FileText />` | Unauthorized notes / formula slips |
| Whisper / Audio Resonance | `<Mic />` or `<Volume2 />` | Ambient vocal pickup trigger |
| Gaze Deviation (>45°) | `<EyeOff />` | Sustained peer gaze deviation trigger |
| Seized Evidence Envelope | `<FolderArchive />` | Envelope reference (`#ENV-09`) vault log |
| Inspect Keyframe Frame | `<Eye />` | Modal trigger to view optical snapshot |
| Formal Malpractice Report | `<Stamp />` or `<FileCheck2 />` | Discipline Master sign-off action |
| **Cryptography & Resilience** | | |
| Tamper-Proof Audit Vault | `<ShieldCheck />` | SHA-256 blockchain/escrow badge |
| Offline Cache Active | `<DatabaseZap />` | SQLite WAL local node caching indicator |
| Network Pulse / Latency | `<Activity />` | Round-trip latency meter (e.g. `28 ms`) |
| Low-Bandwidth Mode | `<Gauge />` | Fallback trigger under 128 kbps |

---

## 5. UI Component Rules & Implementation Best Practices

1. **Anti-Collusion Seating Grid:**
   - Desks must be rendered in fixed aspect ratio containers (`aspect-square` or `min-h-[56px]`).
   - Desk tags: `#01` to `#120` in monospace `text-[10px] font-mono`.
   - Hover states must display candidate name, arrival time, and biometric timestamp without triggering layout shifts.

2. **Invigilator 8-Character Passcodes:**
   - Must use `font-mono tracking-widest uppercase` (e.g. `7K4P-92XM`).
   - Font size: Minimum `18px` (`font-bold`) with high contrast against container background.
   - Include a 1-click `<Copy />` icon button with toast feedback ("Code copied to clipboard").

3. **Status Badges & Chips:**
   - Height: `24px` (`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5`).
   - Every status chip must pair an icon or a colored `w-1.5 h-1.5 rounded-full` dot with the text label for colorblind accessibility (WCAG AA compliant).

4. **Incident & Evidence Frames:**
   - Optical bounding boxes overlaid on camera feeds must use `#ef4444` (`red-500`) with an explicit confidence tag (`0.942 LOCK`).
   - Timestamps must always be rendered in ISO / West Africa Time (`WAT / CAT` format).
