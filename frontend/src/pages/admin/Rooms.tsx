import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BedPips, Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, Segmented, Skeleton, StatusBadge, cx, inputCls } from '../../components/ui';
import { api, ApiError, errorMessage } from '../../lib/api';
import { date, label, money, percent } from '../../lib/format';
import type { Block, Room, RoomStatus } from '../../lib/types';

type StatusFilter = 'all' | RoomStatus;

export default function AdminRooms() {
  const [blockId, setBlockId] = useState<number | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Room | null>(null);
  const [adding, setAdding] = useState<'room' | 'block' | null>(null);

  const blocks = useQuery({ queryKey: ['admin', 'blocks'], queryFn: () => api<Block[]>('/api/admin/blocks') });
  // shortcut: loads up to 100 rooms in one page; add server paging to this board past ~100 rooms.
  const rooms = useQuery({ queryKey: ['admin', 'rooms', 'all'], queryFn: () => api<{ rooms: Room[] }>('/api/admin/rooms?limit=100') });

  const visible = (rooms.data?.rooms ?? []).filter((r) => (blockId === 'all' || r.block_id === blockId) && (status === 'all' || r.room_status === status));
  const grouped = (blocks.data ?? [])
    .map((b) => ({ block: b, rooms: visible.filter((r) => r.block_id === b.id) }))
    .filter((g) => g.rooms.length > 0);

  return (
    <>
      <PageHeader
        title="Rooms & blocks"
        description="Every bed at a glance. Select a room to see occupants or change its status."
        actions={
          <>
            <Button variant="secondary" icon={<Building2 className="size-4" />} onClick={() => setAdding('block')}>Add block</Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setAdding('room')}>Add room</Button>
          </>
        }
      />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by block">
        {blocks.isPending
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-44 shrink-0 rounded-xl" />)
          : [{ id: 'all' as const, block_name: 'All blocks', block_code: '', total_capacity: blocks.data?.reduce((s, b) => s + (b.total_capacity ?? 0), 0) ?? 0, total_occupied: blocks.data?.reduce((s, b) => s + (b.total_occupied ?? 0), 0) ?? 0 }, ...(blocks.data ?? [])].map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={blockId === b.id}
                onClick={() => setBlockId(b.id)}
                className={cx(
                  'min-w-40 shrink-0 rounded-xl border px-4 py-2.5 text-left transition-colors',
                  blockId === b.id ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <span className="block truncate text-sm font-semibold">{b.block_name}</span>
                <span className={cx('tabular text-xs', blockId === b.id ? 'text-brand-100' : 'text-muted')}>
                  {b.total_occupied ?? 0}/{b.total_capacity ?? 0} beds · {percent(b.total_occupied ?? 0, b.total_capacity ?? 0)}%
                </span>
              </button>
            ))}
      </div>

      <div className="mb-5">
        <Segmented<StatusFilter> label="Filter by room status" value={status} onChange={setStatus} options={(['all', 'available', 'full', 'maintenance', 'reserved'] as const).map((v) => ({ value: v, label: v === 'all' ? 'Any status' : label(v) }))} />
      </div>

      {rooms.isError ? (
        <Card><ErrorState message={errorMessage(rooms.error)} onRetry={() => rooms.refetch()} /></Card>
      ) : rooms.isPending || blocks.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : grouped.length === 0 ? (
        <Card><EmptyState icon={<Building2 className="size-5" />} title="No rooms match" description="Change the block or status filter, or add a room." /></Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ block, rooms: list }) => (
            <section key={block.id} aria-labelledby={`block-${block.id}`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id={`block-${block.id}`} className="font-semibold">{block.block_name}</h2>
                <span className="text-sm text-muted">{label(block.gender_type)} · {block.warden_name ?? 'No warden'}</span>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {list.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className={cx(
                        'h-full w-full rounded-xl border p-3 text-left transition-[border-color,box-shadow] hover:border-brand-500 hover:shadow-card',
                        r.room_status === 'maintenance' ? 'border-amber-400/60 bg-amber-100/50' : r.room_status === 'full' ? 'border-line bg-sunken/60' : 'border-line bg-surface',
                      )}
                      aria-label={`Room ${r.room_number}, ${r.occupied_beds} of ${r.capacity} beds occupied, ${r.room_status}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="tabular text-sm font-semibold">{r.room_number}</span>
                        <span className="text-[11px] text-muted">F{r.floor_number}</span>
                      </span>
                      <span className="mt-2 block"><BedPips capacity={r.capacity} occupied={r.occupied_beds} size="sm" /></span>
                      <span className="mt-2 block text-[11px] text-muted">{r.room_status === 'available' ? `${r.available_beds} free · ${money(r.monthly_rent)}` : label(r.room_status)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {selected && <RoomModal room={selected} onClose={() => setSelected(null)} />}
      {adding === 'room' && <AddRoomModal blocks={blocks.data ?? []} onClose={() => setAdding(null)} />}
      {adding === 'block' && <AddBlockModal onClose={() => setAdding(null)} />}
    </>
  );
}

function RoomModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ['admin', 'room', room.id],
    queryFn: () => api<{ room: Room; occupants: { id: number; student_id: string; name: string; course: string; bed_number: number; allocation_date: string }[] }>(`/api/admin/rooms/${room.id}`),
  });
  const [form, setForm] = useState({ roomStatus: room.room_status, monthlyRent: String(room.monthly_rent), facilities: room.facilities ?? '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = (msg: string) => {
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    onClose();
  };
  const save = useMutation({
    mutationFn: () => api(`/api/admin/rooms/${room.id}`, { method: 'PUT', body: form }),
    onSuccess: () => done(`Room ${room.room_number} updated`),
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/admin/rooms/${room.id}`, { method: 'DELETE' }),
    onSuccess: () => done(`Room ${room.room_number} deleted`),
    onError: (e) => toast.error(e.message),
  });
  const occupants = detail.data?.occupants ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title={`${room.block_code}-${room.room_number}`}
      description={`${room.block_name} · ${label(room.room_type)} · floor ${room.floor_number}`}
      footer={
        confirmDelete ? (
          <>
            <span className="mr-auto self-center text-sm text-danger-700">Delete this room permanently?</span>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Delete</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto text-danger-700" icon={<Trash2 className="size-4" />} disabled={occupants.length > 0} onClick={() => setConfirmDelete(true)} title={occupants.length ? 'Move occupants out first' : undefined}>Delete</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button type="submit" form="room-form" loading={save.isPending}>Save</Button>
          </>
        )
      }
    >
      <div className="flex items-center gap-3">
        <BedPips capacity={room.capacity} occupied={room.occupied_beds} />
        <span className="text-sm text-muted">{room.occupied_beds} of {room.capacity} beds occupied</span>
        <StatusBadge status={room.room_status} />
      </div>
      <h3 className="mt-5 text-sm font-semibold">Occupants</h3>
      {detail.isPending ? (
        <Skeleton className="mt-2 h-12 w-full" />
      ) : occupants.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Nobody lives here right now.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {occupants.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0"><span className="font-medium">{o.name}</span> <span className="text-muted">· {o.student_id}</span></span>
              <span className="shrink-0 text-xs text-muted">Bed {o.bed_number} · since {date(o.allocation_date)}</span>
            </li>
          ))}
        </ul>
      )}
      <form id="room-form" className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Status">
          {(p) => (
            <select {...p} className={inputCls} value={form.roomStatus} onChange={(e) => setForm({ ...form, roomStatus: e.target.value as RoomStatus })}>
              {(['available', 'full', 'maintenance', 'reserved'] as const).map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          )}
        </Field>
        <Field label="Monthly rent (₹)">
          {(p) => <input {...p} type="number" min={0} step={100} className={inputCls} value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} />}
        </Field>
        <Field label="Facilities" hint="Comma-separated" className="sm:col-span-2">
          {(p) => <input {...p} className={inputCls} value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} />}
        </Field>
      </form>
    </Modal>
  );
}

function AddRoomModal({ blocks, onClose }: { blocks: Block[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ blockId: blocks[0] ? String(blocks[0].id) : '', roomNumber: '', floorNumber: '1', roomType: 'double', capacity: '2', monthlyRent: '6000', facilities: 'WiFi, Study Table, Wardrobe' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const create = useMutation({
    mutationFn: () => api('/api/admin/rooms', { method: 'POST', body: { ...form, blockId: Number(form.blockId), floorNumber: Number(form.floorNumber), capacity: Number(form.capacity) } }),
    onSuccess: () => {
      toast.success(`Room ${form.roomNumber} added`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
  });
  const errors = create.error instanceof ApiError ? create.error.fieldErrors : {};
  const capacities: Record<string, string> = { single: '1', double: '2', triple: '3', quad: '4' };

  return (
    <Modal open onClose={onClose} title="Add a room" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="add-room" loading={create.isPending}>Add room</Button></>}>
      <form id="add-room" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }} noValidate>
        <Field label="Block" error={errors.blockId} className="sm:col-span-2">
          {(p) => <select {...p} className={inputCls} value={form.blockId} onChange={set('blockId')}>{blocks.map((b) => <option key={b.id} value={b.id}>{b.block_name}</option>)}</select>}
        </Field>
        <Field label="Room number" error={errors.roomNumber}>{(p) => <input {...p} className={inputCls} value={form.roomNumber} onChange={set('roomNumber')} placeholder="305" />}</Field>
        <Field label="Floor" error={errors.floorNumber}>{(p) => <input {...p} type="number" min={0} className={inputCls} value={form.floorNumber} onChange={set('floorNumber')} />}</Field>
        <Field label="Type" error={errors.roomType}>
          {(p) => <select {...p} className={inputCls} value={form.roomType} onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value, capacity: capacities[e.target.value] }))}>{Object.keys(capacities).map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>}
        </Field>
        <Field label="Beds" error={errors.capacity}>{(p) => <input {...p} type="number" min={1} max={10} className={inputCls} value={form.capacity} onChange={set('capacity')} />}</Field>
        <Field label="Monthly rent (₹)" error={errors.monthlyRent}>{(p) => <input {...p} type="number" min={0} step={100} className={inputCls} value={form.monthlyRent} onChange={set('monthlyRent')} />}</Field>
        <Field label="Facilities" error={errors.facilities}>{(p) => <input {...p} className={inputCls} value={form.facilities} onChange={set('facilities')} />}</Field>
        {create.error && Object.keys(errors).length === 0 && <p role="alert" className="text-sm text-danger-700 sm:col-span-2">{create.error.message}</p>}
      </form>
    </Modal>
  );
}

function AddBlockModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ blockName: '', blockCode: '', genderType: 'mixed', totalFloors: '3', wardenName: '', wardenContact: '', description: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const create = useMutation({
    mutationFn: () => api('/api/admin/blocks', { method: 'POST', body: { ...form, totalFloors: Number(form.totalFloors), wardenContact: form.wardenContact || undefined, wardenName: form.wardenName || undefined, description: form.description || undefined } }),
    onSuccess: () => {
      toast.success(`${form.blockName} added`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
  });
  const errors = create.error instanceof ApiError ? create.error.fieldErrors : {};

  return (
    <Modal open onClose={onClose} title="Add a block" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="add-block" loading={create.isPending}>Add block</Button></>}>
      <form id="add-block" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }} noValidate>
        <Field label="Block name" error={errors.blockName}>{(p) => <input {...p} className={inputCls} value={form.blockName} onChange={set('blockName')} placeholder="Girls Block C" />}</Field>
        <Field label="Code" error={errors.blockCode} hint="Short, e.g. GBC">{(p) => <input {...p} className={inputCls} value={form.blockCode} onChange={set('blockCode')} maxLength={10} />}</Field>
        <Field label="Open to" error={errors.genderType}>
          {(p) => <select {...p} className={inputCls} value={form.genderType} onChange={set('genderType')}><option value="male">Male students</option><option value="female">Female students</option><option value="mixed">All students</option></select>}
        </Field>
        <Field label="Floors" error={errors.totalFloors}>{(p) => <input {...p} type="number" min={1} max={20} className={inputCls} value={form.totalFloors} onChange={set('totalFloors')} />}</Field>
        <Field label="Warden name" error={errors.wardenName}>{(p) => <input {...p} className={inputCls} value={form.wardenName} onChange={set('wardenName')} />}</Field>
        <Field label="Warden phone" error={errors.wardenContact}>{(p) => <input {...p} type="tel" inputMode="numeric" className={inputCls} value={form.wardenContact} onChange={set('wardenContact')} />}</Field>
        <Field label="Description" error={errors.description} className="sm:col-span-2">{(p) => <input {...p} className={inputCls} value={form.description} onChange={set('description')} />}</Field>
        {create.error && Object.keys(errors).length === 0 && <p role="alert" className="text-sm text-danger-700 sm:col-span-2">{create.error.message}</p>}
      </form>
    </Modal>
  );
}
