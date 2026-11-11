import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Phone, UserRound } from 'lucide-react';
import { Card, CardHeader, DataTable, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge, buttonCls, cx, linkCls } from '../../components/ui';
import { api } from '../../lib/api';
import { date, label, money } from '../../lib/format';
import type { Allocation } from '../../lib/types';

interface Roommate { student_id: string; name: string; course: string; year_of_study: number; phone: string | null }

export default function MyRoom() {
  const current = useQuery({
    queryKey: ['student', 'allocation'],
    queryFn: () => api<{ allocation: Allocation; roommates: Roommate[] } | null>('/api/students/allocation'),
  });
  const history = useQuery({
    queryKey: ['student', 'allocation-history'],
    queryFn: () => api<{ allocations: Allocation[] }>('/api/students/allocation-history?limit=20'),
  });

  if (current.isError) return <Card><ErrorState error={current.error} onRetry={() => current.refetch()} /></Card>;

  const a = current.data?.allocation;
  return (
    <>
      <PageHeader title="My room" description="Your current stay, roommates and warden contact." />
      {current.isPending ? (
        <Skeleton className="h-56 rounded-card" />
      ) : !a ? (
        <Card>
          <EmptyState icon={<KeyRound className="size-5" />} title="You don’t have a room yet" description="Once a warden allots you a bed, its details appear here." action={<Link className={buttonCls()} to="/student/rooms">Find a room</Link>} />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="overflow-hidden">
            <div className="bg-brand-800 px-5 py-6 text-white">
              <p className="text-xs font-semibold tracking-[0.12em] text-brand-200 uppercase">{a.block_name}</p>
              <p className="tabular mt-1 font-display text-3xl font-semibold">Room {a.room_number}</p>
              <p className="mt-1 text-sm text-brand-100">{label(a.room_type)} · Floor {a.floor_number} · Bed {a.bed_number}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-5 text-sm sm:grid-cols-3">
              <Item term="Status"><StatusBadge status={a.allocation_status} /></Item>
              <Item term="Monthly rent"><span className="tabular font-medium">{money(a.rent_amount)}</span></Item>
              <Item term="Deposit"><span className="tabular">{money(a.security_deposit)}</span></Item>
              <Item term="Move-in">{date(a.start_date)}</Item>
              <Item term="Stay ends">{date(a.end_date)}</Item>
              <Item term="Fees"><StatusBadge status={a.payment_status} /></Item>
            </dl>
            {a.facilities && (
              <div className="border-t border-line px-5 py-4">
                <p className="text-sm text-muted">Facilities</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">{a.facilities.split(',').map((f) => <li key={f} className="rounded-md bg-sunken px-2 py-0.5 text-xs">{f.trim()}</li>)}</ul>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Roommates" />
              {current.data!.roommates.length === 0 ? (
                <p className="px-5 py-5 text-sm text-muted">No roommates right now.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {current.data!.roommates.map((m) => (
                    <li key={m.student_id} className="flex items-center gap-3 px-5 py-3">
                      <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-700" aria-hidden><UserRound className="size-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted">{m.course} · Year {m.year_of_study}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted">Warden</p>
              <p className="mt-1 font-semibold">{a.warden_name ?? 'Not assigned'}</p>
              {a.warden_contact && (
                <a href={`tel:${a.warden_contact}`} className={cx(linkCls, 'mt-2 inline-flex min-h-10 items-center gap-2 text-sm')}>
                  <Phone className="size-4" aria-hidden /> {a.warden_contact}
                </a>
              )}
            </Card>
          </div>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Stay history" />
        <DataTable
          caption="Room allocation history"
          loading={history.isPending}
          rows={history.data?.allocations}
          empty={<p className="px-5 py-6 text-sm text-muted">No previous stays.</p>}
          columns={[
            { header: 'Room', cell: (r) => <span className="font-medium">{r.block_code}-{r.room_number}</span> },
            { header: 'From', cell: (r) => date(r.start_date) },
            { header: 'To', cell: (r) => date(r.end_date) },
            { header: 'Rent', cell: (r) => <span className="tabular">{money(r.rent_amount)}</span> },
            { header: 'Status', cell: (r) => <StatusBadge status={r.allocation_status} /> },
          ]}
        />
      </Card>
    </>
  );
}

const Item = ({ term, children }: { term: string; children: ReactNode }) => (
  <div>
    <dt className="text-muted">{term}</dt>
    <dd className="mt-1">{children}</dd>
  </div>
);
