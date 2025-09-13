import { TooltipProvider } from '@/components/ui/tooltip';
import { type FC, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { ScrollToTop } from './components/ScrollToTop';
import { FloatingHelpButton } from './components/FloatingHelpButton';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SessionManager } from './components/SessionManager';
import { Dashboard } from './pages/Dashboard';
import { HelpDeskPage } from './pages/HelpDeskPage';
import { setupTokenRefresh, AuthService } from './lib/services/authService';

import { TaskPage } from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import SettingsPage from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { DepartmentOverviewPage } from './pages/DepartmentOverviewPage';
import EmailLogsPage from './pages/EmailLogsPage';
import AutoResponsePage from './pages/AutoResponsePage';
import FollowupsPage from './pages/FollowupsPage';
import FollowupSettingsPage from './pages/FollowupSettingsPage';

const AppRoutes: FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute
            pageTitle="Welcome to Dashboard"
            requireAnyPermissionKeys={["tickets:read"]}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute pageTitle="Welcome to TicketHub" >
            <HelpDeskPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <ProtectedRoute pageTitle="Ticket Detail">
            <TicketDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute pageTitle="User Management">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/directory"
        element={
          <ProtectedRoute pageTitle="Employee Directory">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute pageTitle="Tasks">
            <TaskPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:taskId"
        element={
          <ProtectedRoute pageTitle="Task Details">
            <TaskDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute pageTitle="Team Calendar">
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute
            pageTitle="Analytics & Reports"
            requireAnyRoleNames={["admin","manager"]}
          >
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge-base"
        element={
          <ProtectedRoute pageTitle="Knowledge Base">
            <ResourcesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute
            pageTitle="Settings"
            requireAnyRoleNames={["admin","manager"]}
          >
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/auto-response"
        element={
          <ProtectedRoute
            pageTitle="Auto-Response Templates"
            requireAnyRoleNames={["admin","manager"]}
          >
            <AutoResponsePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/followups"
        element={
          <ProtectedRoute
            pageTitle="Follow-up Management"
            requireAnyRoleNames={["admin","manager"]}
          >
            <FollowupsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/followup-settings"
        element={
          <ProtectedRoute
            pageTitle="Follow-up Settings"
            requireAnyRoleNames={["admin","manager"]}
          >
            <FollowupSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute pageTitle="Profile">
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments/:departmentId"
        element={
          <ProtectedRoute pageTitle="Department Overview">
            <DepartmentOverviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/email-logs"
        element={
          <ProtectedRoute 
            pageTitle="Email Logs" 
            requireAnyPermissionKeys={["tickets:read"]}
          >
            <EmailLogsPage />
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
    
    // Initialize session management if user is already logged in
    const token = AuthService.getAuthToken();
    if (token) {
      AuthService.initializeSession();
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="nexus-ui-theme">
      <TooltipProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Header />
            <AppRoutes />
            <FloatingHelpButton />
            <SessionManager />
            <Toaster />
          </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
