import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProfileProvider } from './context/ProfileContext';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import Toast from './components/common/Toast';
import PageTransition from './components/common/PageTransition';
import OnboardingGuard from './components/common/OnboardingGuard';
import Dashboard from './pages/Dashboard';
import ApplicationsList from './pages/ApplicationsList';
import NewApplication from './pages/NewApplication';
import ApplicationDetail from './pages/ApplicationDetail';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import JobSearch from './pages/JobSearch';
import Onboarding from './pages/Onboarding';

function AppLayout() {
  const location = useLocation();

  const getRightPanelPage = () => {
    if (location.pathname === '/') return 'dashboard';
    if (location.pathname === '/applications') return 'applications';
    if (location.pathname === '/search') return 'jobSearch';
    if (/^\/applications\/\d+$/.test(location.pathname)) return 'applicationDetail';
    return null;
  };

  const rightPanelPage = getRightPanelPage();

  return (
    <OnboardingGuard>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        {rightPanelPage && <RightPanel page={rightPanelPage} />}
        <Toast />
      </div>
    </OnboardingGuard>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <ProfileProvider>
          <BrowserRouter>
            <Routes>
              {/* Onboarding: fullscreen, no sidebar */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* All other routes: sidebar + OnboardingGuard */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/applications" element={<ApplicationsList />} />
                <Route path="/applications/new" element={<NewApplication />} />
                <Route path="/applications/:id" element={<ApplicationDetail />} />
                <Route path="/search" element={<JobSearch />} />
                <Route path="/ai" element={<AIAssistant />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ProfileProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
