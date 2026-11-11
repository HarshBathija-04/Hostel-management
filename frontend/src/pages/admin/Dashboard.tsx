import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BedDouble, ClipboardList, IndianRupee, Users, Wrench } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusBadge, cx, linkCls } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { date, money, percent } from '../../lib/format';
import type { Application } from '../../lib/types';

interface AdminDashboardData {
  statistics: {
    totalStudents: number; totalRooms: number; activeAllocations: number; pendingApplications: number;
    openComplaints: number; collectedThisMonth: number; pendingDues: number;
  };
  roomSummary: { total_capacity: number; total_occupied: number; total_available: number; available_rooms: number; full_rooms: number; maintenance_rooms: number };
  recentApplications: (Application & { student_name: string })[];
  occupancyByBlock: { block_name: string; total_rooms: number; total_capacity: number | null; total_occupied: number | null; occupancy_rate: number }[];
}

export default function AdminDashboard() {
  const q = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api<AdminDashboardData>('/api/admin/dashboard') });
  if (q.isError) return <Card><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></Card>;
  const d = q.data;
  const s = d?.statistics;
  const r = d?.roomSummary;

  return (
    <>
      <PageHeader title="Dashboard" description="Occupancy, queues and money across every block." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!d ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-card" />)
        ) : (
          <>
            <StatCard label="Beds occupied" icon={<BedDouble className="size-5" />} value={`${percent(r!.total_occupied, r!.total_capacity)}%`} hint={`${r!.total_occupied} of ${r!.total_capacity} beds · ${r!.total_available} free`} />
            <StatCard label="Pending applications" icon={<ClipboardList className="size-5" />} tone={s!.pendingApplications ? 'amber' : 'brand'} value={s!.pendingApplications} hint={<Link to="/admin/applications" className={linkCls}>Review queue</Link>} />
            <StatCard label="Open complaints" icon={<Wrench className="size-5" />} tone={s!.openComplaints ? 'danger' : 'brand'} value={s!.openComplaints} hint={<Link to="/admin/complaints" className={linkCls}>Triage tickets</Link>} />
            <StatCard label="Collected this month" icon={<IndianRupee className="size-5" />} tone="info" value={money(s!.collectedThisMonth)} hint={`${money(s!.pendingDues)} outstanding`} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Occupancy by block" description={r ? `${r.full_rooms} full rooms · ${r.maintenance_rooms} under maintenance` : undefined} />
          <ul className="space-y-4 p-5">
            {!d
              ? Array.from({ length: 5 }, (_, i) => <li key={i}><Skeleton className="h-8 w-full" /></li>)
              : d.occupancyByBlock.map((b) => (
                  <li key={b.block_name}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{b.block_name}</span>
                      <span className="tabular text-muted">{b.total_occupied ?? 0}/{b.total_capacity ?? 0} beds · {Math.round(b.occupancy_rate)}%</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={b.occupancy_rate} aria-label={`${b.block_name} occupancy`}>
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(b.occupancy_rate, 100)}%` }} />
                    </div>
                  </li>
                ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Latest applications" action={<Link to="/admin/applications" className={cx(linkCls, 'text-sm')}>View all</Link>} />
          {!d ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : d.recentApplications.length === 0 ? (
            <EmptyState title="No applications yet" />
          ) : (
            <ul className="divide-y divide-line">
              {d.recentApplications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.student_name}</p>
                    <p className="truncate text-xs text-muted">{a.student_id} · {date(a.application_date)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {s && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Users className="size-4" aria-hidden /> {s.totalStudents} active students · {s.totalRooms} rooms · {s.activeAllocations} current stays
        </p>
      )}
    </>
  );
}
