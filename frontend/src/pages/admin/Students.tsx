import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, DataTable, EmptyState, ErrorState, PageHeader, Pager, Segmented, inputCls } from '../../components/ui';
import { api } from '../../lib/api';
import { label } from '../../lib/format';
import type { Pagination, Student } from '../../lib/types';

type Gender = 'all' | 'female' | 'male' | 'other';

export default function AdminStudents() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [gender, setGender] = useState<Gender>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ limit: '15', page: String(page), ...(term && { search: term }), ...(gender !== 'all' && { gender }) });
  const q = useQuery({ queryKey: ['admin', 'students', term, gender, page], queryFn: () => api<{ students: Student[]; pagination: Pagination }>(`/api/admin/students?${params}`) });

  const toggle = useMutation({
    mutationFn: (s: Student) =>
      s.is_active ? api(`/api/admin/students/${s.id}`, { method: 'DELETE' }) : api(`/api/admin/students/${s.id}`, { method: 'PUT', body: { isActive: true } }),
    onSuccess: (_d, s) => {
      toast.success(`${s.first_name} ${s.is_active ? 'deactivated' : 'reactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Students" description="Registered residents and applicants." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="student-search" className="sr-only">Search students</label>
          <input id="student-search" type="search" className={`${inputCls} pl-9`} placeholder="Search name, ID or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Segmented<Gender> label="Filter by gender" value={gender} onChange={(v) => { setGender(v); setPage(1); }} options={(['all', 'female', 'male', 'other'] as const).map((v) => ({ value: v, label: v === 'all' ? 'Everyone' : label(v) }))} />
      </div>
      <Card>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            caption="Students"
            loading={q.isPending}
            rows={q.data?.students}
            empty={<EmptyState icon={<Users className="size-5" />} title="No students found" description={term ? `Nothing matches “${term}”.` : undefined} />}
            columns={[
              { header: 'Student', cell: (s) => <div><p className="font-medium">{s.first_name} {s.last_name}</p><p className="text-xs text-muted">{s.student_id} · {s.email}</p></div> },
              { header: 'Course', cell: (s) => <div><p>{s.course}</p><p className="text-xs text-muted">Year {s.year_of_study} · {label(s.gender)}</p></div> },
              { header: 'Room', cell: (s) => (s.has_allocation ? <span className="font-medium">{s.block_name} · {s.room_number}</span> : <span className="text-muted">No room</span>) },
              { header: 'Account', cell: (s) => <Badge tone={s.is_active ? 'brand' : 'neutral'}>{s.is_active ? 'Active' : 'Inactive'}</Badge> },
              {
                header: 'Actions',
                className: 'text-right',
                cell: (s) => (
                  <Button size="sm" variant="ghost" disabled={s.is_active && !!s.has_allocation} title={s.has_allocation ? 'End their stay first' : undefined} loading={toggle.isPending && toggle.variables?.id === s.id} onClick={() => toggle.mutate(s)}>
                    {s.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                ),
              },
            ]}
          />
        )}
        <Pager info={q.data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}
