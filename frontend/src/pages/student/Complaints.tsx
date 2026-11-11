import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareReply, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, StatusBadge, inputCls } from '../../components/ui';
import { api, ApiError, errorMessage } from '../../lib/api';
import { date, label } from '../../lib/format';
import type { Complaint } from '../../lib/types';

const categories = ['electrical', 'plumbing', 'furniture', 'cleaning', 'internet', 'other'] as const;
const blank = { category: 'electrical', title: '', description: '', priority: 'medium' };

export default function StudentComplaints() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const set = (key: keyof typeof blank) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const complaints = useQuery({ queryKey: ['student', 'complaints'], queryFn: () => api<Complaint[]>('/api/students/complaints') });
  const create = useMutation({
    mutationFn: () => api('/api/students/complaints', { method: 'POST', body: form }),
    onSuccess: () => {
      toast.success('Complaint raised. The warden has been notified.');
      queryClient.invalidateQueries({ queryKey: ['student', 'complaints'] });
      setOpen(false);
      setForm(blank);
    },
  });
  const errors = create.error instanceof ApiError ? create.error.fieldErrors : {};
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <>
      <PageHeader title="Complaints" description="Report maintenance issues in your room or block." actions={<Button onClick={() => { create.reset(); setOpen(true); }}>Raise a complaint</Button>} />

      {complaints.isError ? (
        <Card><ErrorState message={errorMessage(complaints.error)} onRetry={() => complaints.refetch()} /></Card>
      ) : complaints.isPending ? (
        <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-card" />)}</div>
      ) : complaints.data.length === 0 ? (
        <Card><EmptyState icon={<Wrench className="size-5" />} title="Nothing reported" description="Broken fan, leaking tap, slow WiFi? Raise it here and track the fix." /></Card>
      ) : (
        <ul className="space-y-4">
          {complaints.data.map((c) => (
            <li key={c.id}>
              <Card as="article" className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{c.title}</h2>
                  <StatusBadge status={c.status} />
                  <Badge>{label(c.category)}</Badge>
                  {c.priority === 'high' && <StatusBadge status="high" />}
                </div>
                <p className="mt-1 text-xs text-muted">
                  Raised {date(c.created_at)}{c.room_number ? ` · ${c.block_code}-${c.room_number}` : ''}{c.resolved_at ? ` · resolved ${date(c.resolved_at)}` : ''}
                </p>
                <p className="mt-3 text-sm">{c.description}</p>
                {c.admin_response && (
                  <div className="mt-4 flex gap-3 rounded-lg bg-brand-50 p-3 text-sm">
                    <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
                    <p><span className="font-medium text-brand-800">Warden: </span>{c.admin_response}</p>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Raise a complaint"
        description="It is linked to your current room automatically."
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="complaint-form" loading={create.isPending}>Submit</Button></>}
      >
        <form id="complaint-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Category" error={errors.category}>
            {(p) => <select {...p} className={inputCls} value={form.category} onChange={set('category')}>{categories.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>}
          </Field>
          <Field label="Priority" error={errors.priority}>
            {(p) => <select {...p} className={inputCls} value={form.priority} onChange={set('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High: safety or no water/power</option></select>}
          </Field>
          <Field label="Title" error={errors.title} className="sm:col-span-2">
            {(p) => <input {...p} className={inputCls} value={form.title} onChange={set('title')} maxLength={120} placeholder="Ceiling fan not working" required />}
          </Field>
          <Field label="What’s wrong?" error={errors.description} hint="At least 10 characters" className="sm:col-span-2">
            {(p) => <textarea {...p} rows={4} className={inputCls} value={form.description} onChange={set('description')} maxLength={2000} placeholder="When did it start, and where exactly?" required />}
          </Field>
          {create.error && Object.keys(errors).length === 0 && <p role="alert" className="text-sm text-danger-700 sm:col-span-2">{create.error.message}</p>}
        </form>
      </Modal>
    </>
  );
}
