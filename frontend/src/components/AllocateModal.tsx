import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BedPips, Button, Field, FormError, Modal, inputCls } from './ui';
import { api, ApiError } from '../lib/api';
import { money, todayIso } from '../lib/format';
import type { Room, Student } from '../lib/types';

interface Target { studentId: number; gender: string; name: string; applicationId?: number; startDate?: string | null; blockId?: number | null }

/** Allot a bed. Pass `target` when allotting from an application; otherwise pick an unallocated student. */
export function AllocateModal({ open, onClose, target }: { open: boolean; onClose: () => void; target?: Target }) {
  const queryClient = useQueryClient();
  const rooms = useQuery({ queryKey: ['admin', 'rooms', 'all'], queryFn: () => api<{ rooms: Room[] }>('/api/admin/rooms?limit=100'), enabled: open });
  const students = useQuery({
    queryKey: ['admin', 'students', 'unallocated'],
    queryFn: () => api<{ students: Student[] }>('/api/admin/students?limit=100'),
    enabled: open && !target,
  });
  const [studentId, setStudentId] = useState(target ? String(target.studentId) : '');
  const [roomId, setRoomId] = useState('');
  const [startDate, setStartDate] = useState(target?.startDate && target.startDate > todayIso() ? target.startDate : todayIso());
  const [endDate, setEndDate] = useState('');
  const [deposit, setDeposit] = useState('');

  const unallocated = students.data?.students.filter((s) => s.is_active && !s.has_allocation) ?? [];
  const gender = target?.gender ?? unallocated.find((s) => String(s.id) === studentId)?.gender;
  const options = useMemo(
    () =>
      (rooms.data?.rooms ?? [])
        .filter((r) => r.is_active && r.available_beds > 0 && !['maintenance', 'reserved'].includes(r.room_status))
        .filter((r) => !gender || r.gender_type === 'mixed' || r.gender_type === gender)
        .sort((a, b) => Number(b.block_id === target?.blockId) - Number(a.block_id === target?.blockId)),
    [rooms.data, gender, target?.blockId],
  );
  const room = options.find((r) => String(r.id) === roomId);

  const allocate = useMutation({
    mutationFn: () =>
      api('/api/admin/allocations', {
        method: 'POST',
        body: {
          studentId: Number(studentId),
          roomId: Number(roomId),
          applicationId: target?.applicationId,
          startDate,
          endDate: endDate || undefined,
          securityDeposit: deposit || (room ? String(room.monthly_rent * 2) : undefined),
        },
      }),
    onSuccess: () => {
      toast.success(`Room allotted${target ? ` to ${target.name}` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
  });
  const errors = allocate.error instanceof ApiError ? allocate.error.fieldErrors : {};
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    allocate.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={target ? `Allot a room to ${target.name}` : 'New allocation'}
      description="Only rooms with a free bed in blocks open to the student are listed."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="allocate-form" loading={allocate.isPending} disabled={!studentId || !roomId}>Allot room</Button></>}
    >
      <form id="allocate-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!target && (
          <Field label="Student" error={errors.studentId} className="sm:col-span-2" hint={students.isPending ? 'Loading students…' : `${unallocated.length} students without a room`}>
            {(p) => (
              <select {...p} className={inputCls} value={studentId} onChange={(e) => { setStudentId(e.target.value); setRoomId(''); }}>
                <option value="">Select a student…</option>
                {unallocated.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.student_id}</option>)}
              </select>
            )}
          </Field>
        )}
        <Field label="Room" error={errors.roomId} className="sm:col-span-2" hint={rooms.isPending ? 'Loading rooms…' : `${options.length} rooms available`}>
          {(p) => (
            <select {...p} className={inputCls} value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={!studentId}>
              <option value="">{studentId ? 'Select a room…' : 'Pick a student first'}</option>
              {options.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.block_code}-{r.room_number} · {r.room_type} · {r.available_beds} free · {money(r.monthly_rent)}/mo
                </option>
              ))}
            </select>
          )}
        </Field>
        {room && (
          <div className="flex items-center gap-3 rounded-lg bg-canvas p-3 text-sm sm:col-span-2">
            <BedPips capacity={room.capacity} occupied={room.occupied_beds} />
            <span className="text-muted">Bed {room.occupied_beds + 1} will be assigned · rent {money(room.monthly_rent)} a month</span>
          </div>
        )}
        <Field label="Start date" error={errors.startDate}>
          {(p) => <input {...p} type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />}
        </Field>
        <Field label="End date (optional)" error={errors.endDate}>
          {(p) => <input {...p} type="date" min={startDate} className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
        </Field>
        <Field label="Security deposit" error={errors.securityDeposit} hint="Defaults to two months’ rent" className="sm:col-span-2">
          {(p) => <input {...p} type="number" min={0} step={100} inputMode="numeric" className={inputCls} value={deposit} placeholder={room ? String(room.monthly_rent * 2) : ''} onChange={(e) => setDeposit(e.target.value)} />}
        </Field>
        <FormError error={allocate.error} className="sm:col-span-2" />
      </form>
    </Modal>
  );
}
