const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const money = (value: number | string | null | undefined) => inr.format(Number(value ?? 0));

/** Formats 'YYYY-MM-DD' or ISO timestamps as "15 Jul 2026" without timezone drift for plain dates. */
export const date = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** "2026-09" -> "Sep 2026" */
export const monthLabel = (value: string | null | undefined) => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return '—';
  return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

/** snake_case -> "Sentence case" */
export const label = (value: string | null | undefined) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : '—';

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
