import { TooltipProvider } from '@/components/ui/tooltip';
import { type FC, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { ScrollToTop } from './components/ScrollToTop';
import { FloatingHelpButton } from './components/FloatingHelpButton';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { HelpDeskPage } from './pages/HelpDeskPage';
import { setupTokenRefresh } from './lib/services/authService';

import { ProjectsPage } from './pages/ProjectsPage';
import { CalendarPage } from './pages/CalendarPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import SettingsPage from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { TicketDetailPage } from './pages/TicketDetailPage';

const AppRoutes: FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute
            pageTitle="Welcome to Dashboard"
            pageDescription="Please log in to access your dashboard and view analytics."
            requireAnyPermissionKeys={["tickets:read"]}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute pageTitle="Welcome to TicketHub" pageDescription="Please log in to access the help desk and support system.">
            <HelpDeskPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <ProtectedRoute pageTitle="Ticket Detail" pageDescription="View and update ticket details.">
            <TicketDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute pageTitle="User Management" pageDescription="Please log in to manage users and view the employee directory.">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/directory"
        element={
          <ProtectedRoute pageTitle="Employee Directory" pageDescription="Please log in to view the employee directory and team information.">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute pageTitle="Project Management" pageDescription="Please log in to manage projects and track tasks.">
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute pageTitle="Team Calendar" pageDescription="Please log in to view and manage team schedules.">
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute
            pageTitle="Analytics & Reports"
            pageDescription="Please log in to view analytics and generate reports."
            requireAnyRoleNames={["admin","manager"]}
          >
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge-base"
        element={
          <ProtectedRoute pageTitle="Knowledge Base" pageDescription="Please log in to access the knowledge base and resources.">
            <ResourcesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute
            pageTitle="Settings"
            pageDescription="Please log in to access your account settings and preferences."
            requireAnyRoleNames={["admin","manager"]}
          >
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute pageTitle="Profile" pageDescription="Please log in to view and edit your profile.">
            <ProfilePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: FC = () => {
  useEffect(() => {
    // Initialize token refresh system when app starts
    setupTokenRefresh();
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="nexus-ui-theme">
      <TooltipProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Header />
            <AppRoutes />
            <FloatingHelpButton />
            <Toaster />
          </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
