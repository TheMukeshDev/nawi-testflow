# NAWI Sahayak — Design System Specification

**Version:** 2.0
**Purpose:** Professional laboratory/regulatory software for OIML R-76 NAWI testing
**Audience:** Engineers, testing officers, laboratory managers

---

## 1. Design Principles

| Principle | Meaning |
|-----------|---------|
| **Professional** | Serious, institutional visual language. Not consumer software. |
| **Minimal** | No decoration. Every element earns its place. |
| **Functional** | Every pixel serves a purpose. No decorative elements. |
| **Data-focused** | Tables and forms are the primary interface. Not dashboards with charts. |
| **Desktop-first** | Optimized for 1280px+ screens. Functional on tablets (768px+). |
| **High density** | Laboratory operators need information density, not whitespace. |
| **Strong hierarchy** | Clear visual distinction between headings, labels, data, and metadata. |
| **Accessible** | Keyboard navigable. Screen reader compatible. High contrast ratios. |

---

## 2. What We Are NOT

- AI SaaS landing-page aesthetics
- Excessive gradients
- Glassmorphism
- Neon colors
- Huge rounded cards
- Decorative blobs or illustrations
- Excessive icons
- Fake AI statistics
- Generic "Welcome back" dashboards
- Excessive empty space
- Overly colorful interfaces

---

## 3. Color System

### 3.1 Gray Scale (Primary UI)

| Token | Hex | Usage |
|-------|-----|-------|
| `gray-0` | `#ffffff` | Backgrounds, cards |
| `gray-50` | `#f8f9fa` | Page background, table header |
| `gray-100` | `#f1f3f5` | Hover states, subtle backgrounds |
| `gray-150` | `#eaecf0` | Active states |
| `gray-200` | `#dee2e6` | Borders, dividers |
| `gray-300` | `#ced4da` | Input borders, disabled elements |
| `gray-400` | `#adb5bd` | Placeholder text, icons |
| `gray-500` | `#868e96` | Secondary text, labels |
| `gray-600` | `#6c757d` | Body text, form labels |
| `gray-700` | `#495057` | Headings, emphasis |
| `gray-800` | `#343a40` | Strong emphasis |
| `gray-900` | `#212529` | Primary text, dark backgrounds |
| `gray-950` | `#16191d` | Sidebar, dark UI chrome |

### 3.2 Primary Blue (Actions & Navigation)

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#e7f0fa` | Light backgrounds |
| `primary-100` | `#c3d9f0` | Selected row, focus ring |
| `primary-200` | `#9bbfe3` | Active indicators |
| `primary-300` | `#6fa1d5` | Hover states |
| `primary-400` | `#4d8ac9` | Interactive elements |
| `primary-500` | `#2b6cb0` | Primary buttons, links |
| `primary-600` | `#245a94` | Button backgrounds |
| `primary-700` | `#1d4778` | Button hover, borders |
| `primary-800` | `#16355c` | Active states |
| `primary-900` | `#0f2340` | Dark accents |

### 3.3 Success Green (Compliance Pass)

| Token | Hex | Usage |
|-------|-----|-------|
| `success-50` | `#edf5ec` | Pass background |
| `success-500` | `#3d7a3a` | Pass badge, indicators |
| `success-600` | `#336630` | Pass badge dark |

### 3.4 Warning Amber (Conditional / Review)

| Token | Hex | Usage |
|-------|-----|-------|
| `warning-50` | `#fdf5ec` | Warning background |
| `warning-500` | `#c48a2e` | Warning badge, indicators |
| `warning-600` | `#a37225` | Warning badge dark |

### 3.5 Danger Red (Fail / Error)

| Token | Hex | Usage |
|-------|-----|-------|
| `danger-50` | `#fceded` | Error background |
| `danger-500` | `#bc2e2e` | Error badge, destructive actions |
| `danger-600` | `#9c2525` | Error badge dark |

### 3.6 Info Blue (Neutral Information)

| Token | Hex | Usage |
|-------|-----|-------|
| `info-50` | `#eaf2f8` | Info background |
| `info-500` | `#377a99` | Info badge |

---

## 4. Typography

### 4.1 Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `font-sans` | Inter, Segoe UI, system-ui | Body text, UI elements |
| `font-mono` | JetBrains Mono, Consolas | Technical values, codes, IDs |

### 4.2 Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-2xs` | 10px | 400 | Fine print, footnotes |
| `text-xs` | 12px | 400-500 | Table cells, secondary labels |
| `text-sm` | 13px | 400-500 | Body small, form labels |
| `text-base` | 14px | 400 | Body base, primary UI text |
| `text-md` | 16px | 600 | Section headings |
| `text-lg` | 18px | 600 | Page titles |
| `text-xl` | 22px | 700 | Module headings |

### 4.3 Text Classes

| Class | Description |
|-------|-------------|
| `.text-label` | 12px, medium, uppercase, tracking-wide, gray-600 |
| `.text-field-label` | 13px, medium, gray-700 |
| `.text-section-title` | 16px, semibold, gray-900 |
| `.text-page-title` | 18px, semibold, gray-900 |
| `.text-data` | 13px, normal, gray-900 |
| `.text-data-strong` | 13px, medium, gray-900 |
| `.text-footnote` | 12px, normal, gray-500 |
| `.text-mono` | 12px, mono, tight tracking |

---

## 5. Spacing System

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-0` | 0 | Reset |
| `spacing-px` | 1px | Borders |
| `spacing-0_5` | 2px | Tight spacing |
| `spacing-1` | 4px | Minimal spacing |
| `spacing-1_5` | 6px | Small spacing |
| `spacing-2` | 8px | Default spacing |
| `spacing-2_5` | 10px | Comfortable spacing |
| `spacing-3` | 12px | Medium spacing |
| `spacing-4` | 16px | Section spacing |
| `spacing-5` | 20px | Large spacing |
| `spacing-6` | 24px | Page padding |
| `spacing-8` | 32px | Major spacing |
| `spacing-10` | 40px | Section gaps |
| `spacing-12` | 48px | Page margins |

---

## 6. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | 0 | Sharp edges |
| `radius-sm` | 2px | Badges, small elements |
| `radius-md` | 4px | Buttons, inputs, cards |
| `radius-lg` | 6px | Dialogs (maximum) |

**No rounded-full. No rounded-xl. Maximum radius is 6px.**

---

## 7. Elevation (Shadows)

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | 0 1px 2px rgba(0,0,0,0.05) | Subtle lift |
| `shadow-sm` | 0 1px 3px rgba(0,0,0,0.08) | Cards, dropdowns |
| `shadow-md` | 0 2px 6px rgba(0,0,0,0.08) | Elevated cards |
| `shadow-lg` | 0 4px 12px rgba(0,0,0,0.1) | Popovers |
| `shadow-overlay` | 0 8px 24px rgba(0,0,0,0.12) | Dialogs, modals |

---

## 8. Component Specifications

### 8.1 Button

**Variants:**
- `primary` — Blue background, white text. For main actions (Save, Submit, Create).
- `secondary` — White background, gray border. For secondary actions (Cancel, Back).
- `danger` — Red background, white text. For destructive actions (Delete, Reject).
- `ghost` — Transparent background. For tertiary actions (Sort, Filter toggle).

**Sizes:**
- `sm` — 28px height, 12px font. For table row actions.
- `md` — 32px height, 13px font. Default, form actions.
- `lg` — 36px height, 14px font. Primary page actions.

**States:**
- Default
- Hover (darker background)
- Active (darkest background)
- Focus (visible ring)
- Disabled (50% opacity)
- Loading (spinner replaces content)

### 8.2 Input

**Height:** 32px
**Font:** 13px
**Border:** 1px solid gray-300
**Border Radius:** 4px
**Padding:** 10px horizontal

**States:**
- Default: White background, gray-300 border
- Hover: gray-400 border
- Focus: primary-500 border, primary-200 ring
- Error: danger-400 border, danger message below
- Disabled: gray-50 background, gray-500 text
- Read-only: gray-50 background, gray-200 border
- Monospace: 12px mono font for technical values

**Labels:**
- Always above the field (never floating)
- 13px, medium weight, gray-700
- Required indicator: red asterisk (*)

### 8.3 Select

Same as Input but with:
- Custom chevron icon (12px, gray-400)
- No native browser styling

### 8.4 Textarea

Same as Input but:
- Variable height (default 3 rows)
- Top-aligned text
- No resize handle (or resize-y only)

### 8.5 Badge

**Variants:**
- `solid` — Filled background, white text
- `outline` — Border only, colored text
- `subtle` — Light background, dark text

**Colors:** gray, primary, success, warning, danger, info

**Sizes:**
- Default: 11px font, 6px vertical padding, 4px horizontal
- No size variants needed (badges should be compact)

**Optional dot indicator for active/running states.**

### 8.6 DataTable

**Header:**
- Background: gray-50
- Text: 12px, uppercase, semibold, gray-700
- Border: bottom, gray-200
- Sort indicators: simple arrows (↑↓), not animated

**Rows:**
- Background: white
- Hover: gray-50
- Border: bottom, gray-100
- Padding: 10px horizontal, 8px vertical
- Font: 13px

**Selected row:**
- Background: primary-50/50

**Compliance indicator:**
- 3px left border
- Green for pass, red for fail, amber for conditional, gray for pending

**Pagination:**
- Compact, at bottom
- Text: 12px, gray-500
- Buttons: border, gray-200

### 8.7 Dialog / Modal

**Sizes:**
- `sm` — 360px max width
- `md` — 480px max width
- `lg` — 640px max width

**Structure:**
- Header: 16px title, semibold
- Body: 13px text, gray-600
- Footer: Right-aligned buttons
- Close button: X icon, top-right
- Backdrop: gray-950/50

**Confirm Dialog:**
- Message: Clear description of action
- Buttons: Cancel (secondary) + Confirm (primary or danger)
- Loading state: spinner on confirm button

### 8.8 Empty State

**Structure:**
- Icon: 40px, gray-300 (simple SVG, not illustration)
- Title: 14px, semibold, gray-700
- Description: 13px, gray-500, max-width 360px
- Action: Button (primary)

**No illustrations. No animations. No decorative elements.**

### 8.9 Error State

**Structure:**
- Icon: 40px, danger-500
- Title: 14px, semibold, danger-700
- Description: 13px, gray-600
- Error details: Monospace, 12px, gray-700 (if applicable)
- Action: Button (secondary) to retry or go back

### 8.10 Loading State

**Skeleton loading:**
- Background: gray-100
- Animation: pulse (subtle, not distracting)
- Shape: Rectangles matching content layout
- No spinners for page loads (use skeletons)

**Spinner:**
- Only for button actions
- 14px, current color, 25% opacity track

### 8.11 Alert

**Variants:**
- `info` — Blue background, blue border
- `success` — Green background, green border
- `warning` — Amber background, amber border
- `error` — Red background, red border

**Structure:**
- Icon: 16px, left side
- Title: Optional, 13px semibold
- Content: 12px, slightly transparent
- Dismiss: X icon, right side (optional)

### 8.12 Confirmation Patterns

**Submit for Review:**
- Title: "Submit for Review"
- Message: "This test will be submitted for reviewer approval. You will not be able to edit observations after submission."
- Buttons: Cancel + "Submit for Review" (primary)

**Approve Test:**
- Title: "Approve Test"
- Message: "This test record will be marked as approved. A report can then be generated."
- Buttons: Cancel + "Approve" (primary, green)

**Reject Test:**
- Title: "Reject Test"
- Message: "This test will be returned to the technician for revision. Please provide a reason."
- Textarea: Required, "Reason for rejection"
- Buttons: Cancel + "Reject" (danger)

**Delete Record:**
- Title: "Delete Record"
- Message: "This action cannot be undone. The record and all associated data will be permanently deleted."
- Buttons: Cancel + "Delete" (danger)

---

## 9. Navigation Structure

### 9.1 Primary Navigation (Sidebar)

```
Dashboard
Test Reports
New Test
Instruments
Laboratory
Equipment
Repository
Users
Settings
```

### 9.2 Sidebar Design

- **Width:** 240px (fixed)
- **Background:** gray-950 (dark)
- **Text:** gray-300 (inactive), white (active)
- **Active state:** Left border (3px primary-500) + background (gray-900)
- **Hover state:** Background (gray-900/50)
- **Icons:** Simple SVG, 18px, stroke-based
- **User info:** Bottom of sidebar, avatar + name + role

### 9.3 TopBar

- **Height:** 48px
- **Background:** white
- **Border:** bottom, gray-200
- **Contents:** Breadcrumbs (left), Global search (center), Actions (right)
- **New Test button:** Primary, always visible

---

## 10. Page Layout

### 10.1 Content Area

- **Padding:** 24px horizontal, 20px vertical
- **Max width:** 1400px
- **Background:** gray-50

### 10.2 Page Header

- **Title:** 18px, semibold, gray-900
- **Subtitle:** 13px, gray-500
- **Actions:** Right-aligned, gap 8px
- **Metadata row:** Below title, border-top, gray-200

### 10.3 Sections

- **Section title:** 16px, semibold, gray-900
- **Section gap:** 24px between sections
- **Card/panel:** White background, gray-200 border, 4px radius

---

## 11. Form Layout

### 11.1 Vertical Form (Default)

```
[Label]
[Input]
[Error/Hint]
```

- Label to input gap: 4px
- Input to next field gap: 12px

### 11.2 Horizontal Form (Dense)

```
[Label] [Input]
```

- Label width: Fixed (e.g., 120px)
- Label to input gap: 8px
- Used in: Metadata rows, inline editing

### 11.3 Fieldset

- Border: 1px gray-200
- Padding: 16px
- Legend: 16px, semibold
- Gap between fields: 12px

---

## 12. Table Layout

### 12.1 Standard Table

- Full width
- Fixed header (sticky)
- Scrollable body
- Row height: ~36px (auto based on content)
- Cell padding: 10px horizontal

### 12.2 Compact Table

- For metadata displays
- Row height: ~28px
- Cell padding: 8px horizontal
- Font: 12px

---

## 13. Status & Compliance

### 13.1 Test Statuses

| Status | Color | Variant | Description |
|--------|-------|---------|-------------|
| Draft | gray | subtle | Test created, not started |
| In Testing | primary | solid | Observations being recorded |
| Observations Complete | info | subtle | All observations entered |
| Calculations Pending | warning | subtle | Awaiting calculation |
| Calculations Complete | success | subtle | Results calculated |
| Pending Review | warning | solid | Submitted for review |
| Revision Requested | danger | solid | Returned for changes |
| Approved | success | solid | Reviewer approved |
| Rejected | danger | solid | Reviewer rejected |
| Completed | gray | outline | Report generated |

### 13.2 Compliance Verdicts

| Verdict | Color | Variant | Description |
|---------|-------|---------|-------------|
| Compliant | success | solid | All tests passed |
| Non-Compliant | danger | solid | One or more tests failed |
| Conditional | warning | solid | Passed with conditions |
| Pending | gray | subtle | Not yet evaluated |
| N/A | gray | outline | Not applicable |

### 13.3 Visual Indicators

- **Compliance strip:** 3px left border on table rows
- **Condition dot:** 8px circle (green = normal, red = out of range, gray = not recorded)
- **Workflow progress:** Numbered circles with connecting lines

---

## 14. Accessibility

### 14.1 Focus Management

- Visible focus ring: 2px primary-500, 2px offset
- Tab order: Logical, follows visual layout
- Skip navigation: Skip to main content

### 14.2 Color Contrast

- All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Status badges use both color AND text (not color alone)

### 14.3 ARIA

- Roles: navigation, alert, grid
- Labels: All interactive elements have accessible labels
- States: aria-expanded, aria-selected, aria-invalid, aria-busy

### 14.4 Keyboard

- All actions accessible via keyboard
- Escape closes dialogs
- Enter submits forms
- Arrow keys navigate tables
