import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { PublicShell } from '../components/Layout';
import { Button, Card, Field, inputCls, linkCls } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Role, SessionUser } from '../lib/types';

const demo = {
  student: { id: 'STU2024001', password: 'student123' },
  admin: { id: 'superadmin', password: 'admin123' },
};

interface LoginResponse {
  accessToken: string;
  student?: { id: number; student_id: string; first_name: string; last_name: string; course: string };
  admin?: { id: number; username: string; full_name: string; role: 'super_admin' | 'admin' };
}

export default function Login({ role }: { role: Role }) {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState(demo[role].id);
  const [password, setPassword] = useState(demo[role].password);
  const isAdmin = role === 'admin';

  const login = useMutation({
    mutationFn: () =>
      api<LoginResponse>(isAdmin ? '/api/admin/login' : '/api/students/login', {
        method: 'POST',
        body: isAdmin ? { username: identifier, password } : { studentId: identifier, password },
      }),
    onSuccess: (data) => {
      const session: SessionUser = data.admin
        ? { role: 'admin', id: data.admin.id, name: data.admin.full_name, subtitle: data.admin.role === 'super_admin' ? 'Super admin' : 'Warden', adminRole: data.admin.role }
        : { role: 'student', id: data.student!.id, name: `${data.student!.first_name} ${data.student!.last_name}`, subtitle: data.student!.student_id };
      signIn(data.accessToken, session);
      toast.success(`Welcome back, ${session.name.split(' ')[0]}`);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith(`/${role}`) ? from : `/${role}`, { replace: true });
    },
  });

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate();
  };
  const fieldErrors = login.error instanceof ApiError ? login.error.fieldErrors : {};

  return (
    <PublicShell>
      <main id="main" className="mx-auto grid max-w-md px-4 pt-6 pb-10">
        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{isAdmin ? 'Warden console' : 'Student portal'}</h1>
          <p className="mt-1 text-sm text-muted">
            {isAdmin ? 'Sign in to manage rooms, allocations, fees and complaints.' : 'Sign in with your student ID to manage your stay.'}
          </p>

          <div className="mt-5 flex gap-3 rounded-lg bg-info-100 p-3 text-sm text-info-700">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Demo account filled in: <span className="font-mono font-semibold">{demo[role].id}</span> /{' '}
              <span className="font-mono font-semibold">{demo[role].password}</span>
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field label={isAdmin ? 'Username' : 'Student ID'} error={fieldErrors.username ?? fieldErrors.studentId}>
              {(p) => <input {...p} className={inputCls} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />}
            </Field>
            <Field label="Password" error={fieldErrors.password}>
              {(p) => <input {...p} type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />}
            </Field>
            {login.error && Object.keys(fieldErrors).length === 0 && (
              <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-700">
                {login.error.message}
              </p>
            )}
            <Button type="submit" className="w-full" loading={login.isPending}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isAdmin ? (
              <>Resident? <Link to="/login" className={linkCls}>Student login</Link></>
            ) : (
              <>New here? <Link to="/register" className={linkCls}>Create a student account</Link></>
            )}
          </p>
        </Card>
      </main>
    </PublicShell>
  );
}
