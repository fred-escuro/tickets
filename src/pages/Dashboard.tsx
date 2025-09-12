import { Helpdesk } from '@/components/Helpdesk';
import { Resources } from '@/components/Resources';
import { EmployeeDirectory } from '@/components/EmployeeDirectory';
import { Projects } from '@/components/Projects';
import { Analytics } from '@/components/Analytics';
import { TeamCalendar } from '@/components/TeamCalendar';
import { ApiTest } from '@/components/ApiTest';
import { DepartmentDashboard } from '@/components/DepartmentDashboard';
// TicketList removed from Dashboard
import { type FC } from 'react';

export const Dashboard: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-0 mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 lg:pl-[calc(var(--sidebar-width,14rem)+1.5rem)]">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tickets Overview */}
            <div className="animate-in fade-in slide-in-from-left-4 duration-700">
              <Helpdesk showStatusChange={false} />
            </div>
            
            {/* Analytics Overview */}
            <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
              <Analytics />
            </div>

            {/* Knowledge Base */}
            <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-400">
              <Resources />
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-4">
            <div className="space-y-6">
              {/* Ticket Calendar */}
              <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-100">
                <TeamCalendar />
              </div>
              
              {/* Ticket Tasks */}
              <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
                <Projects />
              </div>
              
              {/* Department Overview */}
              <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-500">
                <DepartmentDashboard />
              </div>
              
              {/* Support Team */}
              <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-600">
                <EmployeeDirectory />
              </div>
              
              {/* API Connection Test */}
              <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-700">
                <ApiTest />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
