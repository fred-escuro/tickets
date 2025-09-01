import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supportUsers } from '@/data/mockData';
import { ArrowRight, Users, Mail, Phone } from 'lucide-react';
import { useWaveAnimation } from '@/hooks/useWaveAnimation';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const EmployeeDirectory: FC = () => {
  const { containerRef, getItemStyle, getItemClassName } = useWaveAnimation();
  
  const agents = supportUsers.filter(user => user.isAgent).slice(0, 3);
  const totalAgents = supportUsers.filter(user => user.isAgent).length;

  const getDepartmentBadgeColor = (department: string) => {
    switch (department) {
      case 'IT Support':
        return 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-300 dark:bg-blue-100 dark:text-blue-800';
      case 'Hardware Support':
        return 'border-green-600 bg-green-50 text-green-700 dark:border-green-300 dark:bg-green-100 dark:text-green-800';
      case 'Software Support':
        return 'border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-300 dark:bg-purple-100 dark:text-purple-800';
      case 'Network Support':
        return 'border-orange-600 bg-orange-50 text-orange-700 dark:border-orange-300 dark:bg-orange-100 dark:text-orange-800';
      default:
        return 'border-muted-foreground/20 bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Support Team</CardTitle>
        <Link to="/users">
          <Button variant="ghost" size="sm" className="gap-2 h-8">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent ref={containerRef} className="space-y-4">
        {/* Team Stats */}
        <div 
          className={getItemClassName("grid grid-cols-2 gap-3")}
          style={getItemStyle(0)}
        >
          <div className="space-y-1 p-4 rounded-lg bg-muted/30 border text-center">
            <p className="text-lg font-bold text-primary">{totalAgents}</p>
            <p className="text-xs text-muted-foreground">Support Agents</p>
          </div>
          <div className="space-y-1 p-4 rounded-lg bg-muted/30 border text-center">
            <p className="text-lg font-bold text-green-600">{supportUsers.filter(u => !u.isAgent).length}</p>
            <p className="text-xs text-muted-foreground">Customers</p>
          </div>
        </div>

        {/* Team Members */}
        <div 
          className={getItemClassName("space-y-3")}
          style={getItemStyle(1)}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Recent Agents</h4>
          </div>
          
          {agents.length > 0 ? (
            <div className="space-y-2">
              {agents.map((agent, index) => (
                <div 
                  key={agent.id} 
                  className={getItemClassName("p-2 rounded-lg bg-muted/30 space-y-2")}
                  style={getItemStyle(2 + index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                    </div>
                    <Badge className={`${getDepartmentBadgeColor(agent.department)} text-xs px-1.5 py-0.5`}>
                      {agent.department}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {agent.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{agent.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className={getItemClassName("text-center py-4")}
              style={getItemStyle(2)}
            >
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No support agents</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div 
          className={getItemClassName("pt-3 border-t")}
          style={getItemStyle(5)}
        >
          <Link to="/users" className="block">
            <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-8">
              <Users className="h-3 w-3" />
              <span className="text-xs">View All Users</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
