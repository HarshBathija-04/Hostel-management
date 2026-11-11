import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Card, CardHeader, ErrorState, Field, FormError, PageHeader, Skeleton, inputCls } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import type { Student } from '../../lib/types';

type Editable = Record<'firstName' | 'lastName' | 'phone' | 'address' | 'emergencyContactName' | 'emergencyContactPhone', string>;

export default function Profile() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['student', 'profile'], queryFn: () => api<Student>('/api/students/profile') });
  const [form, setForm] = useState<Editable | null>(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    const s = profile.data;
    if (s && !form) {
      setForm({
        firstName: s.first_name, lastName: s.last_name, phone: s.phone ?? '', address: s.address ?? '',
        emergencyContactName: s.emergency_contact_name ?? '', emergencyContactPhone: s.emergency_contact_phone ?? '',
      });
    }
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (body: Editable) => api('/api/students/profile', { method: 'PUT', body }),
    onSuccess: () => {
      toast.success('Profile saved');
      queryClient.invalidateQueries({ queryKey: ['student'] });
    },
    onError: (e) => toast.error(e.message),
  });
  const changePw = useMutation({
    mutationFn: () => api('/api/students/change-password', { method: 'PUT', body: pw }),
    onSuccess: () => {
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '' });
    },
  });

  if (profile.isError) return <Card><ErrorState error={profile.error} onRetry={() => profile.refetch()} /></Card>;
  const s = profile.data;
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {};
  const pwErrors = changePw.error instanceof ApiError ? changePw.error.fieldErrors : {};
  const set = (key: keyof Editable) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (form) save.mutate(form);
  };
  const onPw = (e: FormEvent) => {
    e.preventDefault();
    changePw.mutate();
  };

  return (
    <>
      <PageHeader title="Profile" description={s ? `${s.student_id} · ${s.email}` : undefined} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Contact details" description="Course and student ID are managed by the hostel office." />
          {!form ? (
            <div className="space-y-4 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
          ) : (
            <form onSubmit={onSave} className="grid gap-4 p-5 sm:grid-cols-2" noValidate>
              <Field label="First name" error={errors.firstName}>{(p) => <input {...p} className={inputCls} value={form.firstName} onChange={set('firstName')} autoComplete="given-name" />}</Field>
              <Field label="Last name" error={errors.lastName}>{(p) => <input {...p} className={inputCls} value={form.lastName} onChange={set('lastName')} autoComplete="family-name" />}</Field>
              <Field label="Phone" error={errors.phone}>{(p) => <input {...p} type="tel" inputMode="numeric" className={inputCls} value={form.phone} onChange={set('phone')} autoComplete="tel" />}</Field>
              <Field label="Home address" error={errors.address}>{(p) => <input {...p} className={inputCls} value={form.address} onChange={set('address')} autoComplete="street-address" />}</Field>
              <Field label="Emergency contact" error={errors.emergencyContactName}>{(p) => <input {...p} className={inputCls} value={form.emergencyContactName} onChange={set('emergencyContactName')} />}</Field>
              <Field label="Emergency phone" error={errors.emergencyContactPhone}>{(p) => <input {...p} type="tel" inputMode="numeric" className={inputCls} value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} />}</Field>
              <div className="flex justify-end sm:col-span-2"><Button type="submit" loading={save.isPending}>Save changes</Button></div>
            </form>
          )}
        </Card>

        <Card>
          <CardHeader title="Change password" />
          <form onSubmit={onPw} className="space-y-4 p-5" noValidate>
            <Field label="Current password" error={pwErrors.currentPassword}>
              {(p) => <input {...p} type="password" className={inputCls} value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" />}
            </Field>
            <Field label="New password" error={pwErrors.newPassword} hint="8+ characters with upper, lower case and a number">
              {(p) => <input {...p} type="password" className={inputCls} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />}
            </Field>
            <FormError error={changePw.error} />
            <Button type="submit" variant="secondary" className="w-full" loading={changePw.isPending}>Update password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
