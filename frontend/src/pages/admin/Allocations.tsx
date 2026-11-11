import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AllocateModal } from '../../components/AllocateModal';
import { Button, Card, DataTable, EmptyState, ErrorState, Field, Modal, PageHeader, Pager, Segmented, StatusBadge, inputCls } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { date, label, money } from '../../lib/format';
import type { Allocation, Pagination } from '../../lib/types';

type Filter = 'active' | 'expired' | 'terminated' | 'all';

export default function AdminAllocations() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('active');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState<Allocation | null>(null);
  const [reason, setReason] = useState('');

  const q = useQuery({
    queryKey: ['admin', 'allocations', filter, page],
    queryFn: () => api<{ allocations: Allocation[]; pagination: Pagination }>(`/api/admin/allocations?limit=15&page=${page}${filter === 'all' ? '' : `&status=${filter}`}`),
  });
  const terminate = useMutation({
    mutationFn: (id: number) => api(`/api/admin/allocations/${id}/terminate`, { method: 'PUT', body: { reason: reason || undefined } }),
    onSuccess: () => {
      toast.success('Stay ended and bed released');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setEnding(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Allocations" description="Who sleeps where, from when, and at what rent." actions={<Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>New allocation</Button>} />
      <div className="mb-4">
        <Segmented<Filter> label="Filter by status" value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={(['active', 'expired', 'terminated', 'all'] as const).map((v) => ({ value: v, label: label(v) }))} />
      </div>
      <Card>
        {q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            caption="Room allocations"
            loading={q.isPending}
            rows={q.data?.allocations}
            empty={<EmptyState icon={<KeyRound className="size-5" />} title={`No ${filter === 'all' ? '' : filter} allocations`} action={<Button variant="secondary" onClick={() => setCreating(true)}>Allot a room</Button>} />}
            columns={[
              { header: 'Student', cell: (a) => <div><p className="font-medium">{a.student_name}</p><p className="text-xs text-muted">{a.student_id}</p></div> },
              { header: 'Room', cell: (a) => <div><p className="font-medium">{a.block_code}-{a.room_number}</p><p className="text-xs text-muted">Bed {a.bed_number} · {label(a.room_type)}</p></div> },
              { header: 'Stay', cell: (a) => <span className="text-sm">{date(a.start_date)} – {date(a.end_date)}</span> },
              { header: 'Rent', cell: (a) => <span className="tabular">{money(a.rent_amount)}</span>, className: 'text-right' },
              { header: 'Fees', cell: (a) => <StatusBadge status={a.payment_status} /> },
              { header: 'Status', cell: (a) => <StatusBadge status={a.allocation_status} /> },
              {
                header: 'Actions',
                className: 'text-right',
                cell: (a) => a.allocation_status === 'active' ? <Button size="sm" variant="secondary" onClick={() => { setReason(''); setEnding(a); }}>End stay</Button> : <span className="line-clamp-1 text-xs text-muted">{a.termination_reason ?? '—'}</span>,
              },
            ]}
          />
        )}
        <Pager info={q.data?.pagination} onPage={setPage} />
      </Card>

      {creating && <AllocateModal open onClose={() => setCreating(false)} />}

      <Modal
        open={!!ending}
        onClose={() => setEnding(null)}
        title="End this stay?"
        description={ending ? `${ending.student_name} leaves ${ending.block_code}-${ending.room_number} today and the bed becomes free.` : undefined}
        footer={<><Button variant="secondary" onClick={() => setEnding(null)}>Cancel</Button><Button variant="danger" loading={terminate.isPending} onClick={() => ending && terminate.mutate(ending.id)}>End stay</Button></>}
      >
        <Field label="Reason" hint="Optional, kept on the student’s record">
          {(p) => <input {...p} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Moved out at end of semester" maxLength={500} />}
        </Field>
      </Modal>
    </>
  );
}
