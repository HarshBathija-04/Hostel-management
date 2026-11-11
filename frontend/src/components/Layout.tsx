import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import {
  BedDouble, Building2, ClipboardList, CreditCard, KeyRound, LayoutDashboard, LogOut, Menu, UserRound, Users, Wrench, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { wakeStore } from '../lib/api';
import { cx, Skeleton } from './ui';

const nav = {
  student: [
    { to: '/student', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/student/rooms', label: 'Find a room', icon: BedDouble },
    { to: '/student/applications', label: 'Applications', icon: ClipboardList },
    { to: '/student/my-room', label: 'My room', icon: KeyRound },
    { to: '/student/fees', label: 'Fees', icon: CreditCard },
    { to: '/student/complaints', label: 'Complaints', icon: Wrench },
    { to: '/student/profile', label: 'Profile', icon: UserRound },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/applications', label: 'Applications', icon: ClipboardList },
    { to: '/admin/rooms', label: 'Rooms & blocks', icon: Building2 },
    { to: '/admin/allocations', label: 'Allocations', icon: KeyRound },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/fees', label: 'Fees', icon: CreditCard },
    { to: '/admin/complaints', label: 'Complaints', icon: Wrench },
  ],
};

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="size-8" width={32} height={32} />
      <span className={cx('font-display text-lg font-semibold tracking-tight', light ? 'text-white' : 'text-ink')}>Hostel Hub</span>
    </span>
  );
}

export const PageFallback = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading page">
    <Skeleton className="h-9 w-56" />
    <Skeleton className="h-28 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export function WakeBanner() {
  const waking = useSyncExternalStore(wakeStore.subscribe, wakeStore.isWaking);
  return (
    <div aria-live="polite">
      {waking && (
        <div className="flex items-center gap-3 border-b border-amber-400/40 bg-amber-100 px-4 py-2.5 text-sm text-amber-700">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-amber-400" aria-hidden />
          <span>
            <strong className="font-semibold">Waking up the server…</strong> The free-tier API sleeps when idle, so the first request can take
            up to a minute.
          </span>
        </div>
      )}
    </div>
  );
}

function NavList({ role, onNavigate }: { role: 'student' | 'admin'; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {nav[role].map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                isActive ? 'bg-white/12 text-white' : 'text-brand-100/80 hover:bg-white/6 hover:text-white',
              )
            }
          >
            <Icon className="size-4.5 shrink-0" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-5">
      <Link to={`/${user.role}`} className="px-2" onClick={onNavigate}>
        <Logo light />
      </Link>
      <nav aria-label={user.role === 'admin' ? 'Admin' : 'Student'} className="flex-1">
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-brand-200/70 uppercase">
          {user.role === 'admin' ? 'Warden console' : 'Resident portal'}
        </p>
        <NavList role={user.role} onNavigate={onNavigate} />
      </nav>
      <div className="rounded-xl bg-white/6 p-3">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-brand-100/70">{user.subtitle}</p>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-brand-100/90 transition-colors hover:bg-white/8 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setDrawerOpen(false), [location.pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-pop">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-brand-900 on-dark lg:block">
        <SidebarContent />
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="grid size-11 place-items-center rounded-lg text-ink hover:bg-sunken"
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
        >
          <Menu className="size-5" />
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-brand-900 on-dark shadow-pop">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-3 grid size-10 place-items-center rounded-lg text-brand-100 hover:bg-white/10"
              aria-label="Close navigation"
              autoFocus
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <WakeBanner />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <WakeBanner />
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link to="/" aria-label="Hostel Hub home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link to="/login" className="rounded-lg px-3 py-2 text-muted hover:bg-sunken hover:text-ink">
            Student login
          </Link>
          <Link to="/admin/login" className="rounded-lg px-3 py-2 text-muted hover:bg-sunken hover:text-ink">
            Warden login
          </Link>
        </nav>
      </header>
      {children}
      <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <span>Hostel Hub · built by Harsh Bathija</span>
          <a href="https://github.com/HarshBathija-04/Hostel-management" className="hover:text-ink" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

