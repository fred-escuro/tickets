import { TooltipProvider } from '@/components/ui/tooltip';
import { type FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { ScrollToTop } from './components/ScrollToTop';
import { FloatingHelpButton } from './components/FloatingHelpButton';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { HelpDeskPage } from './pages/HelpDeskPage';
import { EmployeeDirectoryPage } from './pages/EmployeeDirectoryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { CalendarPage } from './pages/CalendarPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import SettingsPage from './pages/SettingsPage';

const AppRoutes: FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Dashboard />
        }
      />
      <Route
        path="/tickets"
        element={
          <HelpDeskPage />
        }
      />
      <Route
        path="/users"
        element={
          <EmployeeDirectoryPage />
        }
      />
      <Route
        path="/tasks"
        element={
          <ProjectsPage />
        }
      />
      <Route
        path="/calendar"
        element={
          <CalendarPage />
        }
      />
      <Route
        path="/reports"
        element={
          <AnalyticsPage />
        }
      />
      <Route
        path="/knowledge-base"
        element={
          <ResourcesPage />
        }
      />
      <Route
        path="/settings"
        element={
          <SettingsPage />
        }
      />
    </Routes>
  );
};

const App: FC = () => {
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
