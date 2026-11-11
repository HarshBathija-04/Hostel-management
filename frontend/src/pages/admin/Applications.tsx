import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { AllocateModal } from '../../components/AllocateModal';
import { Button, Card, DataTable, EmptyState, ErrorState, Field, Modal, PageHeader, Pager, Segmented, StatusBadge, inputCls } from '../../components/ui';
import { api } from '../../lib/api';
import { date, label } from '../../lib/format';
import type { Application, Pagination } from '../../lib/types';

type Filter = 'pending' | 'waitlisted' | 'approved' | 'rejected' | 'all';
type Row = Application & { student_name: string; student_id: string; preferred_block: string | null; student_db_id?: number };

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('pending');
  const [page, setPage] = useState(1);
  const [allot, setAllot] = useState<Row | null>(null);
  const [processing, setProcessing] = useState<{ row: Row; status: 'waitlisted' | 'rejected' } | null>(null);
  const [remarks, setRemarks] = useState('');

  const q = useQuery({
    queryKey: ['admin', 'applications', filter, page],
    queryFn: () => api<{ applications: (Row & { student_id: string })[]; pagination: Pagination }>(`/api/admin/applications?limit=15&page=${page}${filter === 'all' ? '' : `&status=${filter}`}`),
  });
  const process = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/api/admin/applications/${id}/process`, { method: 'PUT', body: { status, adminRemarks: remarks || undefined } }),
    onSuccess: (_d, v) => {
      toast.success(`Application ${v.status}`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setProcessing(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const open = (row: Row) => row.status === 'pending' || row.status === 'waitlisted';

  return (
    <>
      <PageHeader title="Applications" description="Approve by allotting a bed, or waitlist/reject with a note the student will see." />
      <div className="mb-4">
        <Segmented<Filter>
          label="Filter by status"
          value={filter}
          onChange={(v) => { setFilter(v); setPage(1); }}
          options={(['pending', 'waitlisted', 'approved', 'rejected', 'all'] as const).map((v) => ({ value: v, label: label(v) }))}
        />
      </div>
      <Card>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable<Row>
            caption="Room applications"
            loading={q.isPending}
            rows={q.data?.applications}
            empty={<EmptyState icon={<ClipboardList className="size-5" />} title={filter === 'pending' ? 'Queue is clear' : `No ${filter === 'all' ? '' : filter} applications`} description={filter === 'pending' ? 'New applications will show up here.' : undefined} />}
            columns={[
              { header: 'Student', cell: (a) => <div><p className="font-medium">{a.student_name}</p><p className="text-xs text-muted">{a.student_id} · {label(a.gender)} · Year {a.year_of_study}</p></div> },
              { header: 'Preference', cell: (a) => <div><p>{a.preferred_block ?? 'Any block'}</p><p className="text-xs text-muted">{a.preferred_room_type === 'any' ? 'Any type' : label(a.preferred_room_type)} · {a.duration_months} mo</p></div> },
              { header: 'Move-in', cell: (a) => date(a.preferred_start_date) },
              { header: 'Note', cell: (a) => <p className="line-clamp-2 max-w-56 text-xs text-muted">{a.admin_remarks ?? a.special_requirements ?? '—'}</p> },
              { header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
              {
                header: 'Actions',
                className: 'text-right',
                cell: (a) =>
                  open(a) ? (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => setAllot(a)}>Allot</Button>
                      {a.status === 'pending' && <Button size="sm" variant="secondary" onClick={() => { setRemarks(''); setProcessing({ row: a, status: 'waitlisted' }); }}>Waitlist</Button>}
                      <Button size="sm" variant="ghost" onClick={() => { setRemarks(''); setProcessing({ row: a, status: 'rejected' }); }}>Reject</Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">{a.processed_at ? `Processed ${date(a.processed_at)}` : '—'}</span>
                  ),
              },
            ]}
          />
        )}
        <Pager info={q.data?.pagination} onPage={setPage} />
      </Card>

      {allot && (
        <AllocateModal
          open
          onClose={() => setAllot(null)}
          target={{ studentId: allot.student_db_id!, gender: allot.gender ?? '', name: allot.student_name, applicationId: allot.id, startDate: allot.preferred_start_date, blockId: allot.preferred_block_id }}
        />
      )}

      <Modal
        open={!!processing}
        onClose={() => setProcessing(null)}
        title={processing?.status === 'rejected' ? 'Reject application' : 'Move to waitlist'}
        description={processing ? `${processing.row.student_name} will see your note on their applications page.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setProcessing(null)}>Cancel</Button>
            <Button variant={processing?.status === 'rejected' ? 'danger' : 'primary'} loading={process.isPending} onClick={() => processing && process.mutate({ id: processing.row.id, status: processing.status })}>
              {processing?.status === 'rejected' ? 'Reject' : 'Waitlist'}
            </Button>
          </>
        }
      >
        <Field label="Note to student" hint="Optional, up to 500 characters">
          {(p) => <textarea {...p} rows={3} maxLength={500} className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={processing?.status === 'rejected' ? 'Reason for rejection' : 'e.g. No double rooms free until December'} />}
        </Field>
      </Modal>
    </>
  );
}
