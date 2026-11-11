import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AppShell, PageFallback } from './components/Layout';
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
          <Route index element={<StudentDashboard />} />
          <Route path="rooms" element={<StudentRooms />} />
          <Route path="applications" element={<StudentApplications />} />
          <Route path="my-room" element={<MyRoom />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="complaints" element={<StudentComplaints />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="/admin" element={<RequireRole role="admin"><AppShell /></RequireRole>}>
          <Route index element={<AdminDashboard />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="rooms" element={<AdminRooms />} />
          <Route path="allocations" element={<AdminAllocations />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="fees" element={<AdminFees />} />
          <Route path="complaints" element={<AdminComplaints />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
