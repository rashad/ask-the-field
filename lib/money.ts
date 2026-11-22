export const PRICE_PER_BBL = 70;
export const PRICE_NOTE = `Lost revenue at an assumed $${PRICE_PER_BBL} a barrel (demo assumption).`;

export function usd(bbl: number) {
  const v = bbl * PRICE_PER_BBL;
  return v >= 1e6 ? `$${(v / 1e6).toFixed(1)} million` : `$${Math.round(v / 1000).toLocaleString("en-US")},000`;
}

export const about = (n: number) => (Math.round(n / 100) * 100).toLocaleString("en-US");
