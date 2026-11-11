import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { ApplyModal } from '../../components/ApplyModal';
import { Button, Card, EmptyState, ErrorState, Modal, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { date, label } from '../../lib/format';
import type { Application } from '../../lib/types';

export default function StudentApplications() {
  const queryClient = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const apps = useQuery({
    queryKey: ['student', 'applications', 'all'],
    queryFn: () => api<{ applications: Application[] }>('/api/students/applications?limit=50'),
  });
  const cancel = useMutation({
    mutationFn: (id: number) => api(`/api/students/applications/${id}/cancel`, { method: 'PUT' }),
    onSuccess: () => {
      toast.success('Application cancelled');
      queryClient.invalidateQueries({ queryKey: ['student'] });
      setCancelId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const list = apps.data?.applications ?? [];
  const hasOpen = list.some((a) => a.status === 'pending' || a.status === 'approved' || a.status === 'waitlisted');

  return (
    <>
      <PageHeader title="Applications" description="Track where your room request stands." actions={!hasOpen && !apps.isPending ? <Button onClick={() => setApplyOpen(true)}>New application</Button> : undefined} />

      {apps.isError ? (
        <Card><ErrorState error={apps.error} onRetry={() => apps.refetch()} /></Card>
      ) : apps.isPending ? (
        <div className="space-y-4">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-36 rounded-card" />)}</div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={<ClipboardList className="size-5" />} title="No applications yet" description="Apply once per term with your block and room-type preferences." action={<Button onClick={() => setApplyOpen(true)}>Apply for a room</Button>} />
        </Card>
      ) : (
        <ol className="space-y-4">
          {list.map((a) => (
            <li key={a.id}>
              <Card as="article" className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{a.block_name ?? 'Any block'} · {a.preferred_room_type === 'any' ? 'any room type' : `${a.preferred_room_type} room`}</h2>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Applied {date(a.application_date)} · move-in {date(a.preferred_start_date)} · {a.duration_months} months
                    </p>
                  </div>
                  {a.status === 'pending' && (
                    <Button variant="secondary" size="sm" onClick={() => setCancelId(a.id)}>Cancel</Button>
                  )}
                </div>
                {(a.special_requirements || a.admin_remarks || a.allocated_room_number) && (
                  <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                    {a.special_requirements && (<div><dt className="text-muted">Your note</dt><dd className="mt-0.5">{a.special_requirements}</dd></div>)}
                    {a.admin_remarks && (<div><dt className="text-muted">Warden’s remarks</dt><dd className="mt-0.5">{a.admin_remarks}</dd></div>)}
                    {a.allocated_room_number && (<div><dt className="text-muted">Allotted room</dt><dd className="mt-0.5 font-medium">{a.block_code}-{a.allocated_room_number}</dd></div>)}
                  </dl>
                )}
                {a.status === 'waitlisted' && <p className="mt-3 text-sm text-info-700">{label(a.status)}: you’ll be allotted a bed when one frees up.</p>}
              </Card>
            </li>
          ))}
        </ol>
      )}

      {applyOpen && <ApplyModal open onClose={() => setApplyOpen(false)} />}

      <Modal
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        title="Cancel this application?"
        description="You can submit a new one afterwards, but you will lose your place in the queue."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelId(null)}>Keep it</Button>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancelId && cancel.mutate(cancelId)}>Cancel application</Button>
          </>
        }
      >
        <p className="text-sm text-muted">This cannot be undone.</p>
      </Modal>
    </>
  );
}
