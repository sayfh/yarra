# Yarra — AI-driven real estate development proforma

A web-based development proforma that mirrors the structure of the in-house Excel template, driven by an AI analyst instead of manual cell edits.

## What it does

- **Live proforma model** in TypeScript covering Massing → Unit Mix → Sources & Uses → Capital Stack → Rental Operations → Waterfall → Returns. Pure functions, recomputed on every assumption change.
- **AI analyst panel** powered by OpenAI (GPT-4o) with function calling. You direct the proforma in plain English ("set LTV to 75%", "what if cap rate goes to 6.5%?", "explain the yield on cost"). The model calls tools to read and edit the deal.
- **Excel ingestion** — upload your `.xlsx` template and the model reads the named inputs into a live deal.
- **Validation suite** — upload your template and the app diffs the engine's outputs against the workbook's resolved values, cell by cell, with tolerance bands.
- **Seeded from the 87 College Ave W workbook** so the numbers line up on day one.

## Stack

- Next.js 14 (App Router) + React 18 + Tailwind CSS
- OpenAI Node SDK with tool/function calling
- ExcelJS for `.xlsx` parsing
- Pure-TypeScript calc engine

## Running locally

```bash
npm install
cp .env.example .env.local      # then add your OPENAI_API_KEY
npm run dev                     # http://localhost:3000
```

## Running the validation suite from the CLI

```bash
npm run validate path/to/your-template.xlsx
```

Prints a side-by-side diff of engine outputs vs. workbook values, with `MATCH / TOLERABLE / MISMATCH / MISSING` per metric.

## Scope

Implemented:
- Headline KPIs: TPC, Equity, Construction Loan, Stabilization NOI, Stabilization Value, YoC, IRR / EM / ROE, Class A & B returns
- Multi-year operating proforma (8 years, with growth, vacancy, opex, ancillary, parking)
- Takeout loan sizing (min of DSCR-implied and LTV-implied)
- Exit waterfall (notional sale → net distribution → return of equity → excess financing → profit split)
- AI tools: `read_state`, `set_assumption`, `set_assumptions`, `run_scenario`, `explain_metric`
- Excel ingestion + validation report

Roadmap:
- Excel export — write back into the uploaded template, preserving formulas and layout
- Postgres + deal library + version history + audit trail
- PDF ingestion with source citations
- Full monthly cashflow grid (S-curve / straight-line) for precise interest and tranche-timed IRR
- Multi-investor sub-allocations (HEPSOR, Liuna, Elysium, INVESTOR 1)
