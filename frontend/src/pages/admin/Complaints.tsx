import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, Pager, Segmented, Skeleton, StatusBadge, inputCls } from '../../components/ui';
import { api } from '../../lib/api';
import { date, label } from '../../lib/format';
import type { Complaint, ComplaintStatus, Pagination } from '../../lib/types';

type Filter = ComplaintStatus | 'all';

export default function AdminComplaints() {
  const [filter, setFilter] = useState<Filter>('open');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const q = useQuery({
    queryKey: ['admin', 'complaints', filter, page],
    queryFn: () => api<{ complaints: Complaint[]; pagination: Pagination }>(`/api/admin/complaints?limit=12&page=${page}${filter === 'all' ? '' : `&status=${filter}`}`),
  });

  return (
    <>
      <PageHeader title="Complaints" description="Maintenance tickets, sorted by status and priority." />
      <div className="mb-4">
        <Segmented<Filter> label="Filter by status" value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={(['open', 'in_progress', 'resolved', 'closed', 'all'] as const).map((v) => ({ value: v, label: label(v) }))} />
      </div>
      {q.isError ? (
        <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : q.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40 rounded-card" />)}</div>
      ) : q.data.complaints.length === 0 ? (
        <Card><EmptyState icon={<Wrench className="size-5" />} title={filter === 'open' ? 'No open tickets' : 'Nothing here'} description={filter === 'open' ? 'New complaints from residents land here first.' : undefined} /></Card>
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {q.data.complaints.map((c) => (
              <li key={c.id}>
                <Card as="article" className="flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={c.status} />
                    <StatusBadge status={c.priority} />
                    <Badge>{label(c.category)}</Badge>
                  </div>
                  <h2 className="mt-3 font-semibold">{c.title}</h2>
                  <p className="mt-1 text-xs text-muted">{c.student_name} · {c.block_code ? `${c.block_code}-${c.room_number}` : 'No room'} · {date(c.created_at)}</p>
                  <p className="mt-3 line-clamp-3 text-sm">{c.description}</p>
                  {c.admin_response && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{c.admin_response}</p>}
                  <div className="mt-auto pt-4">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>Update</Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          {q.data.pagination.totalPages > 1 && <Card className="mt-4"><Pager info={q.data.pagination} onPage={setPage} /></Card>}
        </>
      )}
      {editing && <UpdateModal complaint={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function UpdateModal({ complaint, onClose }: { complaint: Complaint; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ status: complaint.status, priority: complaint.priority, adminResponse: complaint.admin_response ?? '' });
  const save = useMutation({
    mutationFn: () => api(`/api/admin/complaints/${complaint.id}`, { method: 'PUT', body: { ...form, adminResponse: form.adminResponse || undefined } }),
    onSuccess: () => {
      toast.success('Complaint updated');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Modal open onClose={onClose} title={complaint.title} description={`${complaint.student_name} · ${label(complaint.category)}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="complaint-update" loading={save.isPending}>Save</Button></>}>
      <p className="text-sm">{complaint.description}</p>
      <form id="complaint-update" className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Status">
          {(p) => <select {...p} className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ComplaintStatus })}>{(['open', 'in_progress', 'resolved', 'closed'] as const).map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>}
        </Field>
        <Field label="Priority">
          {(p) => <select {...p} className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Complaint['priority'] })}>{(['low', 'medium', 'high'] as const).map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>}
        </Field>
        <Field label="Reply to student" hint="Shown on the student’s complaints page" className="sm:col-span-2">
          {(p) => <textarea {...p} rows={3} maxLength={1000} className={inputCls} value={form.adminResponse} onChange={(e) => setForm({ ...form, adminResponse: e.target.value })} />}
        </Field>
      </form>
    </Modal>
  );
}
