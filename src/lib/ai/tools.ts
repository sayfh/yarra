import { computeDeal } from "../calc/engine";
import { applyPatches } from "../calc/patch";
import type { ComputedDeal, Deal } from "../types";

/** OpenAI function-calling tool spec. Mirrors openai.chat.completions.create's `tools` parameter. */
export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "read_state",
      description:
        'Read the current proforma state. Returns inputs and the latest computed outputs. Provide a scope to limit the response: "summary" (default), "inputs", "costs", "sources", "rental", "waterfall", "returns", or "all".',
      parameters: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["summary", "inputs", "costs", "sources", "rental", "waterfall", "returns", "all"],
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_assumption",
      description:
        'Set a single leaf input on the deal by dot-path. Returns recalculated headline KPIs. Examples: path="rental.capRate" value=0.065; path="hard.constructionPerSF" value=410; path="units.fourBed.count" value=120.',
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: 'Dot-path to the leaf, e.g. "rental.capRate".' },
          value: { type: ["number", "string"], description: "New value. Rates must be decimals (0.06 not 6)." },
        },
        required: ["path", "value"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_assumptions",
      description:
        "Apply multiple assumption edits atomically. Use this when changes belong together (e.g. a stabilized scenario).",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                value: { type: ["number", "string"] },
              },
              required: ["path", "value"],
              additionalProperties: false,
            },
          },
        },
        required: ["updates"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_scenario",
      description:
        "Preview the impact of a set of changes without committing them. Returns the resulting headline KPIs.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                value: { type: ["number", "string"] },
              },
              required: ["path", "value"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "updates"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_metric",
      description:
        "Get a structured breakdown of how a headline metric is calculated. Use this before answering 'how is X calculated' questions.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: [
              "totalProjectCost",
              "equity",
              "constructionLoan",
              "stabilizationNOI",
              "yieldOnCost",
              "projectIRR",
              "projectEM",
              "takeoutLoan",
            ],
          },
        },
        required: ["metric"],
        additionalProperties: false,
      },
    },
  },
];

/* ---- Summarisers (compact, token-frugal) ---- */

function fmt$(n: number): string {
  if (!isFinite(n)) return "n/a";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  if (!isFinite(n)) return "n/a";
  return `${(n * 100).toFixed(2)}%`;
}

function summaryView(deal: Deal, c: ComputedDeal) {
  return {
    deal: { id: deal.id, name: deal.name, city: deal.property.city },
    massing: {
      storeys: deal.massing.storeys,
      gfa: c.massing.gfa,
      nla: c.massing.nla,
      efficiency: c.massing.efficiency,
      totalUnits: c.massing.totalUnits,
      totalBeds: c.massing.totalBeds,
    },
    keyInputs: {
      "hard.constructionPerSF": deal.hard.constructionPerSF,
      "rental.capRate": deal.rental.capRate,
      "rental.vacancyPct": deal.rental.vacancyPct,
      "rental.opexPct": deal.rental.opexPct,
      "rental.rentalGrowthPct": deal.rental.rentalGrowthPct,
      "takeout.ltv": deal.takeout.ltv,
      "takeout.dscr": deal.takeout.dscr,
      "capital.classAContributionPct": deal.capital.classAContributionPct,
      "capital.classAProfitPct": deal.capital.classAProfitPct,
    },
    headlineKPIs: {
      totalProjectCost: fmt$(c.costs.totalProjectCost),
      equityRequired: fmt$(c.sources.equity),
      constructionLoan: fmt$(c.sources.constructionLoan),
      stabilizationNOI: fmt$(c.rental.stabilizationNOI),
      stabilizationValue: fmt$(c.rental.stabilizationValue),
      yieldOnCostYr5: fmtPct(c.rental.years[4]?.yoc ?? 0),
      takeoutLoan: fmt$(c.takeout.sized),
      takeoutBinding: c.takeout.bindingConstraint,
      netProfit: fmt$(c.returns.netProfit),
      projectIRR: fmtPct(c.returns.projectIRR),
      projectEM: `${c.returns.projectEM.toFixed(2)}x`,
      projectROE: fmtPct(c.returns.projectROE),
    },
  };
}

export function buildReadStateResponse(deal: Deal, scope: string | undefined): unknown {
  const c = computeDeal(deal);
  const s = scope ?? "summary";
  switch (s) {
    case "summary":
      return summaryView(deal, c);
    case "inputs":
      return {
        property: deal.property,
        timeline: deal.timeline,
        massing: deal.massing,
        units: deal.units,
        land: deal.land,
        hard: deal.hard,
        soft: deal.soft,
        fees: deal.fees,
        financing: deal.financing,
        capital: deal.capital,
        rental: deal.rental,
        takeout: deal.takeout,
        exit: deal.exit,
      };
    case "costs":
      return c.costs;
    case "sources":
      return c.sources;
    case "rental":
      return { ...c.rental };
    case "waterfall":
      return c.waterfall;
    case "returns":
      return c.returns;
    case "all":
      return { deal, computed: c };
    default:
      return summaryView(deal, c);
  }
}

export function explainMetric(deal: Deal, c: ComputedDeal, metric: string): unknown {
  switch (metric) {
    case "totalProjectCost":
      return {
        formula: "land + hard + soft + financing",
        components: {
          land: c.costs.land.total,
          hard: c.costs.hard.total,
          soft: c.costs.soft.total,
          financing: c.costs.financing.total,
        },
        total: c.costs.totalProjectCost,
      };
    case "equity":
      return {
        formula: "equity = TPC - preStabIncome - deferredDCs",
        inputs: {
          totalProjectCost: c.costs.totalProjectCost,
          preStabIncome: c.sources.preStabIncome,
          deferredDCs: c.sources.deferredDCs,
        },
        result: c.sources.equity,
        note: "Mirrors S&U!K107. Senior debt and operating cashflow are 0 in this template, so equity carries essentially the entire TPC.",
      };
    case "constructionLoan":
      return {
        formula: "constructionLoan = equity × constructionLoanPctOfEquity",
        inputs: {
          equity: c.sources.equity,
          constructionLoanPctOfEquity: deal.capital.constructionLoanPctOfEquity,
        },
        result: c.sources.constructionLoan,
        note: "Mirrors S&U!K104. Informational — does not reduce the equity requirement; the loan is a working capital facility paid back from disposition proceeds.",
      };
    case "stabilizationNOI":
      return {
        formula: "Yr5 NOI = (Gross Income - Vacancy) × (1 - opexPct) + Ancillary",
        yr5: c.rental.years[4],
        result: c.rental.stabilizationNOI,
      };
    case "yieldOnCost":
      return {
        formula: "YoC = NOI / TPC",
        byYear: c.rental.years.map((y) => ({ year: y.year, noi: y.noi, yoc: y.yoc })),
        tpc: c.costs.totalProjectCost,
      };
    case "projectIRR":
      return {
        formula: "XIRR over equity contributions and disposition distributions",
        cashflows: [
          { t: deal.timeline.startDate, amount: -c.returns.totalEquity, kind: "contribution" },
          { tMonth: deal.timeline.saleMonth, amount: c.returns.totalDistribution, kind: "distribution" },
        ],
        result: c.returns.projectIRR,
        note: "MVP simplifies to a single contribution at t=0 and a single distribution at sale month.",
      };
    case "projectEM":
      return {
        formula: "EM = totalDistribution / totalEquity",
        inputs: { totalDistribution: c.returns.totalDistribution, totalEquity: c.returns.totalEquity },
        result: c.returns.projectEM,
      };
    case "takeoutLoan":
      return {
        formula: "min(DSCR-implied, LTV-implied)",
        dscrImplied: c.takeout.dscrImplied,
        ltvImplied: c.takeout.ltvImplied,
        rate: c.takeout.rate,
        amortYears: deal.takeout.amortYears,
        dscr: deal.takeout.dscr,
        ltv: deal.takeout.ltv,
        sized: c.takeout.sized,
        bindingConstraint: c.takeout.bindingConstraint,
      };
    default:
      return { error: `Unknown metric: ${metric}` };
  }
}

export interface ToolDispatchResult {
  deal: Deal;
  output: unknown;
}

/**
 * Execute a tool call against the current Deal state. Returns the (possibly
 * updated) Deal plus a JSON-serialisable output to feed back to the model.
 */
export function dispatchTool(
  deal: Deal,
  name: string,
  input: Record<string, unknown>,
): ToolDispatchResult {
  switch (name) {
    case "read_state": {
      const scope = typeof input.scope === "string" ? input.scope : undefined;
      return { deal, output: buildReadStateResponse(deal, scope) };
    }
    case "set_assumption": {
      const { path, value } = input as { path: string; value: number | string };
      const next = applyPatches(deal, [{ path, value }]);
      const c = computeDeal(next);
      return { deal: next, output: { ok: true, patched: { path, value }, kpis: summaryView(next, c).headlineKPIs } };
    }
    case "set_assumptions": {
      const updates = (input.updates ?? []) as Array<{ path: string; value: number | string }>;
      const next = applyPatches(deal, updates);
      const c = computeDeal(next);
      return { deal: next, output: { ok: true, applied: updates.length, kpis: summaryView(next, c).headlineKPIs } };
    }
    case "run_scenario": {
      const sName = (input.name as string) ?? "scenario";
      const updates = (input.updates ?? []) as Array<{ path: string; value: number | string }>;
      const next = applyPatches(deal, updates);
      const c = computeDeal(next);
      return {
        deal, // do NOT commit
        output: { scenario: sName, kpis: summaryView(next, c).headlineKPIs, committed: false },
      };
    }
    case "explain_metric": {
      const metric = (input.metric as string) ?? "";
      const c = computeDeal(deal);
      return { deal, output: explainMetric(deal, c, metric) };
    }
    default:
      return { deal, output: { error: `Unknown tool: ${name}` } };
  }
}
