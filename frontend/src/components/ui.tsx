import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';
import { ApiError, errorMessage } from '../lib/api';
import { label as toLabel } from '../lib/format';
import type { Pagination as PaginationInfo } from '../lib/types';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

/* ---------- Button ---------- */

const buttonVariants = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken',
  ghost: 'text-ink hover:bg-sunken',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 shadow-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: ReactNode;
}

/** Button styling, also used for router links that should look like buttons. */
export const buttonCls = (variant: keyof typeof buttonVariants = 'primary', size: 'sm' | 'md' = 'md') =>
  cx(
    'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,transform] duration-150 active:scale-[0.97]',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    size === 'sm' ? 'min-h-9 px-3' : 'min-h-11 px-4',
    buttonVariants[variant],
  );

/** Inline text link. */
export const linkCls = 'font-medium text-brand-700 underline-offset-2 hover:underline';

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={cx(buttonCls(variant, size), className)}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/* ---------- Surfaces ---------- */

export function Card({ className, children, as: Tag = 'section' }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={cx('rounded-card border border-line bg-surface shadow-card', className)}>{children}</Tag>;
}

export function CardHeader({ title, action, description }: { title: string; action?: ReactNode; description?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'brand' }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: 'brand' | 'amber' | 'danger' | 'info' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-100 text-amber-700',
    danger: 'bg-danger-100 text-danger-700',
    info: 'bg-info-100 text-info-700',
  };
  return (
    <Card as="div" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg sm:size-10', tones[tone])} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="tabular mt-0.5 text-xl font-semibold tracking-tight break-words sm:text-2xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  );
}

/* ---------- Badges ---------- */

const toneClasses = {
  neutral: 'bg-sunken text-muted ring-line-strong',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  amber: 'bg-amber-100 text-amber-700 ring-amber-400/40',
  danger: 'bg-danger-100 text-danger-700 ring-danger-600/25',
  info: 'bg-info-100 text-info-700 ring-info-700/20',
};
type Tone = keyof typeof toneClasses;

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', toneClasses[tone])}>
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  pending: 'amber', waitlisted: 'info', approved: 'brand', rejected: 'danger', cancelled: 'neutral',
  active: 'brand', expired: 'neutral', terminated: 'danger', extended: 'info',
  paid: 'brand', partial: 'amber', refunded: 'neutral', completed: 'brand', failed: 'danger',
  available: 'brand', full: 'neutral', maintenance: 'amber', reserved: 'info',
  open: 'amber', in_progress: 'info', resolved: 'brand', closed: 'neutral',
  high: 'danger', medium: 'amber', low: 'neutral',
};

export const StatusBadge = ({ status }: { status: string }) => <Badge tone={statusTones[status] ?? 'neutral'}>{toLabel(status)}</Badge>;

/** Bed-level occupancy: one pip per bed, filled when taken. */
export function BedPips({ capacity, occupied, size = 'md' }: { capacity: number; occupied: number; size?: 'sm' | 'md' }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${occupied} of ${capacity} beds occupied`}>
      {Array.from({ length: capacity }, (_, i) => (
        <span
          key={i}
          className={cx(
            'rounded-[3px]',
            size === 'sm' ? 'h-2.5 w-3.5' : 'h-3.5 w-5',
            i < occupied ? 'bg-brand-600' : 'bg-surface ring-1 ring-inset ring-line-strong',
          )}
        />
      ))}
    </span>
  );
}

/* ---------- Forms ---------- */

export const inputCls =
  'block w-full min-h-11 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted ' +
  'transition-[border-color,box-shadow] focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none ' +
  'aria-[invalid=true]:border-danger-600 disabled:bg-sunken';

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; className?: string; children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger-700">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Pill-style single choice used for list filters. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-9 shrink-0 rounded-full px-3 text-sm font-medium transition-colors',
            value === o.value ? 'bg-brand-700 text-white' : 'bg-surface text-muted ring-1 ring-inset ring-line hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- States ---------- */

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cx('relative overflow-hidden rounded-md bg-sunken', className)} aria-hidden>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-sunken text-muted" aria-hidden>
        {icon ?? <Inbox className="size-5" />}
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-100 text-danger-700" aria-hidden>
        <AlertTriangle className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold">Couldn’t load this</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Form-level error, shown only when the server gave no per-field errors to display inline. */
export function FormError({ error, className }: { error: Error | null; className?: string }) {
  if (!error || (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0)) return null;
  return (
    <p role="alert" className={cx('rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-700', className)}>
      {error.message}
    </p>
  );
}

/* ---------- Table ---------- */

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: number | string }>({ columns, rows, loading, empty, caption }: { columns: Column<T>[]; rows: T[] | undefined; loading?: boolean; empty: ReactNode; caption: string }) {
  if (!loading && rows && rows.length === 0) return <>{empty}</>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
            {columns.map((c) => (
              <th key={c.header} scope="col" className={cx('px-5 py-3 font-medium', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.header} className="px-5 py-4">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            : rows?.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-canvas/70">
                  {columns.map((c) => (
                    <td key={c.header} className={cx('px-5 py-3.5 align-middle', c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ info, onPage }: { info?: PaginationInfo; onPage: (page: number) => void }) {
  if (!info || info.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
      <span className="tabular text-muted">
        Page {info.currentPage} of {info.totalPages} · {info.totalItems} total
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={!info.hasPrevPage} onClick={() => onPage(info.currentPage - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={!info.hasNextPage} onClick={() => onPage(info.currentPage + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

/* ---------- Modal (native <dialog>: focus trap + Esc for free) ---------- */

export function Modal({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-m-2 grid size-10 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink" aria-label="Close dialog">
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
