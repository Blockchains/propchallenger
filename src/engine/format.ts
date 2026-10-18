/**
 * Display formatting rules (brief §12):
 *  - one or two decimal places by default;
 *  - tiny non-zero probabilities shown as "<0.01%", never as 0%;
 *  - values just below one shown as ">99.99%", never rounded up to 100%;
 *  - exactly 1 is shown as "100%" and must be paired with model-only wording by callers.
 */
export function formatProbability(x: number, decimals = 2): string {
  if (!Number.isFinite(x)) return '—';
  if (x <= 0) return '0%';
  const threshold = 10 ** -decimals / 100; // 0.01% for 2dp
  if (x < threshold) return `<${threshold * 100}%`;
  if (x >= 1) return '100%';
  if (x > 1 - threshold) return `>${(100 - threshold * 100).toFixed(decimals)}%`;
  return `${(x * 100).toFixed(decimals)}%`;
}

export function formatNumber(x: number | null, decimals = 2): string {
  if (x === null || !Number.isFinite(x)) return 'Undefined';
  return x.toFixed(decimals);
}

export function formatR(x: number): string {
  const sign = x > 0 ? '+' : x < 0 ? '−' : '';
  return `${sign}${Math.abs(x).toLocaleString('en-GB', { maximumFractionDigits: 3 })}R`;
}

export function formatMoney(x: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(x);
}

export function formatSignedPct(fraction: number, decimals = 2): string {
  const v = fraction * 100;
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(decimals)}%`;
}

const SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
export function tradesPhrase(n: number): string {
  const word = n <= 20 ? SMALL[n] : String(n);
  return `${word} ${n === 1 ? 'trade' : 'trades'}`;
}
