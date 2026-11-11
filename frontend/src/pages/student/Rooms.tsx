import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BedDouble } from 'lucide-react';
import { ApplyModal } from '../../components/ApplyModal';
import { BedPips, Button, Card, EmptyState, ErrorState, PageHeader, Segmented, Skeleton, inputCls } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { label, money } from '../../lib/format';
import type { Block, Room } from '../../lib/types';

type TypeFilter = 'all' | 'single' | 'double' | 'triple' | 'quad';

export default function StudentRooms() {
  const [blockId, setBlockId] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [applyFor, setApplyFor] = useState<Room | null | undefined>(undefined);

  const blocks = useQuery({ queryKey: ['student', 'blocks'], queryFn: () => api<Block[]>('/api/students/blocks') });
  const params = new URLSearchParams({ ...(blockId && { blockId }), ...(type !== 'all' && { roomType: type }) });
  const rooms = useQuery({ queryKey: ['student', 'rooms', blockId, type], queryFn: () => api<Room[]>(`/api/students/available-rooms?${params}`) });

  return (
    <>
      <PageHeader
        title="Find a room"
        description="Rooms with at least one free bed in the blocks open to you."
        actions={<Button onClick={() => setApplyFor(null)}>Apply without a preference</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="block-filter">Block</label>
        <select id="block-filter" className={`${inputCls} w-auto min-w-48`} value={blockId} onChange={(e) => setBlockId(e.target.value)}>
          <option value="">All blocks</option>
          {blocks.data?.map((b) => <option key={b.id} value={b.id}>{b.block_name}</option>)}
        </select>
        <Segmented<TypeFilter>
          label="Room type"
          value={type}
          onChange={setType}
          options={[{ value: 'all', label: 'All types' }, ...(['single', 'double', 'triple', 'quad'] as const).map((t) => ({ value: t, label: label(t) }))]}
        />
      </div>

      {rooms.isError ? (
        <Card><ErrorState message={errorMessage(rooms.error)} onRetry={() => rooms.refetch()} /></Card>
      ) : rooms.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-52 rounded-card" />)}</div>
      ) : rooms.data.length === 0 ? (
        <Card>
          <EmptyState icon={<BedDouble className="size-5" />} title="No free beds match these filters" description="Try another block or room type, or apply without a preference to join the queue." action={<Button variant="secondary" onClick={() => { setBlockId(''); setType('all'); }}>Clear filters</Button>} />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.data.map((r) => (
            <li key={r.id}>
              <Card as="article" className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">{r.block_name}</p>
                    <h2 className="tabular mt-1 text-xl font-semibold">Room {r.room_number}</h2>
                    <p className="text-sm text-muted">{label(r.room_type)} · Floor {r.floor_number}</p>
                  </div>
                  <p className="tabular text-right">
                    <span className="block text-lg font-semibold">{money(r.monthly_rent)}</span>
                    <span className="text-xs text-muted">per month</span>
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <BedPips capacity={r.capacity} occupied={r.occupied_beds} />
                  <span className="text-sm text-muted">{r.available_beds} of {r.capacity} free</span>
                </div>
                {r.facilities && (
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Facilities">
                    {r.facilities.split(',').map((f) => <li key={f} className="rounded-md bg-sunken px-2 py-0.5 text-xs text-muted">{f.trim()}</li>)}
                  </ul>
                )}
                <div className="mt-auto pt-5">
                  <Button variant="secondary" className="w-full" onClick={() => setApplyFor(r)}>Apply for this block</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {applyFor !== undefined && (
        <ApplyModal open onClose={() => setApplyFor(undefined)} initialBlockId={applyFor?.block_id} initialType={applyFor?.room_type} />
      )}
    </>
  );
}
