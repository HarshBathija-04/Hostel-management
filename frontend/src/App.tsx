import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AppShell } from './components/Layout';
import { Skeleton } from './components/ui';
import { useAuth } from './lib/auth';
import type { Role } from './lib/types';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentRooms = lazy(() => import('./pages/student/Rooms'));
const StudentApplications = lazy(() => import('./pages/student/Applications'));
const MyRoom = lazy(() => import('./pages/student/MyRoom'));
const StudentFees = lazy(() => import('./pages/student/Fees'));
const StudentComplaints = lazy(() => import('./pages/student/Complaints'));
const Profile = lazy(() => import('./pages/student/Profile'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminApplications = lazy(() => import('./pages/admin/Applications'));
const AdminRooms = lazy(() => import('./pages/admin/Rooms'));
const AdminAllocations = lazy(() => import('./pages/admin/Allocations'));
const AdminStudents = lazy(() => import('./pages/admin/Students'));
const AdminFees = lazy(() => import('./pages/admin/Fees'));
const AdminComplaints = lazy(() => import('./pages/admin/Complaints'));

const titles: Record<string, string> = {
  '/': 'Room allotment for campus residences',
  '/login': 'Student login',
  '/register': 'Create a student account',
  '/admin/login': 'Warden login',
  '/student': 'Overview',
  '/student/rooms': 'Find a room',
  '/student/applications': 'My applications',
  '/student/my-room': 'My room',
  '/student/fees': 'My fees',
  '/student/complaints': 'My complaints',
  '/student/profile': 'Profile',
  '/admin': 'Warden dashboard',
  '/admin/applications': 'Applications',
  '/admin/rooms': 'Rooms & blocks',
  '/admin/allocations': 'Allocations',
  '/admin/students': 'Students',
  '/admin/fees': 'Fees',
  '/admin/complaints': 'Complaints',
};

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}

const PageFallback = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading page">
    <Skeleton className="h-9 w-56" />
    <Skeleton className="h-28 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${titles[pathname.replace(/\/$/, '') || '/'] ?? 'Page not found'} · Hostel Hub`;
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Suspense fallback={<div className="p-8"><PageFallback /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login role="student" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/login" element={<Login role="admin" />} />

        <Route path="/student" element={<RequireRole role="student"><AppShell /></RequireRole>}>
          <Route index element={<Suspense fallback={<PageFallback />}><StudentDashboard /></Suspense>} />
          <Route path="rooms" element={<Suspense fallback={<PageFallback />}><StudentRooms /></Suspense>} />
          <Route path="applications" element={<Suspense fallback={<PageFallback />}><StudentApplications /></Suspense>} />
          <Route path="my-room" element={<Suspense fallback={<PageFallback />}><MyRoom /></Suspense>} />
          <Route path="fees" element={<Suspense fallback={<PageFallback />}><StudentFees /></Suspense>} />
          <Route path="complaints" element={<Suspense fallback={<PageFallback />}><StudentComplaints /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageFallback />}><Profile /></Suspense>} />
        </Route>

        <Route path="/admin" element={<RequireRole role="admin"><AppShell /></RequireRole>}>
          <Route index element={<Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense>} />
          <Route path="applications" element={<Suspense fallback={<PageFallback />}><AdminApplications /></Suspense>} />
          <Route path="rooms" element={<Suspense fallback={<PageFallback />}><AdminRooms /></Suspense>} />
          <Route path="allocations" element={<Suspense fallback={<PageFallback />}><AdminAllocations /></Suspense>} />
          <Route path="students" element={<Suspense fallback={<PageFallback />}><AdminStudents /></Suspense>} />
          <Route path="fees" element={<Suspense fallback={<PageFallback />}><AdminFees /></Suspense>} />
          <Route path="complaints" element={<Suspense fallback={<PageFallback />}><AdminComplaints /></Suspense>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
