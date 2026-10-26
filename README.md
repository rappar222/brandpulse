# BrandPulse — Brand & Handle Availability Checker

A fast, modern full-stack web application built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS** to check domain, package registry, and developer/social platform handle availability simultaneously in real-time.

---

## ✨ Features

1. **Modern Single-Page Dashboard**:
   - Clean, modern UI with dark & light mode support.
   - Central search bar with a **500ms debounce** and instant Enter/Click execution.
   - Quick inspiration example chips (`promptkit`, `hyperstack`, `devpulse`, `neonflow`, etc.).
   - Interactive status filtering (`All`, `Available`, `Taken`, `Error/Rate-limited`) and category filtering.
   - One-click markdown summary report copy.

2. **Real-time Status Grid**:
   - **Domains**: `.com`, `.io`, `.dev`, `.app`, `.ai`
   - **Package Registries**: npm, PyPI, Crates.io, AUR, APT
   - **Social & Platforms**: GitHub, X/Twitter, Bluesky, Reddit
   - Status indicators:
     - 🟢 **Available** (Green badge)
     - 🔴 **Taken** (Red/Rose badge)
     - ⚪ **Error / Rate-limited** (Gray badge)
   - Real-time latency tracking (in ms) per target.
   - Direct link to visit each platform URL with external link indicators.
   - Copy platform link button.

3. **Smart Fallback Suggestions**:
   - When any handle or domain is claimed, automatically generates alternate handles:
     - `get{name}`, `{name}dev`, `{name}hq`, `{name}app`, `{name}io`, `try{name}`, `{name}labs`, `{name}ai`, etc.
   - Clicking any suggested alternate instantly populates the search bar and triggers a live check.

4. **Robust Backend API (`/api/check`)**:
   - Non-blocking server-side check with **concurrent `Promise.allSettled`** lookups.
   - **Cloudflare DNS-over-HTTPS (DoH)** lookup for `.com`, `.io`, `.dev`, `.app`, `.ai` (`type=NS` & `type=A` RFC checks).
   - **npm Registry**: `https://registry.npmjs.org/{name}` (HTTP 404 = available).
   - **PyPI API**: `https://pypi.org/pypi/{name}/json` (HTTP 404 = available).
   - **Crates.io API**: `https://crates.io/api/v1/crates/{name}` with descriptive `User-Agent` header (HTTP 404 = available).
   - **GitHub**: Standard browser `User-Agent` `HEAD` request to `https://github.com/{name}` (HTTP 404 = available, 200 = taken).
   - **Bluesky**: AT Protocol `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle` (HTTP 400/404 = available, 200 = taken).
   - **X / Twitter**: Browser `HEAD` lookup (HTTP 404 = available, 200 = taken).
   - **Reddit**: User profile query with rate-limit and error fallback.
   - Graceful timeout handling on all targets using `AbortController` (4500ms timeout per lookup).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or 20.x+
- npm or pnpm

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run start
```

---

## 📡 API Documentation

### `GET /api/check`

#### Query Parameters:
- `name` *(required)*: The brand or handle to check (e.g. `hyperflow`).
- `target` or `platform` *(optional)*: Limit lookup to a single target (`com`, `io`, `dev`, `app`, `ai`, `npm`, `pypi`, `crates`, `github`, `twitter`, `bluesky`, `reddit`).
- `format` *(optional)*:
  - Default: Returns clean JSON array of `CheckResult[]`.
  - `envelope`: Returns detailed object `{ name, sanitized, timestamp, summary, results, suggestions }`.

#### Example 1: Check All Targets (Default Array)
```bash
curl "http://localhost:3000/api/check?name=hyperflow"
```

Response:
```json
[
  {
    "platform": ".com",
    "category": "Domains",
    "status": "taken",
    "url": "https://hyperflow.com",
    "latencyMs": 42,
    "message": "NS records present"
  },
  {
    "platform": "npm",
    "category": "Package Registries",
    "status": "available",
    "url": "https://www.npmjs.com/package/hyperflow",
    "latencyMs": 180,
    "message": "Package not found on registry"
  }
]
```

#### Example 2: Check Single Target
```bash
curl "http://localhost:3000/api/check?name=serde&target=crates"
```

Response:
```json
{
  "platform": "Crates.io",
  "category": "Package Registries",
  "status": "taken",
  "url": "https://crates.io/crates/serde",
  "latencyMs": 320,
  "message": "Crate already registered"
}
```

#### Example 3: Envelope with Suggestions
```bash
curl "http://localhost:3000/api/check?name=react&format=envelope"
```

Response:
```json
{
  "name": "react",
  "sanitized": "react",
  "timestamp": "2026-10-24T20:22:19.101Z",
  "summary": {
    "total": 12,
    "available": 0,
    "taken": 11,
    "unknown": 1
  },
  "results": [ ... ],
  "suggestions": [
    "getreact",
    "reactdev",
    "reacthq",
    "reactapp",
    "reactio",
    "tryreact",
    "reactlabs"
  ]
}
```

### `POST /api/check`
Accepts a JSON payload:
```json
{
  "name": "hyperflow",
  "target": "github",
  "format": "envelope"
}
```

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   └── check/
│   │       └── route.ts          # Concurrent backend check handler (GET & POST)
│   ├── globals.css               # Styling & Tailwind directives
│   ├── layout.tsx                # App root layout & theme support
│   └── page.tsx                  # Main single-page dashboard
├── components/
│   ├── AlternateSuggestions.tsx  # Dynamic suggestions for taken handles
│   ├── CategorySection.tsx       # Categorized grid view
│   ├── ResultCard.tsx            # Platform card with link, copy & latency
│   ├── SearchBar.tsx             # 500ms debounced search with instant submit
│   ├── StatsOverview.tsx         # Counters, category & status filter bar
│   ├── StatusBadge.tsx           # Green / Red / Gray badges
│   └── ThemeToggle.tsx           # Light / Dark mode toggle
├── lib/
│   ├── checkers.ts               # Cloudflare DoH, registry & social checkers
│   ├── suggestions.ts            # Smart alternative generator
│   └── types.ts                  # TypeScript models & interfaces
├── package.json
├── tailwind.config.js
└── tsconfig.json
```
