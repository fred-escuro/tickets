import { Helpdesk } from '@/components/Helpdesk';
import { Resources } from '@/components/Resources';
import { EmployeeDirectory } from '@/components/EmployeeDirectory';
import { Projects } from '@/components/Projects';
import { Analytics } from '@/components/Analytics';
import { TeamCalendar } from '@/components/TeamCalendar';
import { ApiTest } from '@/components/ApiTest';
// TicketList removed from Dashboard
import { type FC } from 'react';

export const Dashboard: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-12">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-8 space-y-4 sm:gap-6">
            {/* Tickets Overview */}
            <Helpdesk showStatusChange={false} />
            
            {/* Ticket List removed from Dashboard */}
            
            {/* Analytics Overview */}
            <Analytics />

            {/* Knowledge Base */}
            <Resources />
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-4 sm:gap-6">
              {/* Ticket Calendar */}
              <TeamCalendar />
              
              {/* Ticket Tasks */}
              <Projects />
              
              {/* Support Team */}
              <EmployeeDirectory />
              
              {/* API Connection Test */}
              <ApiTest />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
