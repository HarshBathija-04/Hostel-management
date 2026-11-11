import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CreditCard, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, DataTable, EmptyState, ErrorState, Field, FormError, Modal, PageHeader, Pager, Segmented, Skeleton, StatCard, StatusBadge, inputCls } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { date, label, money, monthLabel } from '../../lib/format';
import type { Allocation, Pagination, Payment } from '../../lib/types';

type Filter = 'all' | 'pending' | 'completed';

export default function AdminFees() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [recording, setRecording] = useState(false);

  const q = useQuery({
    queryKey: ['admin', 'payments', filter, page],
    queryFn: () => api<{ payments: Payment[]; summary: { total_collected: number; total_pending: number; pending_count: number }; pagination: Pagination }>(`/api/admin/payments?limit=15&page=${page}${filter === 'all' ? '' : `&status=${filter}`}`),
  });
  const complete = useMutation({
    mutationFn: (id: number) => api(`/api/admin/payments/${id}/complete`, { method: 'PUT', body: {} }),
    onSuccess: () => {
      toast.success('Payment marked as received');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });
  const s = q.data?.summary;

  return (
    <>
      <PageHeader title="Fees" description="Deposits, rent and fines across all stays." actions={<Button icon={<Plus className="size-4" />} onClick={() => setRecording(true)}>Record payment</Button>} />
      <div className="grid gap-4 sm:grid-cols-2">
        {!s ? (
          <><Skeleton className="h-[104px] rounded-card" /><Skeleton className="h-[104px] rounded-card" /></>
        ) : (
          <>
            <StatCard label="Collected (all time)" value={money(s.total_collected)} icon={<Wallet className="size-5" />} />
            <StatCard label="Outstanding" value={money(s.total_pending)} icon={<CircleAlert className="size-5" />} tone={s.pending_count ? 'amber' : 'brand'} hint={`${s.pending_count} pending ${s.pending_count === 1 ? 'charge' : 'charges'}`} />
          </>
        )}
      </div>
      <div className="mt-6 mb-4">
        <Segmented<Filter> label="Filter by status" value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Received' }]} />
      </div>
      <Card>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            caption="Fee payments"
            loading={q.isPending}
            rows={q.data?.payments}
            empty={<EmptyState icon={<CreditCard className="size-5" />} title={filter === 'pending' ? 'No dues outstanding' : 'No payments recorded'} />}
            columns={[
              { header: 'Student', cell: (p) => <div><p className="font-medium">{p.student_name}</p><p className="text-xs text-muted">{p.student_code} · {p.block_code}-{p.room_number}</p></div> },
              { header: 'For', cell: (p) => <div><p>{label(p.payment_type)}</p><p className="text-xs text-muted">{p.month_year ? monthLabel(p.month_year) : '—'}</p></div> },
              { header: 'Amount', cell: (p) => <span className="tabular font-medium">{money(p.amount)}</span>, className: 'text-right' },
              { header: 'Method', cell: (p) => label(p.payment_method) },
              { header: 'Date', cell: (p) => (p.status === 'pending' ? '—' : date(p.payment_date)) },
              { header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
              { header: 'Actions', className: 'text-right', cell: (p) => (p.status === 'pending' ? <Button size="sm" variant="secondary" loading={complete.isPending && complete.variables === p.id} onClick={() => complete.mutate(p.id)}>Mark received</Button> : <span className="font-mono text-xs text-muted">{p.transaction_id ?? ''}</span>) },
            ]}
          />
        )}
        <Pager info={q.data?.pagination} onPage={setPage} />
      </Card>
      {recording && <RecordPaymentModal onClose={() => setRecording(false)} />}
    </>
  );
}

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const allocations = useQuery({ queryKey: ['admin', 'allocations', 'active', 'all'], queryFn: () => api<{ allocations: Allocation[] }>('/api/admin/allocations?status=active&limit=100') });
  const [form, setForm] = useState({ allocationId: '', amount: '', paymentType: 'rent', paymentMethod: 'online', monthYear: new Date().toISOString().slice(0, 7), transactionId: '', remarks: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const record = useMutation({
    mutationFn: () =>
      api('/api/admin/payments', {
        method: 'POST',
        body: { ...form, allocationId: Number(form.allocationId), amount: Number(form.amount), monthYear: form.paymentType === 'rent' ? form.monthYear : undefined, transactionId: form.transactionId || undefined, remarks: form.remarks || undefined },
      }),
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
  });
  const errors = record.error instanceof ApiError ? record.error.fieldErrors : {};

  return (
    <Modal open onClose={onClose} title="Record a payment" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="record-payment" loading={record.isPending}>Record</Button></>}>
      <form id="record-payment" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); record.mutate(); }} noValidate>
        <Field label="Resident" error={errors.allocationId} className="sm:col-span-2">
          {(p) => (
            <select
              {...p}
              className={inputCls}
              value={form.allocationId}
              onChange={(e) => {
                const a = allocations.data?.allocations.find((x) => String(x.id) === e.target.value);
                setForm((f) => ({ ...f, allocationId: e.target.value, amount: f.amount || (a ? String(a.rent_amount) : '') }));
              }}
            >
              <option value="">{allocations.isPending ? 'Loading…' : 'Select a resident…'}</option>
              {allocations.data?.allocations.map((a) => <option key={a.id} value={a.id}>{a.student_name} · {a.block_code}-{a.room_number}</option>)}
            </select>
          )}
        </Field>
        <Field label="Type" error={errors.paymentType}>
          {(p) => <select {...p} className={inputCls} value={form.paymentType} onChange={set('paymentType')}>{['rent', 'security_deposit', 'fine', 'other'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>}
        </Field>
        <Field label="Amount (₹)" error={errors.amount}>{(p) => <input {...p} type="number" min={1} step={100} inputMode="numeric" className={inputCls} value={form.amount} onChange={set('amount')} />}</Field>
        <Field label="Method" error={errors.paymentMethod}>
          {(p) => <select {...p} className={inputCls} value={form.paymentMethod} onChange={set('paymentMethod')}>{['online', 'bank_transfer', 'card', 'cash'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>}
        </Field>
        {form.paymentType === 'rent' ? (
          <Field label="Rent month" error={errors.monthYear}>{(p) => <input {...p} type="month" className={inputCls} value={form.monthYear} onChange={set('monthYear')} />}</Field>
        ) : (
          <Field label="Reference (optional)" error={errors.transactionId}>{(p) => <input {...p} className={inputCls} value={form.transactionId} onChange={set('transactionId')} />}</Field>
        )}
        <Field label="Remarks (optional)" error={errors.remarks} className="sm:col-span-2">{(p) => <input {...p} className={inputCls} value={form.remarks} onChange={set('remarks')} maxLength={500} />}</Field>
        <FormError error={record.error} className="sm:col-span-2" />
      </form>
    </Modal>
  );
}
