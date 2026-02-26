import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProfileProvider } from './context/ProfileContext';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/common/AuthGuard';
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
import CareerConsultant from './pages/CareerConsultant';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Register from './pages/Register';

// Page keys that have page-level tutorial tips
const PAGE_TUTORIAL_KEYS = [
  'dashboard', 'applications', 'jobSearch',
  'newApplication', 'profile', 'aiAssistant', 'settings',
];

function AppLayout() {
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

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

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Determine right panel page
  const getRightPanelPage = () => {
    if (location.pathname === '/') return 'dashboard';
    if (location.pathname === '/applications') return 'applications';
    if (location.pathname === '/profile') return 'profile';
    if (location.pathname === '/search') return 'jobSearch';
    return null;
  };

  const rightPanelPage = getRightPanelPage();

  // Determine AI context
  const getAIContext = () => {
    const appMatch = location.pathname.match(/^\/applications\/(\d+)/);
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
      <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar
          onReplayTutorial={handleReplayTutorial}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onToggleAIChat={() => setShowAIChat((prev) => !prev)}
          aiChatOpen={showAIChat}
        />
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
        <FloatingAI
          context={getAIContext()}
          sidebarCollapsed={sidebarCollapsed}
          isOpen={showAIChat}
          onToggle={() => setShowAIChat((prev) => !prev)}
        />
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
                {/* Public auth routes — no auth required */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Onboarding: requires auth but no sidebar */}
                <Route
                  path="/onboarding"
                  element={
                    <AuthGuard>
                      <Onboarding />
                    </AuthGuard>
                  }
                />

                {/* All other routes: auth + sidebar + OnboardingGuard */}
                <Route
                  element={
                    <AuthGuard>
                      <AppLayout />
                    </AuthGuard>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/applications" element={<ApplicationsList />} />
                  <Route path="/applications/new" element={<NewApplication />} />
                  <Route path="/applications/:id" element={<ApplicationDetail />} />
                  <Route path="/search" element={<JobSearch />} />
                  <Route path="/career-consultant" element={<CareerConsultant />} />
                  <Route path="/ai" element={<AIAssistant />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ProfileProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
