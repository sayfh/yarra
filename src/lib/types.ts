// Real-estate development proforma — domain types.
// Mirrors the structure of the 87 College Ave W workbook (Excel template).
// All currency is CAD, all areas are SF, all rates are decimals (0.06 = 6%).

export type UnitTypeKey = "studio" | "oneBed" | "twoBed" | "threeBed" | "fourBed" | "fiveBed" | "sixBed";

export interface UnitTypeRow {
  /** Bed count for the unit type (informational). */
  beds: number;
  /** Average SF per unit. */
  avgSF: number;
  /** Number of units of this type. */
  count: number;
  /** Monthly base rent per bed ($). */
  rentPerBed: number;
}

export interface MassingInputs {
  storeys: number;
  /** Total Gross Construction Area above grade (SF). */
  gcaAboveGrade: number;
  /** GFA Deduction / TARE (SF). */
  gfaDeduction: number;
  /** Amenity area (SF), part of GFA but not leasable. */
  amenityArea: number;
  /** Below-grade construction area (SF). */
  belowGradeArea: number;
  /** Total parking stalls provided. */
  parkingStalls: number;
  /** Monthly parking rent per stall ($). */
  parkingRentPerStallMo: number;
}

export interface PropertyInfo {
  address: string;
  city: string;
  propertyType: string;
  buildType: string;
  landAreaSF: number;
  buildingsOnLand: number;
  zoningDurationMonths: number;
  /** Months to projected exit from analysis start. */
  exitMonths: number;
}

export interface Timeline {
  /** ISO date string YYYY-MM-DD — single source of truth for analysis start. */
  startDate: string;
  /** Project horizon in months (Deal Inputs!M11). */
  horizonMonths: number;
  /** Refinance / sale month index from analysis start (S&U!G8). */
  saleMonth: number;
}

export interface LandCosts {
  purchasePrice: number;
  /** Land transfer tax as % of purchase. */
  landTransferTaxPct: number;
  /** Due diligence ($). */
  dueDiligence: number;
  /** Acquisition fee as % of purchase. */
  acquisitionFeePct: number;
  /** Finder's fee ($). */
  findersFee: number;
  /** Insurance during pre-construction ($). */
  insurance: number;
  /** Closing legals + title ($). */
  legalsAndTitle: number;
  /** Property tax % applied to purchase, pre-construction. */
  propertyTaxPct: number;
  /** Municipal tax % (S&U!C23). */
  municipalTaxPct: number;
}

export interface HardCosts {
  /** Construction cost ($/SF GFA). */
  constructionPerSF: number;
  /** Below-grade cost ($/SF below-grade GCA). */
  belowGradePerSF: number;
  /** Builders Risk insurance as % of construction-related costs. */
  buildersRiskPct: number;
  /** FF&E per unit ($). */
  ffePerUnit: number;
  /** Amenity FF&E lump-sum ($). */
  ffeAmenity: number;
  /** Miscellaneous hard costs ($). */
  miscHard: number;
  /** Hard-cost contingency as % of (construction + CM fee). */
  contingencyPct: number;
  /** Construction Management fee as % of construction. */
  cmFeePct: number;
}

export interface SoftCosts {
  /** Lumped per-SF GFA consultant costs (permit, architect, geo, env, civil, etc.). */
  consultantsPerSF: number;
  /** Lumped legal/accounting/admin ($). */
  professionalServices: number;
  /** DM (Development Manager) pre-construction fee as % of TDC × 40%. */
  dmPreConPct: number;
  /** DM construction fee as % of TDC × 60%. */
  dmConstructionPct: number;
  /** Soft-cost contingency as % of soft costs. */
  softContingencyPct: number;
}

export interface MunicipalFees {
  /** Development charges per unit by bed count. */
  dcPerUnit: { studio: number; oneBed: number; twoBed: number; threePlusBed: number };
  /** Education development charges per unit ($). */
  educationDCPerUnit: number;
  /** Other municipal fees (OPA, ZBA, SPA, etc.) — lumped ($). */
  otherMunicipal: number;
  /** Fraction of DCs paid up-front; remainder is deferred. */
  dcUpfrontFraction: number;
}

export interface FinancingCosts {
  /** Property tax % applied during construction. */
  propertyTaxConstructionPct: number;
  /** Guarantee fee as % of construction loan. */
  guaranteeFeePct: number;
  /** Commitment / loan-monitoring fees as % of construction loan. */
  commitmentFeePct: number;
  /** Other loan fees as % of construction loan. */
  otherLoanFeesPct: number;
  /** Construction loan interest rate (annual decimal). */
  constructionLoanRate: number;
  /** Senior debt interest rate, alt label (annual decimal). */
  seniorDebtRate: number;
}

export interface CapitalStackInputs {
  /** Construction loan as % of equity contribution (mirrors S&U!D104). */
  constructionLoanPctOfEquity: number;
  /** Class A (LP) % of equity contribution. */
  classAContributionPct: number;
  /** Class A (LP) % of profit. */
  classAProfitPct: number;
}

export interface RentalOps {
  /** Vacancy rate (decimal). */
  vacancyPct: number;
  /** Operating expense ratio applied to EGR (decimal). */
  opexPct: number;
  /** Exit / stabilized cap rate (decimal). */
  capRate: number;
  /** Annual rental growth rate (decimal). */
  rentalGrowthPct: number;
  /** Years modelled in the operating proforma (default 8). */
  operatingYears: number;
  /** Ancillary income as % of avg monthly rent PSF (Unit Mix!D18). */
  ancillaryPct: number;
}

export interface TakeoutLoan {
  /** Prime rate (annual decimal). */
  primeRate: number;
  /** Spread over prime (annual decimal). */
  spread: number;
  /** Amortization (years). */
  amortYears: number;
  /** Target DSCR for sizing (e.g. 1.10). */
  dscr: number;
  /** Max LTV (e.g. 0.80). */
  ltv: number;
}

export interface ExitParams {
  /** Disposition fee as % of sale price. */
  dispositionFeePct: number;
  /** Land finder's fee on exit ($). Negative cost is applied to sale. */
  exitFindersFee: number;
  /** Closing legals on exit ($). */
  exitLegals: number;
}

export interface Deal {
  /** Stable identifier (slug). */
  id: string;
  /** Human-readable deal name. */
  name: string;
  property: PropertyInfo;
  timeline: Timeline;
  massing: MassingInputs;
  units: Record<UnitTypeKey, UnitTypeRow>;
  /** Average per-bed rents inherit from units[].rentPerBed — explicit yr1 rent overrides not modelled in MVP. */
  land: LandCosts;
  hard: HardCosts;
  soft: SoftCosts;
  fees: MunicipalFees;
  financing: FinancingCosts;
  capital: CapitalStackInputs;
  rental: RentalOps;
  takeout: TakeoutLoan;
  exit: ExitParams;
}

/* ---------- Derived (computed) shapes ---------- */

export interface UnitTypeComputed {
  beds: number;
  avgSF: number;
  count: number;
  totalBeds: number;
  /** NLA contributed by this unit type (SF). */
  nla: number;
  /** GFA contributed by this unit type (SF) = NLA / efficiency. */
  gfa: number;
  /** Monthly rent per unit ($) = rentPerBed × beds. */
  monthlyRentPerUnit: number;
  /** Year-1 monthly rent for the whole bucket ($). */
  monthlyRentYr1: number;
  /** Year-1 annual rent for the whole bucket ($). */
  annualRentYr1: number;
}

export interface ComputedMassing {
  gfa: number;
  nla: number;
  leasableArea: number;
  efficiency: number;
  totalUnits: number;
  totalBeds: number;
  avgUnitSF: number;
  parkingAnnual: number;
}

export interface ComputedCosts {
  land: {
    purchase: number;
    landTransferTax: number;
    dueDiligence: number;
    acquisitionFee: number;
    findersFee: number;
    insurance: number;
    legalsAndTitle: number;
    propertyTax: number;
    municipalTax: number;
    total: number;
  };
  hard: {
    construction: number;
    belowGrade: number;
    buildersRisk: number;
    ffe: number;
    ffeAmenity: number;
    misc: number;
    cmFee: number;
    contingency: number;
    total: number;
  };
  soft: {
    consultants: number;
    professionalServices: number;
    dmPreCon: number;
    dmConstruction: number;
    contingency: number;
    devCharges: number;
    educationDC: number;
    otherMunicipal: number;
    total: number;
  };
  financing: {
    propertyTaxConstruction: number;
    guaranteeFee: number;
    commitmentFee: number;
    otherLoanFees: number;
    seniorDebtInterest: number;
    total: number;
  };
  totalProjectCost: number;
}

export interface ComputedSources {
  /** Construction loan size ($) — S&U!K104. Sub-line within the equity row. */
  constructionLoan: number;
  /** Deferred DCs ($) — S&U!K106. Sub-line within the equity row. */
  deferredDCs: number;
  /** Pre-stabilization operating income offset ($) — S&U!K105. Sub-line within the equity row. */
  preStabIncome: number;
  /**
   * "Equity Row" total ($) — S&U!K107 = TPC - senior debt - op CF - disposition uses.
   * In zero-debt templates this equals TPC and decomposes into investor equity +
   * construction loan + pre-stab income + deferred DCs.
   */
  equity: number;
  /** Total sources ($) — should equal totalProjectCost. */
  total: number;
  /** Cash actually required from investors (Class A + Class B) = equity - loan - preStab - deferredDCs. */
  investorEquity: number;
  /** Class A (LP) cash contribution ($). */
  classAContribution: number;
  /** Class B (GP) cash contribution ($). */
  classBContribution: number;
}

export interface OperatingYear {
  year: number;
  /** Avg in-place rent PSF (monthly). */
  rentPSF: number;
  annualRentalIncome: number;
  parkingIncome: number;
  ancillaryIncome: number;
  grossIncome: number;
  vacancy: number;
  egr: number;
  opex: number;
  noi: number;
  /** Valuation at this year's NOI / cap rate. */
  valuation: number;
  /** Yield on Cost = NOI / Dev Cost. */
  yoc: number;
}

export interface ComputedRental {
  years: OperatingYear[];
  /** NOI at stabilization (typically end of year 5). */
  stabilizationNOI: number;
  /** Valuation at stabilization (Stab NOI / cap rate). */
  stabilizationValue: number;
  /** Year-5 monthly NOI — feeds pre-stab income on S&U. */
  monthlyNOIAtStab: number;
}

export interface ComputedTakeoutLoan {
  /** Combined rate = prime + spread. */
  rate: number;
  /** Loan sized purely by DSCR coverage on stabilized NOI. */
  dscrImplied: number;
  /** Loan sized purely by LTV against stabilized valuation. */
  ltvImplied: number;
  /** Min(DSCR, LTV) — the binding constraint. */
  sized: number;
  bindingConstraint: "DSCR" | "LTV";
}

export interface ComputedWaterfall {
  notionalSale: number;
  constructionLoanPayback: number;
  deferredDCsPayback: number;
  dispositionFee: number;
  exitFindersFee: number;
  exitLegals: number;
  netDispositionProceeds: number;
  equityReturn: number;
  excessFinancing: number;
  totalDistribution: number;
  netProfit: number;
}

export interface ComputedReturns {
  totalEquity: number;
  totalDistribution: number;
  netProfit: number;
  /** Aggregate project IRR (XIRR on tranche contributions + distribution at stabilization). */
  projectIRR: number;
  /** Aggregate equity multiple (distribution / contribution). */
  projectEM: number;
  /** Project ROE = profit / contribution. */
  projectROE: number;
  classA: {
    contribution: number;
    distribution: number;
    profit: number;
    irr: number;
    em: number;
    roe: number;
  };
  classB: {
    contribution: number;
    distribution: number;
    profit: number;
    irr: number;
    em: number;
    roe: number;
  };
}

export interface ComputedDeal {
  massing: ComputedMassing;
  unitMix: Record<UnitTypeKey, UnitTypeComputed>;
  costs: ComputedCosts;
  sources: ComputedSources;
  rental: ComputedRental;
  takeout: ComputedTakeoutLoan;
  waterfall: ComputedWaterfall;
  returns: ComputedReturns;
}
