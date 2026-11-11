import { useQuery } from '@tanstack/react-query';
import { CircleAlert, CreditCard, Wallet } from 'lucide-react';
import { Card, CardHeader, DataTable, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusBadge } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { date, label, money, monthLabel } from '../../lib/format';
import type { Payment } from '../../lib/types';

export default function StudentFees() {
  const fees = useQuery({
    queryKey: ['student', 'payments'],
    queryFn: () => api<{ payments: Payment[]; summary: { total_paid: number; total_due: number; pending_count: number } }>('/api/students/payments'),
  });
  if (fees.isError) return <Card><ErrorState message={errorMessage(fees.error)} onRetry={() => fees.refetch()} /></Card>;
  const s = fees.data?.summary;

  return (
    <>
      <PageHeader title="Fees" description="Deposits and monthly rent recorded against your stay. Pay dues at the hostel office or by bank transfer." />
      <div className="grid gap-4 sm:grid-cols-2">
        {fees.isPending ? (
          <><Skeleton className="h-[104px] rounded-card" /><Skeleton className="h-[104px] rounded-card" /></>
        ) : (
          <>
            <StatCard label="Paid so far" value={money(s!.total_paid)} icon={<Wallet className="size-5" />} />
            <StatCard label="Outstanding" value={money(s!.total_due)} icon={s!.total_due ? <CircleAlert className="size-5" /> : <CreditCard className="size-5" />} tone={s!.total_due ? 'amber' : 'brand'} hint={s!.pending_count ? `${s!.pending_count} pending ${s!.pending_count === 1 ? 'charge' : 'charges'}` : 'You are all paid up'} />
          </>
        )}
      </div>
      <Card className="mt-6">
        <CardHeader title="Payment history" />
        <DataTable
          caption="Fee payment history"
          loading={fees.isPending}
          rows={fees.data?.payments}
          empty={<EmptyState icon={<CreditCard className="size-5" />} title="No fee records yet" description="Charges appear here once you are allotted a room." />}
          columns={[
            { header: 'For', cell: (p) => <div><p className="font-medium">{label(p.payment_type)}</p><p className="text-xs text-muted">{p.month_year ? monthLabel(p.month_year) : p.remarks}</p></div> },
            { header: 'Amount', cell: (p) => <span className="tabular font-medium">{money(p.amount)}</span>, className: 'text-right' },
            { header: 'Method', cell: (p) => label(p.payment_method) },
            { header: 'Date', cell: (p) => (p.status === 'pending' ? '—' : date(p.payment_date)) },
            { header: 'Reference', cell: (p) => <span className="font-mono text-xs text-muted">{p.transaction_id ?? '—'}</span> },
            { header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
          ]}
        />
      </Card>
    </>
  );
}
