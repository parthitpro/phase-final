# Viren's Khakhra - Mobile App Design (Stitch Style)

## Design Intent
A premium, offline-first mobile application for managing khakhra orders, production, and delivery. The app prioritizes one-handed usability with a bottom tab navigation and a "soft modern" aesthetic characterized by glassmorphism, vibrant coral accents, and deep space dark mode.

## Design Tokens

### Colors (Light Mode)
- **Primary (Accent):** `#f67b56` (Coral)
- **Background:** `#f0f2f5` (Slate-ish white)
- **Cards:** `rgba(255, 255, 255, 0.5)` (Glassmorphic semi-transparent)
- **Success:** `#10b981` (Emerald)
- **Danger:** `#ef4444` (Rose)

### Colors (Dark Mode)
- **Primary:** `#ff8e6e` (Bright Coral)
- **Background:** `#020617` (Deep Space)
- **Cards:** `rgba(30, 41, 59, 0.5)` (Deep glass)

### Typography
- **Font Family:** `Plus Jakarta Sans` (Fallback: system-ui)
- **Heading 1:** 2.5rem, Weight 900
- **Body:** 1.05rem, Weight 600

### Elevation & Shapes
- **Radius:** 24px (Standard), 40px (Large Cards)
- **Shadows:** Soft deep drop shadows (`--shadow-xl`)
- **Backdrop Blur:** 16px to 25px for frosted glass effect

## Navigation Structure (5-Tab Bottom Bar)
1. **Home:** Quick stats, daily summary, and recent activity.
2. **Orders:** Manage existing orders and create new ones.
3. **Produce:** Bulk manufacturing aggregation and weight projections.
4. **Deliver:** Driver dashboard and dispatch management.
5. **More:** CRM (Customers), Inventory (Products), and Settings.

## Offline Architecture
- **Local Store:** Capacitor SQLite (`khakhra_local.db`).
- **Sync Strategy:**
    - **Write-Through:** All UI actions write to SQLite first.
    - **Background Sync:** Periodically (or when connectivity changes) push the local transaction queue to the FastAPI backend.
    - **Conflict Resolution:** Last-write-wins based on local timestamps.
- **Cache Policy:** Products and customer lists are cached locally and refreshed daily or on-demand.

## Mobile Constraints
- **Tab Bar Height:** 64px
- **Touch Targets:** Minimum 44x44px
- **Safe Areas:** Padding-top/bottom for notch and home indicator.
- **Interactions:** Subtle haptic feedback (where available) and CSS transitions for all state changes.
