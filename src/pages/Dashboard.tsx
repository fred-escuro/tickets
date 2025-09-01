import { Helpdesk } from '@/components/Helpdesk';
import { Resources } from '@/components/Resources';
import { EmployeeDirectory } from '@/components/EmployeeDirectory';
import { Projects } from '@/components/Projects';
import { Analytics } from '@/components/Analytics';
import { TeamCalendar } from '@/components/TeamCalendar';
import { ApiTest } from '@/components/ApiTest';
import { TicketList } from '@/components/TicketList';
import { type FC } from 'react';

export const Dashboard: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-12">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-8 space-y-4 sm:gap-6">
            {/* Tickets Overview */}
            <Helpdesk />
            
            {/* Ticket List */}
            <TicketList />
            
            {/* Knowledge Base */}
            <Resources />
            
            {/* Analytics Overview */}
            <Analytics />
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-4 sm:gap-6">
              {/* API Connection Test */}
              <ApiTest />
              
              {/* Support Team */}
              <EmployeeDirectory />
              
              {/* Ticket Tasks */}
              <Projects />
              
              {/* Ticket Calendar */}
              <TeamCalendar />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
