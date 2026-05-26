import type {
  ComputedCosts,
  ComputedDeal,
  ComputedMassing,
  ComputedRental,
  ComputedReturns,
  ComputedSources,
  ComputedTakeoutLoan,
  ComputedWaterfall,
  Deal,
  OperatingYear,
  UnitTypeComputed,
  UnitTypeKey,
} from "../types";
import { xirr } from "./xirr";

const UNIT_TYPE_KEYS: UnitTypeKey[] = [
  "studio",
  "oneBed",
  "twoBed",
  "threeBed",
  "fourBed",
  "fiveBed",
  "sixBed",
];

function unitTypeDCKey(beds: number): "studio" | "oneBed" | "twoBed" | "threePlusBed" {
  if (beds === 0) return "studio";
  if (beds === 1) return "oneBed";
  if (beds === 2) return "twoBed";
  return "threePlusBed";
}

function addMonths(iso: string, months: number): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m - 1) + months, d));
}

function computeMassing(deal: Deal): ComputedMassing {
  const { gcaAboveGrade, gfaDeduction, amenityArea, parkingStalls, parkingRentPerStallMo } = deal.massing;
  const gfa = gcaAboveGrade - gfaDeduction;
  const leasableArea = gfa - amenityArea;
  const efficiency = leasableArea / gfa;

  let totalUnits = 0;
  let totalBeds = 0;
  let weightedSF = 0;
  for (const k of UNIT_TYPE_KEYS) {
    const u = deal.units[k];
    totalUnits += u.count;
    totalBeds += u.count * u.beds;
    weightedSF += u.count * u.avgSF;
  }
  const avgUnitSF = totalUnits > 0 ? weightedSF / totalUnits : 0;
  const parkingAnnual = parkingStalls * parkingRentPerStallMo * 12;

  return {
    gfa,
    nla: leasableArea,
    leasableArea,
    efficiency,
    totalUnits,
    totalBeds,
    avgUnitSF,
    parkingAnnual,
  };
}

function computeUnitMix(deal: Deal, m: ComputedMassing): Record<UnitTypeKey, UnitTypeComputed> {
  const out = {} as Record<UnitTypeKey, UnitTypeComputed>;
  for (const k of UNIT_TYPE_KEYS) {
    const u = deal.units[k];
    const nla = u.count * u.avgSF;
    const gfa = m.efficiency > 0 ? nla / m.efficiency : 0;
    const monthlyRentPerUnit = u.rentPerBed * u.beds;
    const monthlyRentYr1 = monthlyRentPerUnit * u.count;
    const annualRentYr1 = monthlyRentYr1 * 12;
    out[k] = {
      beds: u.beds,
      avgSF: u.avgSF,
      count: u.count,
      totalBeds: u.beds * u.count,
      nla,
      gfa,
      monthlyRentPerUnit,
      monthlyRentYr1,
      annualRentYr1,
    };
  }
  return out;
}

function computeCosts(deal: Deal, m: ComputedMassing): ComputedCosts {
  const { land, hard, soft, fees, financing, massing } = deal;

  // ---- Land ----
  const purchase = land.purchasePrice;
  const landTransferTax = purchase * land.landTransferTaxPct;
  const acquisitionFee = purchase * land.acquisitionFeePct;
  const propertyTax = purchase * land.propertyTaxPct;
  const municipalTax = purchase * land.municipalTaxPct;
  const landTotal =
    purchase +
    landTransferTax +
    land.dueDiligence +
    acquisitionFee +
    land.findersFee +
    land.insurance +
    land.legalsAndTitle +
    propertyTax +
    municipalTax;

  // ---- Hard costs ----
  const construction = hard.constructionPerSF * m.gfa;
  const belowGrade = hard.belowGradePerSF * massing.belowGradeArea;
  const cmFee = hard.cmFeePct * construction;
  const contingency = hard.contingencyPct * (construction + cmFee);
  const buildersRisk = hard.buildersRiskPct * (construction + contingency + cmFee);
  const ffe = hard.ffePerUnit * m.totalUnits;
  const hardTotal =
    construction + belowGrade + buildersRisk + ffe + hard.ffeAmenity + hard.miscHard + cmFee + contingency;

  // ---- Municipal fees ----
  let devCharges = 0;
  let educationDC = 0;
  for (const k of UNIT_TYPE_KEYS) {
    const u = deal.units[k];
    devCharges += u.count * fees.dcPerUnit[unitTypeDCKey(u.beds)];
    educationDC += u.count * fees.educationDCPerUnit;
  }

  // ---- Soft costs ----
  const consultants = soft.consultantsPerSF * m.gfa;
  const professionalServices = soft.professionalServices;
  // S&U!K74 — DM Pre-Con = 4% × Total Dev Cost (land + hard + soft + financing) × 40%.
  // To avoid a circular calc we approximate against (land + hard + non-DM soft + non-finance soft + DCs).
  const softPreDM =
    consultants + professionalServices + devCharges + educationDC + fees.otherMunicipal;
  const tdcEstimate = landTotal + hardTotal + softPreDM;
  const dmPreCon = soft.dmPreConPct * tdcEstimate * 0.4;
  const dmConstruction = soft.dmConstructionPct * tdcEstimate * 0.6;
  const softContingency =
    soft.softContingencyPct * (softPreDM + dmPreCon + dmConstruction);
  const softTotal = softPreDM + dmPreCon + dmConstruction + softContingency;

  // ---- Financing ----
  const propertyTaxConstruction = financing.propertyTaxConstructionPct * (landTotal + hardTotal);
  // Construction loan size is derived from equity, but financing fees depend on
  // construction loan — so we estimate against an interim equity. A second pass
  // could close the loop; for MVP the error is < 1% of TPC.
  const interimEquity = landTotal + hardTotal + softTotal;
  const interimLoan = interimEquity * deal.capital.constructionLoanPctOfEquity;
  const guaranteeFee = financing.guaranteeFeePct * interimLoan;
  const commitmentFee = financing.commitmentFeePct * interimLoan;
  const otherLoanFees = financing.otherLoanFeesPct * interimLoan;
  // Senior debt interest — approximated as rate × loan × half of construction
  // period (assumes straight-line draw). Construction period = horizonMonths - 12
  // operating buffer, floored at 12. Excel uses a full monthly grid; this is a
  // close-enough annualised proxy for MVP.
  const constructionMonths = Math.max(deal.timeline.horizonMonths - 12, 12);
  const seniorDebtInterest =
    financing.constructionLoanRate * interimLoan * (constructionMonths / 12) * 0.5;
  const financingTotal =
    propertyTaxConstruction + guaranteeFee + commitmentFee + otherLoanFees + seniorDebtInterest;

  const totalProjectCost = landTotal + hardTotal + softTotal + financingTotal;

  return {
    land: {
      purchase,
      landTransferTax,
      dueDiligence: land.dueDiligence,
      acquisitionFee,
      findersFee: land.findersFee,
      insurance: land.insurance,
      legalsAndTitle: land.legalsAndTitle,
      propertyTax,
      municipalTax,
      total: landTotal,
    },
    hard: {
      construction,
      belowGrade,
      buildersRisk,
      ffe,
      ffeAmenity: hard.ffeAmenity,
      misc: hard.miscHard,
      cmFee,
      contingency,
      total: hardTotal,
    },
    soft: {
      consultants,
      professionalServices,
      dmPreCon,
      dmConstruction,
      contingency: softContingency,
      devCharges,
      educationDC,
      otherMunicipal: fees.otherMunicipal,
      total: softTotal,
    },
    financing: {
      propertyTaxConstruction,
      guaranteeFee,
      commitmentFee,
      otherLoanFees,
      seniorDebtInterest,
      total: financingTotal,
    },
    totalProjectCost,
  };
}

function computeRental(deal: Deal, m: ComputedMassing, totalProjectCost: number): ComputedRental {
  const { rental } = deal;
  // Year-1 monthly $PSF — weighted by NLA across unit types.
  let weightedRentMonthly = 0;
  let totalNLA = 0;
  for (const k of UNIT_TYPE_KEYS) {
    const u = deal.units[k];
    const nla = u.count * u.avgSF;
    const monthlyRent = u.rentPerBed * u.beds * u.count;
    weightedRentMonthly += monthlyRent;
    totalNLA += nla;
  }
  const yr1RentPSF = totalNLA > 0 ? weightedRentMonthly / totalNLA : 0;

  // Ancillary income Year-1 — Excel uses Unit Mix!H18 = ancillaryPct × avg monthly rent PSF × NLA × 12.
  const yr1Ancillary = rental.ancillaryPct * yr1RentPSF * totalNLA * 12;
  const yr1Parking = m.parkingAnnual;

  const years: OperatingYear[] = [];
  for (let y = 1; y <= rental.operatingYears; y++) {
    const growthFactor = Math.pow(1 + rental.rentalGrowthPct, y - 1);
    const rentPSF = yr1RentPSF * growthFactor;
    const annualRentalIncome = rentPSF * totalNLA * 12;
    const parkingIncome = yr1Parking * Math.pow(1 + rental.rentalGrowthPct, y - 1);
    const ancillaryIncome = yr1Ancillary * growthFactor;
    const grossIncome = annualRentalIncome + parkingIncome;
    const vacancy = grossIncome * rental.vacancyPct;
    const egr = grossIncome - vacancy;
    const opex = -egr * rental.opexPct;
    const noi = egr + opex + ancillaryIncome;
    const valuation = rental.capRate > 0 ? noi / rental.capRate : 0;
    const yoc = totalProjectCost > 0 ? noi / totalProjectCost : 0;
    years.push({
      year: y,
      rentPSF,
      annualRentalIncome,
      parkingIncome,
      ancillaryIncome,
      grossIncome,
      vacancy,
      egr,
      opex,
      noi,
      valuation,
      yoc,
    });
  }

  // Stabilization = year 5 by convention (matches Excel's tranche schedule).
  const stabIndex = Math.min(4, years.length - 1);
  const stabilizationNOI = years[stabIndex]?.noi ?? 0;
  const stabilizationValue = rental.capRate > 0 ? stabilizationNOI / rental.capRate : 0;
  const monthlyNOIAtStab = stabilizationNOI / 12;

  return { years, stabilizationNOI, stabilizationValue, monthlyNOIAtStab };
}

function computeSources(deal: Deal, costs: ComputedCosts, rental: ComputedRental): ComputedSources {
  // Deferred DCs = (1 - upfront) × Dev Charges.
  const deferredDCs = (1 - deal.fees.dcUpfrontFraction) * costs.soft.devCharges;
  // Pre-stab income = 6 months × monthly NOI at stabilization (S&U!K105).
  const preStabIncome = 6 * rental.monthlyNOIAtStab;

  // S&U!K104 = K107 × constructionLoanPctOfEquity  (construction loan as 75% of equity contribution).
  // S&U!K107 = TPC - debt - preStab - deferredDCs → equity = TPC - 0.75×equity - preStab - deferredDCs.
  // Solve for equity: equity × (1 + 0.75) = TPC - preStab - deferredDCs.
  const k = deal.capital.constructionLoanPctOfEquity;
  const equity = (costs.totalProjectCost - preStabIncome - deferredDCs) / (1 + k);
  const constructionLoan = equity * k;
  const total = constructionLoan + equity + preStabIncome + deferredDCs;

  const classAContribution = equity * deal.capital.classAContributionPct;
  const classBContribution = equity - classAContribution;

  return {
    constructionLoan,
    deferredDCs,
    preStabIncome,
    equity,
    total,
    classAContribution,
    classBContribution,
  };
}

function computeTakeoutLoan(deal: Deal, rental: ComputedRental): ComputedTakeoutLoan {
  const { takeout } = deal;
  const rate = takeout.primeRate + takeout.spread;
  // DSCR sizing: max loan such that monthly P&I × DSCR ≤ stabilized NOI/12.
  // -PV(rate/12, amort×12, payment/month) gives loan principal.
  const nper = takeout.amortYears * 12;
  const monthlyRate = rate / 12;
  const maxMonthlyPayment = rental.stabilizationNOI / takeout.dscr / 12;
  const dscrImplied =
    monthlyRate > 0
      ? (maxMonthlyPayment * (1 - Math.pow(1 + monthlyRate, -nper))) / monthlyRate
      : maxMonthlyPayment * nper;
  const ltvImplied = rental.stabilizationValue * takeout.ltv;
  const sized = Math.min(dscrImplied, ltvImplied);
  const bindingConstraint = sized === dscrImplied ? "DSCR" : "LTV";
  return { rate, dscrImplied, ltvImplied, sized, bindingConstraint };
}

function computeWaterfall(
  deal: Deal,
  costs: ComputedCosts,
  sources: ComputedSources,
  rental: ComputedRental,
): ComputedWaterfall {
  const notionalSale = rental.stabilizationValue;
  const constructionLoanPayback = -sources.constructionLoan;
  const deferredDCsPayback = -sources.deferredDCs;
  const dispositionFee = -deal.exit.dispositionFeePct * notionalSale;
  const exitFindersFee = -deal.exit.exitFindersFee;
  const exitLegals = -deal.exit.exitLegals;
  const netDispositionProceeds =
    notionalSale + constructionLoanPayback + deferredDCsPayback + dispositionFee + exitFindersFee + exitLegals;
  const equityReturn = -sources.equity;
  const excessFinancing = netDispositionProceeds + equityReturn; // equityReturn is negative
  const totalDistribution = netDispositionProceeds;
  const netProfit = totalDistribution - sources.equity;
  return {
    notionalSale,
    constructionLoanPayback,
    deferredDCsPayback,
    dispositionFee,
    exitFindersFee,
    exitLegals,
    netDispositionProceeds,
    equityReturn,
    excessFinancing,
    totalDistribution,
    netProfit,
  };
}

function computeReturns(
  deal: Deal,
  sources: ComputedSources,
  waterfall: ComputedWaterfall,
): ComputedReturns {
  const totalEquity = sources.equity;
  const totalDistribution = waterfall.totalDistribution;
  const netProfit = totalDistribution - totalEquity;
  const projectROE = totalEquity > 0 ? netProfit / totalEquity : 0;
  const projectEM = totalEquity > 0 ? totalDistribution / totalEquity : 0;

  // Cashflow timing — single contribution at start, distribution at sale month.
  // (MVP: full S-curve tranche scheduling is deferred.)
  const t0 = addMonths(deal.timeline.startDate, 0);
  const tExit = addMonths(deal.timeline.startDate, deal.timeline.saleMonth);
  const projectIRR = xirr([-totalEquity, totalDistribution], [t0, tExit]);

  // Class A / B splits.
  const aContribPct = deal.capital.classAContributionPct;
  const aProfitPct = deal.capital.classAProfitPct;
  const bContribPct = 1 - aContribPct;
  const bProfitPct = 1 - aProfitPct;

  const aContribution = totalEquity * aContribPct;
  const bContribution = totalEquity * bContribPct;
  const aProfit = netProfit * aProfitPct;
  const bProfit = netProfit * bProfitPct;
  const aDistribution = aContribution + aProfit;
  const bDistribution = bContribution + bProfit;

  const aIRR = xirr([-aContribution, aDistribution], [t0, tExit]);
  const bIRR = xirr([-bContribution, bDistribution], [t0, tExit]);

  return {
    totalEquity,
    totalDistribution,
    netProfit,
    projectIRR,
    projectEM,
    projectROE,
    classA: {
      contribution: aContribution,
      distribution: aDistribution,
      profit: aProfit,
      irr: aIRR,
      em: aContribution > 0 ? aDistribution / aContribution : 0,
      roe: aContribution > 0 ? aProfit / aContribution : 0,
    },
    classB: {
      contribution: bContribution,
      distribution: bDistribution,
      profit: bProfit,
      irr: bIRR,
      em: bContribution > 0 ? bDistribution / bContribution : 0,
      roe: bContribution > 0 ? bProfit / bContribution : 0,
    },
  };
}

export function computeDeal(deal: Deal): ComputedDeal {
  const massing = computeMassing(deal);
  const unitMix = computeUnitMix(deal, massing);
  const costs = computeCosts(deal, massing);
  const rental = computeRental(deal, massing, costs.totalProjectCost);
  const sources = computeSources(deal, costs, rental);
  const takeout = computeTakeoutLoan(deal, rental);
  const waterfall = computeWaterfall(deal, costs, sources, rental);
  const returns = computeReturns(deal, sources, waterfall);
  return { massing, unitMix, costs, sources, rental, takeout, waterfall, returns };
}
