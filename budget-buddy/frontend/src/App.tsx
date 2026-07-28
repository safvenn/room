import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import { useEffect, useState } from 'react';
import { authAPI } from './api/services';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FriendsPage from './pages/FriendsPage';
import GroupsPage from './pages/GroupsPage';
import AddExpensePage from './pages/AddExpensePage';
import EditExpensePage from './pages/EditExpensePage';
import HistoryPage from './pages/HistoryPage';
import SettlementsPage from './pages/SettlementsPage';
import BudgetPage from './pages/BudgetPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ─── AppShell ──────────────────────────────────────────────────────────────
// Validates the stored token on every app open.
// If the token is expired/missing it clears auth before routing.
// This fixes the "opened after long idle → frozen on Profile" bug.
function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }
    // Verify the token is still valid
    authAPI.me()
      .then(() => setChecking(false))
      .catch(() => {
        logout();
        setChecking(false);
        navigate('/login', { replace: true });
      });
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
            account_balance_wallet
          </span>
          <p className="text-sm font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Route guards ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AnonymousRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  // Authenticated users are always sent to /add-expense
  return !isAuthenticated ? <>{children}</> : <Navigate to="/add-expense" replace />;
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <AnonymousRoute>
                  <LoginPage />
                </AnonymousRoute>
              }
            />
            <Route
              path="/register"
              element={
                <AnonymousRoute>
                  <RegisterPage />
                </AnonymousRoute>
              }
            />

            {/* Protected Main Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <FriendsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <GroupsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-expense"
              element={
                <ProtectedRoute>
                  <AddExpensePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-expense/:id"
              element={
                <ProtectedRoute>
                  <EditExpensePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settlements"
              element={
                <ProtectedRoute>
                  <SettlementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/budget"
              element={
                <ProtectedRoute>
                  <BudgetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Fallback — authenticated → /add-expense, else → /login */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'glass-panel text-primary font-semibold',
          duration: 3000,
        }}
      />
    </QueryClientProvider>
  );
}

function RootRedirect() {
  const { isAuthenticated } = useAuthStore();
  return <Navigate to={isAuthenticated ? '/add-expense' : '/login'} replace />;
}
