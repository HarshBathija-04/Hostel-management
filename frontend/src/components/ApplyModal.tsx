import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button, Field, Modal, inputCls } from './ui';
import { api, ApiError } from '../lib/api';
import { todayIso } from '../lib/format';
import type { Block } from '../lib/types';

export function ApplyModal({ open, onClose, initialBlockId, initialType }: { open: boolean; onClose: () => void; initialBlockId?: number; initialType?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const blocks = useQuery({ queryKey: ['student', 'blocks'], queryFn: () => api<Block[]>('/api/students/blocks'), enabled: open });
  const [form, setForm] = useState({
    preferredBlockId: initialBlockId ? String(initialBlockId) : '',
    preferredRoomType: initialType ?? 'any',
    preferredStartDate: todayIso(),
    durationMonths: '10',
    specialRequirements: '',
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = useMutation({
    mutationFn: () =>
      api('/api/students/applications', {
        method: 'POST',
        body: {
          preferredBlockId: form.preferredBlockId ? Number(form.preferredBlockId) : undefined,
          preferredRoomType: form.preferredRoomType,
          preferredStartDate: form.preferredStartDate,
          durationMonths: Number(form.durationMonths),
          specialRequirements: form.specialRequirements || undefined,
        },
      }),
    onSuccess: () => {
      toast.success('Application submitted. The warden will review it shortly.');
      queryClient.invalidateQueries({ queryKey: ['student'] });
      onClose();
      navigate('/student/applications');
    },
    onError: (error) => {
      if (!(error instanceof ApiError) || Object.keys(error.fieldErrors).length === 0) toast.error(error.message);
    },
  });
  const errors = submit.error instanceof ApiError ? submit.error.fieldErrors : {};
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apply for a room"
      description="One active application at a time. You can cancel it while it is pending."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="apply-form" loading={submit.isPending}>Submit application</Button>
        </>
      }
    >
      <form id="apply-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Preferred block" error={errors.preferredBlockId} className="sm:col-span-2">
          {(p) => (
            <select {...p} className={inputCls} value={form.preferredBlockId} onChange={set('preferredBlockId')}>
              <option value="">No preference</option>
              {blocks.data?.map((b) => <option key={b.id} value={b.id}>{b.block_name} ({b.block_code})</option>)}
            </select>
          )}
        </Field>
        <Field label="Room type" error={errors.preferredRoomType}>
          {(p) => (
            <select {...p} className={inputCls} value={form.preferredRoomType} onChange={set('preferredRoomType')}>
              {['any', 'single', 'double', 'triple', 'quad'].map((t) => <option key={t} value={t}>{t === 'any' ? 'Any type' : t[0].toUpperCase() + t.slice(1)}</option>)}
            </select>
          )}
        </Field>
        <Field label="Duration" error={errors.durationMonths}>
          {(p) => (
            <select {...p} className={inputCls} value={form.durationMonths} onChange={set('durationMonths')}>
              {[3, 6, 10, 12, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
          )}
        </Field>
        <Field label="Move-in date" error={errors.preferredStartDate} className="sm:col-span-2">
          {(p) => <input {...p} type="date" min={todayIso()} className={inputCls} value={form.preferredStartDate} onChange={set('preferredStartDate')} required />}
        </Field>
        <Field label="Anything the warden should know? (optional)" error={errors.specialRequirements} className="sm:col-span-2">
          {(p) => <textarea {...p} rows={3} maxLength={500} className={inputCls} value={form.specialRequirements} onChange={set('specialRequirements')} placeholder="e.g. ground floor for medical reasons" />}
        </Field>
      </form>
    </Modal>
  );
}
