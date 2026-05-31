/**
 * Cell-address mapping from the 87 College Ave W proforma template to the Deal model.
 *
 * Each entry says: read this cell on this sheet, and assign it to this dot-path on the
 * Deal object. The mapping is derived from the template-analysis report — see
 * .tmp/template-analysis.md for cell-level provenance.
 *
 * Note: We read RESOLVED values (data_only=True equivalent — see parser.ts), not formulas.
 * Where a cell is a hard-typed input the mapping is direct; where it's a formula we still
 * read the resolved number so we can later validate the engine's recomputation against it.
 */

export interface CellMap {
  /** Sheet name in the workbook. */
  sheet: string;
  /** A1-style cell reference. */
  cell: string;
  /** Dot-path on the Deal object. */
  path: string;
  /** Optional transform to apply to the cell value before assignment. */
  transform?: "asNumber" | "asString" | "asDateISO";
}

/** Inputs that map directly from a known cell to a Deal field. */
export const INPUT_MAP: CellMap[] = [
  // ---- Property ----
  { sheet: "Deal Info", cell: "C8", path: "property.propertyType", transform: "asString" },
  { sheet: "Deal Info", cell: "C9", path: "property.city", transform: "asString" },
  { sheet: "Deal Info", cell: "C10", path: "property.address", transform: "asString" },
  { sheet: "Deal Info", cell: "C11", path: "property.landAreaSF", transform: "asNumber" },
  { sheet: "Deal Info", cell: "C12", path: "property.buildingsOnLand", transform: "asNumber" },
  { sheet: "Deal Info", cell: "F8", path: "property.buildType", transform: "asString" },
  { sheet: "Deal Info", cell: "F11", path: "property.zoningDurationMonths", transform: "asNumber" },
  { sheet: "Deal Info", cell: "F15", path: "property.exitMonths", transform: "asNumber" },

  // ---- Timeline ----
  { sheet: "Sources & Uses", cell: "C6", path: "timeline.startDate", transform: "asDateISO" },
  { sheet: "Deal Inputs", cell: "M11", path: "timeline.horizonMonths", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "G8", path: "timeline.saleMonth", transform: "asNumber" },

  // ---- Massing ----
  { sheet: "Massing Yields", cell: "D12", path: "massing.storeys", transform: "asNumber" },
  { sheet: "Massing Yields", cell: "D13", path: "massing.gcaAboveGrade", transform: "asNumber" },
  { sheet: "Massing Yields", cell: "D14", path: "massing.gfaDeduction", transform: "asNumber" },
  { sheet: "Massing Yields", cell: "D17", path: "massing.amenityArea", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C28", path: "massing.belowGradeArea", transform: "asNumber" }, // GCA below grade (used by hard cost line)
  { sheet: "Massing Yields", cell: "D49", path: "massing.parkingStalls", transform: "asNumber" },
  { sheet: "Massing Yields", cell: "D50", path: "massing.parkingRentPerStallMo", transform: "asNumber" },

  // ---- Hard cost rates ----
  { sheet: "Sources & Uses", cell: "C27", path: "hard.constructionPerSF", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C28", path: "hard.belowGradePerSF", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C29", path: "hard.buildersRiskPct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C33", path: "hard.contingencyPct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C34", path: "hard.cmFeePct", transform: "asNumber" },

  // ---- Soft cost rates ----
  { sheet: "Sources & Uses", cell: "C74", path: "soft.dmPreConPct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C75", path: "soft.dmConstructionPct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C76", path: "soft.softContingencyPct", transform: "asNumber" },

  // ---- Land cost rates ----
  { sheet: "Sources & Uses", cell: "C15", path: "land.acquisitionFeePct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C22", path: "land.propertyTaxPct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C23", path: "land.municipalTaxPct", transform: "asNumber" },
  { sheet: "Land Deposits", cell: "C2", path: "land.purchasePrice", transform: "asNumber" },

  // ---- Financing rates ----
  { sheet: "Sources & Uses", cell: "C82", path: "financing.guaranteeFeePct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C83", path: "financing.commitmentFeePct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C86", path: "financing.otherLoanFeesPct", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C87", path: "financing.seniorDebtRate", transform: "asNumber" },
  { sheet: "Sources & Uses", cell: "C110", path: "financing.constructionLoanRate", transform: "asNumber" },

  // ---- Capital ----
  { sheet: "Sources & Uses", cell: "D104", path: "capital.constructionLoanPctOfEquity", transform: "asNumber" },

  // ---- Rental ----
  { sheet: "Rental Overview + Sensitivity", cell: "C34", path: "rental.vacancyPct", transform: "asNumber" },
  { sheet: "Rental Overview + Sensitivity", cell: "C35", path: "rental.opexPct", transform: "asNumber" },
  { sheet: "Rental Overview + Sensitivity", cell: "C36", path: "rental.capRate", transform: "asNumber" },
  { sheet: "Rental Overview + Sensitivity", cell: "F32", path: "rental.rentalGrowthPct", transform: "asNumber" },
  { sheet: "Unit Mix", cell: "D18", path: "rental.ancillaryPct", transform: "asNumber" },

  // ---- Takeout loan ----
  { sheet: "Waterfall+ Exit Sensitivity", cell: "L7", path: "takeout.primeRate", transform: "asNumber" },
  { sheet: "Waterfall+ Exit Sensitivity", cell: "L8", path: "takeout.spread", transform: "asNumber" },
  { sheet: "Waterfall+ Exit Sensitivity", cell: "L11", path: "takeout.amortYears", transform: "asNumber" },
  { sheet: "Waterfall+ Exit Sensitivity", cell: "O10", path: "takeout.dscr", transform: "asNumber" },
  { sheet: "Waterfall+ Exit Sensitivity", cell: "O23", path: "takeout.ltv", transform: "asNumber" },

  // ---- Exit ----
  { sheet: "Waterfall+ Exit Sensitivity", cell: "F18", path: "exit.dispositionFeePct", transform: "asNumber" },

  // ---- Capital splits ----
  { sheet: "Capital Stack", cell: "B6", path: "capital.classAContributionPct", transform: "asNumber" },
  { sheet: "Capital Stack", cell: "C6", path: "capital.classAProfitPct", transform: "asNumber" },
];

/** Per-unit-type cell mapping. Unit Mix sheet uses rows 5-10 for 6/5/4/3/2/1 bed types. */
export const UNIT_MIX_ROWS: Array<{ unitKey: string; row: number }> = [
  { unitKey: "sixBed", row: 5 },
  { unitKey: "fiveBed", row: 6 },
  { unitKey: "fourBed", row: 7 },
  { unitKey: "threeBed", row: 8 },
  { unitKey: "twoBed", row: 9 },
  { unitKey: "oneBed", row: 10 },
];

/** Outputs we want to read from the workbook for validation purposes. */
export interface OutputRef {
  sheet: string;
  cell: string;
  /** Stable identifier used to look this up in the validation report. */
  key: string;
  /** Human-readable label. */
  label: string;
  /** Tolerance for matching (relative, e.g. 0.005 = 0.5%). */
  tolerance?: number;
}

export const OUTPUT_REFS: OutputRef[] = [
  { key: "gfa", label: "GFA (SF)", sheet: "Massing Yields", cell: "D15", tolerance: 0 },
  { key: "nla", label: "Leasable area / NLA (SF)", sheet: "Massing Yields", cell: "D18", tolerance: 0 },
  { key: "efficiency", label: "NLA / GFA efficiency", sheet: "Massing Yields", cell: "D20", tolerance: 0.001 },
  { key: "totalUnits", label: "Total Units", sheet: "Massing Yields", cell: "D28", tolerance: 0 },
  { key: "totalBeds", label: "Total Beds", sheet: "Massing Yields", cell: "D29", tolerance: 0 },

  { key: "hardConstruction", label: "Construction hard cost ($)", sheet: "Sources & Uses", cell: "K27", tolerance: 0.001 },
  { key: "hardCMFee", label: "CM fee ($)", sheet: "Sources & Uses", cell: "K34", tolerance: 0.001 },
  { key: "hardContingency", label: "Hard contingency ($)", sheet: "Sources & Uses", cell: "K33", tolerance: 0.001 },
  { key: "totalHard", label: "Total hard costs ($)", sheet: "Sources & Uses", cell: "K35", tolerance: 0.001 },
  { key: "totalLand", label: "Total land costs ($)", sheet: "Sources & Uses", cell: "K24", tolerance: 0.005 },
  { key: "totalSoft", label: "Total soft costs ($)", sheet: "Sources & Uses", cell: "K77", tolerance: 0.05 },
  { key: "totalFinancing", label: "Total financing costs ($)", sheet: "Sources & Uses", cell: "K88", tolerance: 0.10 },
  { key: "totalProjectCost", label: "Total Project Cost ($)", sheet: "Sources & Uses", cell: "K90", tolerance: 0.02 },

  { key: "equity", label: "Equity required ($)", sheet: "Sources & Uses", cell: "K107", tolerance: 0.02 },
  { key: "constructionLoan", label: "Construction loan ($)", sheet: "Sources & Uses", cell: "K104", tolerance: 0.02 },
  { key: "deferredDCs", label: "Deferred DCs ($)", sheet: "Sources & Uses", cell: "K106", tolerance: 0.01 },

  { key: "stabNOI", label: "Stabilization NOI ($)", sheet: "Rental Overview + Sensitivity", cell: "G51", tolerance: 0.02 },
  { key: "stabValue", label: "Stabilization Value ($)", sheet: "Rental Overview + Sensitivity", cell: "G53", tolerance: 0.02 },

  { key: "takeoutSized", label: "Takeout loan size ($)", sheet: "Waterfall+ Exit Sensitivity", cell: "O26", tolerance: 0.05 },
  { key: "netDispositionProceeds", label: "Net disposition proceeds ($)", sheet: "Waterfall+ Exit Sensitivity", cell: "G21", tolerance: 0.05 },
];
