# Yarra — AI-driven real estate development proforma

A web-based development proforma that mirrors the structure of the in-house Excel template, driven by an AI analyst instead of manual cell edits.

## What it does

- **Live proforma model** in TypeScript covering Massing → Unit Mix → Sources & Uses → Capital Stack → Rental Operations → Waterfall → Returns. Pure functions, recomputed on every assumption change.
- **AI analyst panel** powered by Claude. You direct the proforma in plain English ("set LTV to 75%", "what if cap rate goes to 6.5%?", "explain the yield on cost"). Claude calls tools to read and edit the model.
- **Seeded from the 87 College Ave W workbook** so the numbers line up with the source-of-truth Excel template on day one.

## Stack

- Next.js 14 (App Router) + React 18 + Tailwind CSS
- Anthropic SDK for Claude tool-use
- Pure-TypeScript calc engine (no spreadsheet runtime — formulas are coded directly)

## Running locally

```bash
npm install
cp .env.example .env.local      # then add your ANTHROPIC_API_KEY
npm run dev                     # starts on http://localhost:3000
```

## Scope (MVP)

Implemented:
- Headline KPIs: Total Project Cost, Equity Required, Construction Loan, Stabilization NOI, Stabilization Value, Yield on Cost, Project IRR / EM / ROE, Class A & B returns
- Multi-year operating proforma (8 years, with rent growth, vacancy, opex, ancillary, parking)
- Takeout loan sizing (min of DSCR-implied and LTV-implied)
- Exit waterfall (notional sale → net distribution → return of equity → excess financing → profit split)
- AI tools: `read_state`, `set_assumption`, `set_assumptions`, `run_scenario`, `explain_metric`

Roadmap:
- Full monthly cashflow grid (S-curve / straight-line distribution) to drive precise construction-period interest and tranche-timed IRR
- Multi-investor sub-allocations (HEPSOR, Liuna, Elysium, INVESTOR 1)
- Live sensitivity tables (GFA × $PSF, cap rate × stabilization date)
- `.xlsx` export back to the template
- Persistence beyond `localStorage` (auth + multi-deal workspace)
