/**
 * XIRR — Newton's method, ported to match Excel's XIRR behaviour.
 *
 * Returns the annualised internal rate of return for a series of cashflows
 * with arbitrary dates. Excel sign convention: contributions are negative,
 * distributions are positive.
 *
 * Returns NaN if no convergence (e.g. all-positive or all-negative flows).
 */
export function xirr(values: number[], dates: Date[], guess = 0.1): number {
  if (values.length !== dates.length || values.length < 2) return NaN;
  const hasPos = values.some((v) => v > 0);
  const hasNeg = values.some((v) => v < 0);
  if (!hasPos || !hasNeg) return NaN;

  const t0 = dates[0].getTime();
  const years = dates.map((d) => (d.getTime() - t0) / (365 * 24 * 3600 * 1000));

  let rate = guess;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let i = 0; i < values.length; i++) {
      const t = years[i];
      const f = Math.pow(1 + rate, t);
      npv += values[i] / f;
      dnpv += (-t * values[i]) / (f * (1 + rate));
    }
    if (Math.abs(npv) < 1e-7) return rate;
    if (dnpv === 0) break;
    const next = rate - npv / dnpv;
    if (!isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }
  return NaN;
}
