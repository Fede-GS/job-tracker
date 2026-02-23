import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProfileProvider } from './context/ProfileContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import Toast from './components/common/Toast';
import PageTransition from './components/common/PageTransition';
import OnboardingGuard from './components/common/OnboardingGuard';
import TutorialOverlay from './components/common/TutorialOverlay';
import FloatingAI from './components/chat/FloatingAI';
import Dashboard from './pages/Dashboard';
import ApplicationsList from './pages/ApplicationsList';
import NewApplication from './pages/NewApplication';
import ApplicationDetail from './pages/ApplicationDetail';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import JobSearch from './pages/JobSearch';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Register from './pages/Register';

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Page keys that have page-level tutorial tips
const PAGE_TUTORIAL_KEYS = [
  'dashboard', 'applications', 'jobSearch',
  'newApplication', 'profile', 'aiAssistant', 'settings',
];

function AppLayout() {
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);

  // Auto-show tutorial on first visit
  useEffect(() => {
    const completed = localStorage.getItem('tutorial_completed');
    if (!completed) {
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Replay tutorial: also clear page-level tutorial flags
  const handleReplayTutorial = useCallback(() => {
    localStorage.removeItem('tutorial_completed');
    PAGE_TUTORIAL_KEYS.forEach((key) => {
      localStorage.removeItem(`tutorial_page_${key}`);
    });
    setShowTutorial(true);
  }, []);

  const getRightPanelPage = () => {
    if (location.pathname === '/') return 'dashboard';
    if (location.pathname === '/applications') return 'applications';
    if (location.pathname === '/search') return 'jobSearch';
    if (/^\/applications\/\d+$/.test(location.pathname)) return 'applicationDetail';
    return null;
  };

  const rightPanelPage = getRightPanelPage();

  // Build AI context based on current page
  const getAIContext = () => {
    const appMatch = location.pathname.match(/^\/applications\/(\d+)$/);
    if (appMatch) {
      return { page: 'applicationDetail', applicationId: appMatch[1], step: 'general' };
    }
    if (location.pathname === '/search') {
      return { page: 'jobSearch', step: 'search' };
    }
    return { page: 'general', step: 'general' };
  };

  return (
    <OnboardingGuard>
      <div className="app-layout">
        <Sidebar onReplayTutorial={handleReplayTutorial} />
        <main className="main-content">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        {rightPanelPage && <RightPanel page={rightPanelPage} />}
        <Toast />
        <TutorialOverlay
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
        />
        <FloatingAI context={getAIContext()} />
      </div>
    </OnboardingGuard>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <ProfileProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth routes */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                {/* Onboarding: fullscreen, no sidebar, requires auth */}
                <Route path="/onboarding" element={
                  <RequireAuth><Onboarding /></RequireAuth>
                } />

                {/* All other routes: sidebar + OnboardingGuard + RequireAuth */}
                <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/applications" element={<ApplicationsList />} />
                  <Route path="/applications/new" element={<NewApplication />} />
                  <Route path="/applications/:id" element={<ApplicationDetail />} />
                  <Route path="/search" element={<JobSearch />} />
                  <Route path="/ai" element={<AIAssistant />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                {/* Catch all — redirect to login or home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ProfileProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
