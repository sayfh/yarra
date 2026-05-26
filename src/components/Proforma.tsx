"use client";

import { useMemo, useState } from "react";
import { computeDeal } from "@/lib/calc/engine";
import { fmtCurrency, fmtMultiple, fmtNumber, fmtPct } from "@/lib/format";
import type { Deal } from "@/lib/types";

type Tab = "summary" | "massing" | "units" | "costs" | "sources" | "rental" | "waterfall" | "returns";

const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "massing", label: "Massing" },
  { key: "units", label: "Unit Mix" },
  { key: "costs", label: "Sources & Uses" },
  { key: "sources", label: "Capital Stack" },
  { key: "rental", label: "Rental Ops" },
  { key: "waterfall", label: "Waterfall" },
  { key: "returns", label: "Returns" },
];

interface Props {
  deal: Deal;
}

export default function Proforma({ deal }: Props) {
  const [tab, setTab] = useState<Tab>("summary");
  const c = useMemo(() => computeDeal(deal), [deal]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-rule bg-paper px-6 pt-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold">{deal.name}</h1>
            <p className="text-xs text-muted">
              {deal.property.address}, {deal.property.city} ·
              {" "}{deal.massing.storeys}-storey · GFA {fmtNumber(c.massing.gfa)} SF · {c.massing.totalUnits} units
            </p>
          </div>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
            Live
          </span>
        </div>
        <nav className="-mb-px mt-3 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "border-b-2 px-3 py-2 text-sm transition-colors " +
                (tab === t.key
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink")
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
        {tab === "summary" && <SummaryTab deal={deal} c={c} />}
        {tab === "massing" && <MassingTab deal={deal} c={c} />}
        {tab === "units" && <UnitsTab deal={deal} c={c} />}
        {tab === "costs" && <CostsTab deal={deal} c={c} />}
        {tab === "sources" && <SourcesTab deal={deal} c={c} />}
        {tab === "rental" && <RentalTab deal={deal} c={c} />}
        {tab === "waterfall" && <WaterfallTab deal={deal} c={c} />}
        {tab === "returns" && <ReturnsTab deal={deal} c={c} />}
      </div>
    </div>
  );
}

/* ---------- Shared atoms ---------- */

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-rule px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="num mt-1 text-lg font-medium">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function Row({ label, value, indent = 0, strong = false }: { label: string; value: string; indent?: number; strong?: boolean }) {
  return (
    <div className={"flex justify-between border-b border-rule py-1.5 text-sm " + (strong ? "font-medium" : "")}>
      <span style={{ paddingLeft: indent * 12 }} className={strong ? "" : "text-ink"}>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{children}</h3>;
}

/* ---------- Tabs ---------- */

function SummaryTab({ deal, c }: { deal: Deal; c: ReturnType<typeof computeDeal> }) {
  const yr5 = c.rental.years[4];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KPI label="Total Project Cost" value={fmtCurrency(c.costs.totalProjectCost, { compact: true })} sub={`${fmtCurrency(c.costs.totalProjectCost / c.massing.gfa, { decimals: 0 })}/SF GFA`} />
        <KPI label="Equity Required" value={fmtCurrency(c.sources.equity, { compact: true })} sub={`${fmtPct(c.sources.equity / c.costs.totalProjectCost, 1)} of TPC`} />
        <KPI label="Construction Loan" value={fmtCurrency(c.sources.constructionLoan, { compact: true })} sub={`${fmtPct(c.sources.constructionLoan / c.costs.totalProjectCost, 1)} of TPC`} />
        <KPI label="Stab. NOI (Yr 5)" value={fmtCurrency(c.rental.stabilizationNOI, { compact: true })} />
        <KPI label="Stab. Value" value={fmtCurrency(c.rental.stabilizationValue, { compact: true })} sub={`@ ${fmtPct(deal.rental.capRate, 2)} cap`} />
        <KPI label="Yield on Cost (Yr 5)" value={fmtPct(yr5?.yoc ?? 0)} />
        <KPI label="Project IRR" value={fmtPct(c.returns.projectIRR)} />
        <KPI label="Equity Multiple" value={fmtMultiple(c.returns.projectEM)} />
        <KPI label="Project ROE" value={fmtPct(c.returns.projectROE)} />
        <KPI label="Net Profit" value={fmtCurrency(c.returns.netProfit, { compact: true })} />
        <KPI label="Takeout Loan" value={fmtCurrency(c.takeout.sized, { compact: true })} sub={`${c.takeout.bindingConstraint} binding`} />
        <KPI label="Class A IRR" value={fmtPct(c.returns.classA.irr)} sub={`EM ${c.returns.classA.em.toFixed(2)}x`} />
      </div>

      <SectionTitle>Uses</SectionTitle>
      <Row label="Land Costs" value={fmtCurrency(c.costs.land.total)} />
      <Row label="Hard Costs" value={fmtCurrency(c.costs.hard.total)} />
      <Row label="Soft Costs" value={fmtCurrency(c.costs.soft.total)} />
      <Row label="Financing Costs" value={fmtCurrency(c.costs.financing.total)} />
      <Row label="Total Project Cost" value={fmtCurrency(c.costs.totalProjectCost)} strong />

      <SectionTitle>Sources</SectionTitle>
      <Row label="Construction Loan" value={fmtCurrency(c.sources.constructionLoan)} />
      <Row label="Deferred DCs" value={fmtCurrency(c.sources.deferredDCs)} />
      <Row label="Pre-Stab Income" value={fmtCurrency(c.sources.preStabIncome)} />
      <Row label="Equity" value={fmtCurrency(c.sources.equity)} />
      <Row label="Total Sources" value={fmtCurrency(c.sources.total)} strong />
    </div>
  );
}

function MassingTab({ deal, c }: { deal: Deal; c: ReturnType<typeof computeDeal> }) {
  return (
    <div>
      <SectionTitle>Building</SectionTitle>
      <Row label="Storeys" value={fmtNumber(deal.massing.storeys)} />
      <Row label="GCA Above Grade" value={`${fmtNumber(deal.massing.gcaAboveGrade)} SF`} />
      <Row label="GFA Deduction (TARE)" value={`${fmtNumber(deal.massing.gfaDeduction)} SF`} />
      <Row label="GFA" value={`${fmtNumber(c.massing.gfa)} SF`} strong />
      <Row label="Amenity Area" value={`${fmtNumber(deal.massing.amenityArea)} SF`} />
      <Row label="Leasable Area (NLA)" value={`${fmtNumber(c.massing.nla)} SF`} strong />
      <Row label="NLA / GFA Efficiency" value={fmtPct(c.massing.efficiency, 1)} />
      <Row label="Below-Grade Area" value={`${fmtNumber(deal.massing.belowGradeArea)} SF`} />

      <SectionTitle>Parking</SectionTitle>
      <Row label="Stalls" value={fmtNumber(deal.massing.parkingStalls)} />
      <Row label="Monthly rent / stall" value={fmtCurrency(deal.massing.parkingRentPerStallMo)} />
      <Row label="Annual parking revenue" value={fmtCurrency(c.massing.parkingAnnual)} strong />

      <SectionTitle>Land</SectionTitle>
      <Row label="Land Area" value={`${fmtNumber(deal.property.landAreaSF)} SF`} />
      <Row label="Density" value={`${fmtNumber(c.massing.gfa / deal.property.landAreaSF, 2)} FAR`} />
    </div>
  );
}

function UnitsTab({ c }: { deal: Deal; c: ReturnType<typeof computeDeal> }) {
  const rows = Object.entries(c.unitMix).filter(([, u]) => u.count > 0);
  return (
    <div>
      <SectionTitle>Unit Mix</SectionTitle>
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-muted">
          <tr className="border-b border-rule">
            <th className="py-2 text-left">Type</th>
            <th className="py-2 text-right">Beds</th>
            <th className="py-2 text-right">Count</th>
            <th className="py-2 text-right">SF/Unit</th>
            <th className="py-2 text-right">NLA</th>
            <th className="py-2 text-right">Rent/Unit/Mo</th>
            <th className="py-2 text-right">Annual Rent</th>
          </tr>
        </thead>
        <tbody className="num">
          {rows.map(([key, u]) => (
            <tr key={key} className="border-b border-rule">
              <td className="py-1.5 text-left">{key}</td>
              <td className="py-1.5 text-right">{u.beds}</td>
              <td className="py-1.5 text-right">{u.count}</td>
              <td className="py-1.5 text-right">{fmtNumber(u.avgSF)}</td>
              <td className="py-1.5 text-right">{fmtNumber(u.nla)}</td>
              <td className="py-1.5 text-right">{fmtCurrency(u.monthlyRentPerUnit)}</td>
              <td className="py-1.5 text-right">{fmtCurrency(u.annualRentYr1)}</td>
            </tr>
          ))}
          <tr className="font-medium">
            <td className="py-2 text-left">Total</td>
            <td className="py-2 text-right">{c.massing.totalBeds}</td>
            <td className="py-2 text-right">{c.massing.totalUnits}</td>
            <td className="py-2 text-right">{fmtNumber(c.massing.avgUnitSF)}</td>
            <td className="py-2 text-right">{fmtNumber(c.massing.nla)}</td>
            <td className="py-2 text-right">—</td>
            <td className="py-2 text-right">
              {fmtCurrency(Object.values(c.unitMix).reduce((s, u) => s + u.annualRentYr1, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CostsTab({ c }: { deal: Deal; c: ReturnType<typeof computeDeal> }) {
  return (
    <div>
      <SectionTitle>Land Costs</SectionTitle>
      <Row label="Purchase Price" value={fmtCurrency(c.costs.land.purchase)} />
      <Row label="Land Transfer Tax" value={fmtCurrency(c.costs.land.landTransferTax)} />
      <Row label="Due Diligence" value={fmtCurrency(c.costs.land.dueDiligence)} />
      <Row label="Acquisition Fee" value={fmtCurrency(c.costs.land.acquisitionFee)} />
      <Row label="Finder's Fee" value={fmtCurrency(c.costs.land.findersFee)} />
      <Row label="Insurance" value={fmtCurrency(c.costs.land.insurance)} />
      <Row label="Legals & Title" value={fmtCurrency(c.costs.land.legalsAndTitle)} />
      <Row label="Municipal Tax" value={fmtCurrency(c.costs.land.municipalTax)} />
      <Row label="Total Land" value={fmtCurrency(c.costs.land.total)} strong />

      <SectionTitle>Hard Costs</SectionTitle>
      <Row label="Construction" value={fmtCurrency(c.costs.hard.construction)} />
      <Row label="Below Grade" value={fmtCurrency(c.costs.hard.belowGrade)} />
      <Row label="CM Fee" value={fmtCurrency(c.costs.hard.cmFee)} />
      <Row label="Contingency" value={fmtCurrency(c.costs.hard.contingency)} />
      <Row label="Builders Risk" value={fmtCurrency(c.costs.hard.buildersRisk)} />
      <Row label="FF&E" value={fmtCurrency(c.costs.hard.ffe)} />
      <Row label="FF&E (Amenity)" value={fmtCurrency(c.costs.hard.ffeAmenity)} />
      <Row label="Misc Hard" value={fmtCurrency(c.costs.hard.misc)} />
      <Row label="Total Hard" value={fmtCurrency(c.costs.hard.total)} strong />

      <SectionTitle>Soft Costs</SectionTitle>
      <Row label="Consultants" value={fmtCurrency(c.costs.soft.consultants)} />
      <Row label="Professional Services" value={fmtCurrency(c.costs.soft.professionalServices)} />
      <Row label="Development Charges" value={fmtCurrency(c.costs.soft.devCharges)} />
      <Row label="Education DCs" value={fmtCurrency(c.costs.soft.educationDC)} />
      <Row label="Other Municipal" value={fmtCurrency(c.costs.soft.otherMunicipal)} />
      <Row label="DM Pre-Con" value={fmtCurrency(c.costs.soft.dmPreCon)} />
      <Row label="DM Construction" value={fmtCurrency(c.costs.soft.dmConstruction)} />
      <Row label="Soft Contingency" value={fmtCurrency(c.costs.soft.contingency)} />
      <Row label="Total Soft" value={fmtCurrency(c.costs.soft.total)} strong />

      <SectionTitle>Financing Costs</SectionTitle>
      <Row label="Property Tax (Construction)" value={fmtCurrency(c.costs.financing.propertyTaxConstruction)} />
      <Row label="Guarantee Fee" value={fmtCurrency(c.costs.financing.guaranteeFee)} />
      <Row label="Commitment Fee" value={fmtCurrency(c.costs.financing.commitmentFee)} />
      <Row label="Other Loan Fees" value={fmtCurrency(c.costs.financing.otherLoanFees)} />
      <Row label="Senior Debt Interest" value={fmtCurrency(c.costs.financing.seniorDebtInterest)} />
      <Row label="Total Financing" value={fmtCurrency(c.costs.financing.total)} strong />

      <SectionTitle>Total</SectionTitle>
      <Row label="Total Project Cost" value={fmtCurrency(c.costs.totalProjectCost)} strong />
    </div>
  );
}

function SourcesTab({ deal, c }: { deal: Deal; c: ReturnType<typeof computeDeal> }) {
  return (
    <div>
      <SectionTitle>Sources of Capital</SectionTitle>
      <Row label="Construction Loan" value={fmtCurrency(c.sources.constructionLoan)} />
      <Row label="Deferred DCs" value={fmtCurrency(c.sources.deferredDCs)} />
      <Row label="Pre-Stabilized Income" value={fmtCurrency(c.sources.preStabIncome)} />
      <Row label="Equity" value={fmtCurrency(c.sources.equity)} strong />
      <Row label="Total Sources" value={fmtCurrency(c.sources.total)} strong />

      <SectionTitle>Equity Splits</SectionTitle>
      <Row
        label={`Class A (${fmtPct(deal.capital.classAContributionPct, 0)} contribution / ${fmtPct(deal.capital.classAProfitPct, 0)} profit)`}
        value={fmtCurrency(c.sources.classAContribution)}
      />
      <Row
        label={`Class B (${fmtPct(1 - deal.capital.classAContributionPct, 0)} contribution / ${fmtPct(1 - deal.capital.classAProfitPct, 0)} profit)`}
        value={fmtCurrency(c.sources.classBContribution)}
      />

      <SectionTitle>Takeout Loan Sizing</SectionTitle>
      <Row label="Combined rate" value={fmtPct(c.takeout.rate, 2)} />
      <Row label="Amortization (yrs)" value={fmtNumber(deal.takeout.amortYears)} />
      <Row label="DSCR target" value={`${deal.takeout.dscr.toFixed(2)}x`} />
      <Row label="Max LTV" value={fmtPct(deal.takeout.ltv, 0)} />
      <Row label="DSCR-implied" value={fmtCurrency(c.takeout.dscrImplied)} />
      <Row label="LTV-implied" value={fmtCurrency(c.takeout.ltvImplied)} />
      <Row label={`Sized (${c.takeout.bindingConstraint} binding)`} value={fmtCurrency(c.takeout.sized)} strong />
    </div>
  );
}

function RentalTab({ deal, c }: { deal: Deal; c: ReturnType<typeof computeDeal> }) {
  return (
    <div>
      <SectionTitle>Operating Assumptions</SectionTitle>
      <Row label="Vacancy" value={fmtPct(deal.rental.vacancyPct, 1)} />
      <Row label="Operating Expense" value={fmtPct(deal.rental.opexPct, 1)} />
      <Row label="Rental Growth" value={fmtPct(deal.rental.rentalGrowthPct, 2)} />
      <Row label="Cap Rate" value={fmtPct(deal.rental.capRate, 2)} />
      <Row label="Ancillary Income" value={fmtPct(deal.rental.ancillaryPct, 1)} />

      <SectionTitle>Multi-Year Operating</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted">
            <tr className="border-b border-rule">
              <th className="py-2 text-left">Year</th>
              <th className="py-2 text-right">Rent PSF</th>
              <th className="py-2 text-right">Rental Income</th>
              <th className="py-2 text-right">Parking</th>
              <th className="py-2 text-right">Ancillary</th>
              <th className="py-2 text-right">EGR</th>
              <th className="py-2 text-right">OpEx</th>
              <th className="py-2 text-right">NOI</th>
              <th className="py-2 text-right">Value @ Cap</th>
              <th className="py-2 text-right">YoC</th>
            </tr>
          </thead>
          <tbody className="num">
            {c.rental.years.map((y) => (
              <tr key={y.year} className="border-b border-rule">
                <td className="py-1.5 text-left">{y.year}</td>
                <td className="py-1.5 text-right">{fmtCurrency(y.rentPSF, { decimals: 2 })}</td>
                <td className="py-1.5 text-right">{fmtCurrency(y.annualRentalIncome)}</td>
                <td className="py-1.5 text-right">{fmtCurrency(y.parkingIncome)}</td>
                <td className="py-1.5 text-right">{fmtCurrency(y.ancillaryIncome)}</td>
                <td className="py-1.5 text-right">{fmtCurrency(y.egr)}</td>
                <td className="py-1.5 text-right">{fmtCurrency(y.opex)}</td>
                <td className="py-1.5 text-right">{fmtCurrency(y.noi)}</td>
                <td className="py-1.5 text-right">{fmtCurrency(y.valuation)}</td>
                <td className="py-1.5 text-right">{fmtPct(y.yoc, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Stabilization</SectionTitle>
      <Row label="Stabilization NOI" value={fmtCurrency(c.rental.stabilizationNOI)} strong />
      <Row label="Stabilization Value" value={fmtCurrency(c.rental.stabilizationValue)} strong />
      <Row label="Monthly NOI at Stab" value={fmtCurrency(c.rental.monthlyNOIAtStab)} />
    </div>
  );
}

function WaterfallTab({ c }: { deal: Deal; c: ReturnType<typeof computeDeal> }) {
  return (
    <div>
      <SectionTitle>Disposition</SectionTitle>
      <Row label="Notional Sale Price" value={fmtCurrency(c.waterfall.notionalSale)} />
      <Row label="Construction Loan Payback" value={fmtCurrency(c.waterfall.constructionLoanPayback)} />
      <Row label="Deferred DCs Payback" value={fmtCurrency(c.waterfall.deferredDCsPayback)} />
      <Row label="Disposition Fee" value={fmtCurrency(c.waterfall.dispositionFee)} />
      <Row label="Exit Finder's Fee" value={fmtCurrency(c.waterfall.exitFindersFee)} />
      <Row label="Exit Legals" value={fmtCurrency(c.waterfall.exitLegals)} />
      <Row label="Net Disposition Proceeds" value={fmtCurrency(c.waterfall.netDispositionProceeds)} strong />

      <SectionTitle>Equity Distribution</SectionTitle>
      <Row label="Return of Equity" value={fmtCurrency(c.waterfall.equityReturn)} />
      <Row label="Excess Financing" value={fmtCurrency(c.waterfall.excessFinancing)} />
      <Row label="Total Distribution" value={fmtCurrency(c.waterfall.totalDistribution)} strong />
      <Row label="Net Profit" value={fmtCurrency(c.waterfall.netProfit)} strong />
    </div>
  );
}

function ReturnsTab({ c }: { deal: Deal; c: ReturnType<typeof computeDeal> }) {
  return (
    <div>
      <SectionTitle>Project Returns</SectionTitle>
      <Row label="Total Equity" value={fmtCurrency(c.returns.totalEquity)} />
      <Row label="Total Distribution" value={fmtCurrency(c.returns.totalDistribution)} />
      <Row label="Net Profit" value={fmtCurrency(c.returns.netProfit)} strong />
      <Row label="ROE" value={fmtPct(c.returns.projectROE)} />
      <Row label="Equity Multiple" value={fmtMultiple(c.returns.projectEM)} />
      <Row label="IRR" value={fmtPct(c.returns.projectIRR)} strong />

      <SectionTitle>Class A (LP)</SectionTitle>
      <Row label="Contribution" value={fmtCurrency(c.returns.classA.contribution)} />
      <Row label="Distribution" value={fmtCurrency(c.returns.classA.distribution)} />
      <Row label="Profit" value={fmtCurrency(c.returns.classA.profit)} />
      <Row label="ROE" value={fmtPct(c.returns.classA.roe)} />
      <Row label="EM" value={fmtMultiple(c.returns.classA.em)} />
      <Row label="IRR" value={fmtPct(c.returns.classA.irr)} strong />

      <SectionTitle>Class B (GP)</SectionTitle>
      <Row label="Contribution" value={fmtCurrency(c.returns.classB.contribution)} />
      <Row label="Distribution" value={fmtCurrency(c.returns.classB.distribution)} />
      <Row label="Profit" value={fmtCurrency(c.returns.classB.profit)} />
      <Row label="ROE" value={fmtPct(c.returns.classB.roe)} />
      <Row label="EM" value={fmtMultiple(c.returns.classB.em)} />
      <Row label="IRR" value={fmtPct(c.returns.classB.irr)} strong />
    </div>
  );
}
