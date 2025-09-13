import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Ticket, 
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { DepartmentService } from '@/lib/services/departmentService';
import type { Department, DepartmentStats } from '@/lib/services/departmentService';
import { useNavigate } from 'react-router-dom';

export function DepartmentDashboard() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentStats, setDepartmentStats] = useState<Record<string, DepartmentStats>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await DepartmentService.getDepartments();
      if (response.success && response.data) {
        setDepartments(response.data);
        
        // Load stats for each department
        const statsPromises = response.data.map(async (dept) => {
          const statsResponse = await DepartmentService.getDepartmentStats(dept.id);
          if (statsResponse.success && statsResponse.data) {
            return { departmentId: dept.id, stats: statsResponse.data };
          }
          return null;
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<string, DepartmentStats> = {};
        
        statsResults.forEach(result => {
          if (result) {
            statsMap[result.departmentId] = result.stats;
          }
        });

        setDepartmentStats(statsMap);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Department Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 animate-pulse" />
              <span>Loading departments...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Department Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {departments.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No departments found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((department) => {
                const stats = departmentStats[department.id];
                return (
                  <Card key={department.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold">{department.name}</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/departments/${department.id}`)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {department.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {department.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mb-3">
                        <Badge variant={department.autoAssignEnabled ? 'default' : 'secondary'}>
                          {department.autoAssignEnabled ? 'Auto-Assign On' : 'Auto-Assign Off'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {department.users?.length || 0} agents
                        </span>
                      </div>

                      {stats && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Ticket className="h-4 w-4 text-blue-600" />
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-medium">{stats.totalTickets}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <span className="text-muted-foreground">Open:</span>
                            <span className="font-medium">{stats.openTickets}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Resolved:</span>
                            <span className="font-medium">{stats.resolvedTickets}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-purple-600" />
                            <span className="text-muted-foreground">Avg. Time:</span>
                            <span className="font-medium">{stats.averageResolutionTime}h</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
