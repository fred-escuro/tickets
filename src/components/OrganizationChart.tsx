import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supportUsers } from '@/data/mockData';
import { Users, Building2 } from 'lucide-react';
import { useWaveAnimation } from '@/hooks/useWaveAnimation';
import { type FC } from 'react';

export const OrganizationChart: FC = () => {
  const { containerRef, getItemStyle, getItemClassName } = useWaveAnimation();
  
  const agents = supportUsers.filter(user => user.isAgent);
  const departments = [...new Set(agents.map(agent => agent.department))];

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
        <CardTitle className="text-lg font-semibold">Support Team Organization</CardTitle>
        <Users className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent ref={containerRef} className="space-y-4">
        {/* Department Overview */}
        <div 
          className={getItemClassName("space-y-3")}
          style={getItemStyle(0)}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Departments</h4>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {departments.map((department, index) => {
              const departmentAgents = agents.filter(agent => agent.department === department);
              return (
                <div 
                  key={department}
                  className={getItemClassName("p-3 rounded-lg border bg-muted/30")}
                  style={getItemStyle(1 + index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getDepartmentBadgeColor(department)} text-xs`}>
                        {department}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {departmentAgents.length} agents
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    {departmentAgents.slice(0, 3).map((agent) => (
                      <div key={agent.id} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="truncate">{agent.middleName ? `${agent.firstName} ${agent.middleName} ${agent.lastName}` : `${agent.firstName} ${agent.lastName}`}</span>
                        <span className="text-muted-foreground">({agent.role})</span>
                      </div>
                    ))}
                    {departmentAgents.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-4">
                        +{departmentAgents.length - 3} more agents
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Stats */}
        <div 
          className={getItemClassName("pt-3 border-t")}
          style={getItemStyle(5)}
        >
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="space-y-1">
              <p className="text-lg font-bold text-primary">{agents.length}</p>
              <p className="text-xs text-muted-foreground">Total Agents</p>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-green-600">{departments.length}</p>
              <p className="text-xs text-muted-foreground">Departments</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
