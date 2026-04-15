import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import NavBar from './NavBar';
import Spinner from './Spinner';

export default function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <Spinner size="lg" label="Checking session" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <NavBar />
      <Outlet />
    </div>
  );
}
