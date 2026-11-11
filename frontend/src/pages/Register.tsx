import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PublicShell } from '../components/Layout';
import { Button, Card, Field, inputCls } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

const empty = {
  studentId: '', email: '', password: '', firstName: '', lastName: '', gender: '', course: '', department: '', yearOfStudy: '1', phone: '',
};

export default function Register() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const register = useMutation({
    mutationFn: () =>
      api<{ accessToken: string; student: { id: number; student_id: string; first_name: string; last_name: string } }>('/api/students/register', {
        method: 'POST',
        body: { ...form, yearOfStudy: Number(form.yearOfStudy), phone: form.phone || undefined, department: form.department || undefined },
      }),
    onSuccess: (data) => {
      signIn(data.accessToken, { role: 'student', id: data.student.id, name: `${data.student.first_name} ${data.student.last_name}`, subtitle: data.student.student_id });
      toast.success('Account created. You can apply for a room now.');
      navigate('/student/rooms', { replace: true });
    },
  });

  if (user) return <Navigate to={`/${user.role}`} replace />;
  const errors = register.error instanceof ApiError ? register.error.fieldErrors : {};
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate();
  };

  return (
    <PublicShell>
      <main id="main" className="mx-auto max-w-2xl px-4 pt-6 pb-10">
        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Create a student account</h1>
          <p className="mt-1 text-sm text-muted">Use the student ID printed on your university card.</p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
            <Field label="First name" error={errors.firstName}>
              {(p) => <input {...p} className={inputCls} value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />}
            </Field>
            <Field label="Last name" error={errors.lastName}>
              {(p) => <input {...p} className={inputCls} value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />}
            </Field>
            <Field label="Student ID" error={errors.studentId} hint="5-20 letters or numbers">
              {(p) => <input {...p} className={inputCls} value={form.studentId} onChange={set('studentId')} autoComplete="username" required />}
            </Field>
            <Field label="Email" error={errors.email}>
              {(p) => <input {...p} type="email" className={inputCls} value={form.email} onChange={set('email')} autoComplete="email" required />}
            </Field>
            <Field label="Password" error={errors.password} hint="At least 6 characters with upper, lower case and a number" className="sm:col-span-2">
              {(p) => <input {...p} type="password" className={inputCls} value={form.password} onChange={set('password')} autoComplete="new-password" required />}
            </Field>
            <Field label="Gender" error={errors.gender} hint="Used to show the blocks open to you">
              {(p) => (
                <select {...p} className={inputCls} value={form.gender} onChange={set('gender')} required>
                  <option value="" disabled>Select…</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              )}
            </Field>
            <Field label="Year of study" error={errors.yearOfStudy}>
              {(p) => (
                <select {...p} className={inputCls} value={form.yearOfStudy} onChange={set('yearOfStudy')}>
                  {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              )}
            </Field>
            <Field label="Course" error={errors.course}>
              {(p) => <input {...p} className={inputCls} value={form.course} onChange={set('course')} placeholder="B.Tech Computer Science" required />}
            </Field>
            <Field label="Department (optional)" error={errors.department}>
              {(p) => <input {...p} className={inputCls} value={form.department} onChange={set('department')} placeholder="Engineering" />}
            </Field>
            <Field label="Phone (optional)" error={errors.phone} hint="10-15 digits">
              {(p) => <input {...p} type="tel" inputMode="numeric" className={inputCls} value={form.phone} onChange={set('phone')} autoComplete="tel" />}
            </Field>

            {register.error && Object.keys(errors).length === 0 && (
              <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-700 sm:col-span-2">{register.error.message}</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <p className="text-sm text-muted">
                Already registered? <Link to="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
              </p>
              <Button type="submit" loading={register.isPending}>Create account</Button>
            </div>
          </form>
        </Card>
      </main>
    </PublicShell>
  );
}
