import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BedDouble, ClipboardList, CreditCard, Wrench } from 'lucide-react';
import { Card, CardHeader, ErrorState, PageHeader, Skeleton, StatCard, StatusBadge } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { date, label, money, monthLabel } from '../../lib/format';
import type { Allocation, Application, Complaint, Payment } from '../../lib/types';

interface DashboardData {
  profile: { first_name: string; course: string; year_of_study: number };
  activeApplications: number;
  activeAllocation: (Allocation & { block_code: string }) | null;
}

export default function StudentDashboard() {
  const dash = useQuery({ queryKey: ['student', 'dashboard'], queryFn: () => api<DashboardData>('/api/students/dashboard') });
  const fees = useQuery({
    queryKey: ['student', 'payments'],
    queryFn: () => api<{ payments: Payment[]; summary: { total_paid: number; total_due: number; pending_count: number } }>('/api/students/payments'),
  });
  const apps = useQuery({
    queryKey: ['student', 'applications'],
    queryFn: () => api<{ applications: Application[] }>('/api/students/applications?limit=5'),
  });
  const complaints = useQuery({ queryKey: ['student', 'complaints'], queryFn: () => api<Complaint[]>('/api/students/complaints') });

  if (dash.isError) return <Card><ErrorState message={errorMessage(dash.error)} onRetry={() => dash.refetch()} /></Card>;

  const d = dash.data;
  const latestApp = apps.data?.applications[0];
  const openTickets = complaints.data?.filter((c) => c.status === 'open' || c.status === 'in_progress').length ?? 0;
  const alloc = d?.activeAllocation;

  return (
    <>
      <PageHeader
        title={d ? `Hello, ${d.profile.first_name}` : 'Hello'}
        description={d ? `${d.profile.course} · Year ${d.profile.year_of_study}` : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dash.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Your room" icon={<BedDouble className="size-5" />} value={alloc ? `${alloc.block_code}-${alloc.room_number}` : 'Not allotted'} hint={alloc ? `Bed ${alloc.bed_number} · until ${date(alloc.end_date)}` : 'Apply to get a bed'} />
            <StatCard label="Application" icon={<ClipboardList className="size-5" />} tone="info" value={latestApp ? <StatusBadge status={latestApp.status} /> : 'None yet'} hint={latestApp ? `Submitted ${date(latestApp.application_date)}` : undefined} />
            <StatCard label="Fees paid" icon={<CreditCard className="size-5" />} value={fees.data ? money(fees.data.summary.total_paid) : '—'} hint={fees.data?.summary.total_due ? `${money(fees.data.summary.total_due)} due` : 'No dues'} tone={fees.data?.summary.total_due ? 'amber' : 'brand'} />
            <StatCard label="Open complaints" icon={<Wrench className="size-5" />} value={openTickets} tone={openTickets ? 'amber' : 'brand'} hint={openTickets ? 'Being handled by the warden' : 'All clear'} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Next step" />
          <div className="p-5">
            {dash.isPending ? (
              <Skeleton className="h-20 w-full" />
            ) : alloc ? (
              <NextStep title={`You live in ${alloc.block_name}, room ${alloc.room_number}`} body={`Rent is ${money(alloc.rent_amount)} a month. See roommates and warden contact on your room page.`} to="/student/my-room" cta="View my room" />
            ) : latestApp && ['pending', 'waitlisted'].includes(latestApp.status) ? (
              <NextStep title={latestApp.status === 'pending' ? 'Your application is with the warden' : 'You are on the waitlist'} body={latestApp.admin_remarks ?? 'You will be allotted a bed as soon as one matching your preferences frees up.'} to="/student/applications" cta="Track application" />
            ) : (
              <NextStep title="Find a room for this term" body="Browse rooms with free beds in the blocks open to you, then apply in under a minute." to="/student/rooms" cta="Browse rooms" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent fees" action={<Link to="/student/fees" className="text-sm font-medium text-brand-700 hover:underline">All fees</Link>} />
          <ul className="divide-y divide-line">
            {fees.isPending
              ? Array.from({ length: 3 }, (_, i) => <li key={i} className="px-5 py-3"><Skeleton className="h-5 w-full" /></li>)
              : fees.data?.payments.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 truncate">{label(p.payment_type)}{p.month_year ? ` · ${monthLabel(p.month_year)}` : ''}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular font-medium">{money(p.amount)}</span>
                      <StatusBadge status={p.status} />
                    </span>
                  </li>
                ))}
            {fees.data?.payments.length === 0 && <li className="px-5 py-6 text-sm text-muted">No fee records yet. They appear once a room is allotted.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}

function NextStep({ title, body, to, cta }: { title: string; body: string; to: string; cta: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 max-w-md">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
      <Link to={to} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800">
        {cta} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
