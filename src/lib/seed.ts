import type { Deal } from "./types";

/**
 * Seed deal — mirrors the "87 College Ave W" 6-storey workbook (Excel template
 * dated 2026-05-21). Values are copied directly from the source spreadsheet.
 */
export const seedDeal: Deal = {
  id: "87-college-ave-w",
  name: "87 College Ave W",
  property: {
    address: "87 College Ave W",
    city: "Guelph",
    propertyType: "Purpose-built rental",
    buildType: "Mid-rise",
    landAreaSF: 75653,
    buildingsOnLand: 1,
    zoningDurationMonths: 12,
    exitMonths: 60,
  },
  timeline: {
    startDate: "2026-06-01",
    horizonMonths: 53,
    saleMonth: 60,
  },
  massing: {
    storeys: 6,
    gcaAboveGrade: 161254,
    gfaDeduction: 23325,
    amenityArea: 24532,
    belowGradeArea: 39558,
    parkingStalls: 62,
    parkingRentPerStallMo: 100,
  },
  units: {
    studio: { beds: 0, avgSF: 0, count: 0, rentPerBed: 0 },
    oneBed: { beds: 1, avgSF: 0, count: 0, rentPerBed: 1135 },
    twoBed: { beds: 2, avgSF: 433, count: 21, rentPerBed: 1240 },
    threeBed: { beds: 3, avgSF: 620, count: 15, rentPerBed: 1358 },
    fourBed: { beds: 4, avgSF: 819, count: 116, rentPerBed: 1485 },
    fiveBed: { beds: 5, avgSF: 0, count: 0, rentPerBed: 1625 },
    sixBed: { beds: 6, avgSF: 0, count: 0, rentPerBed: 0 },
  },
  land: {
    purchasePrice: 7_000_000,
    landTransferTaxPct: 0.015,
    dueDiligence: 150_000,
    acquisitionFeePct: 0.025,
    findersFee: 200_000,
    insurance: 15_000,
    legalsAndTitle: 100_000,
    propertyTaxPct: 0,
    municipalTaxPct: 0.01166641,
  },
  hard: {
    constructionPerSF: 390,
    belowGradePerSF: 175,
    buildersRiskPct: 0.02,
    ffePerUnit: 2_500,
    ffeAmenity: 250_000,
    miscHard: 100_000,
    contingencyPct: 0.05,
    cmFeePct: 0.025,
  },
  soft: {
    consultantsPerSF: 12,
    professionalServices: 750_000,
    dmPreConPct: 0.04,
    dmConstructionPct: 0.04,
    softContingencyPct: 0.01,
  },
  fees: {
    dcPerUnit: { studio: 28_434, oneBed: 28_434, twoBed: 41_127, threePlusBed: 41_127 },
    educationDCPerUnit: 3_441,
    otherMunicipal: 115_000,
    dcUpfrontFraction: 1 / 3, // first two payments = 2 × (Total / 6) = 1/3
  },
  financing: {
    propertyTaxConstructionPct: 0.005,
    guaranteeFeePct: 0.01,
    commitmentFeePct: 0.01,
    otherLoanFeesPct: 0.0075,
    constructionLoanRate: 0.04,
    seniorDebtRate: 0.04,
  },
  capital: {
    // S&U!D104 = 0.75 — construction loan as % of equity contribution.
    constructionLoanPctOfEquity: 0.75,
    classAContributionPct: 0.8,
    classAProfitPct: 0.5,
  },
  rental: {
    vacancyPct: 0.05,
    opexPct: 0.30,
    capRate: 0.06,
    rentalGrowthPct: 0.0325,
    operatingYears: 8,
    ancillaryPct: 0.02,
  },
  takeout: {
    primeRate: 0.03,
    spread: 0.005,
    amortYears: 50,
    dscr: 1.10,
    ltv: 0.80,
  },
  exit: {
    dispositionFeePct: 0.01,
    exitFindersFee: 400_000,
    exitLegals: 50_000,
  },
};
