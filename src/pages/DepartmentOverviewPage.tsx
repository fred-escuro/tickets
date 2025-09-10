import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Clock
} from 'lucide-react';
import { DepartmentService } from '@/lib/services/departmentService';
import type { Department, DepartmentStats } from '@/lib/services/departmentService';
import { DepartmentTicketsView } from '@/components/DepartmentTicketsView';
import { toast } from 'sonner';

export function DepartmentOverviewPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const [department, setDepartment] = useState<Department | null>(null);
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets'>('overview');

  useEffect(() => {
    if (departmentId) {
      loadDepartmentData();
    }
  }, [departmentId]);

  const loadDepartmentData = async () => {
    if (!departmentId) return;
    
    setLoading(true);
    try {
      const [deptResponse, statsResponse] = await Promise.all([
        DepartmentService.getDepartment(departmentId),
        DepartmentService.getDepartmentStats(departmentId)
      ]);

      if (deptResponse.success && deptResponse.data) {
        setDepartment(deptResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load department data:', error);
      toast.error('Failed to load department data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 animate-pulse" />
          <span>Loading department...</span>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="text-center py-8">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Department not found</p>
        <Button onClick={() => navigate('/departments')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Departments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/departments')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">{department.name}</h1>
              {department.description && (
                <p className="text-muted-foreground">{department.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Overview
        </Button>
        <Button
          variant={activeTab === 'tickets' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('tickets')}
        >
          <Users className="h-4 w-4 mr-2" />
          Tickets
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Key Metrics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tickets</p>
                      <p className="text-3xl font-bold">{stats.totalTickets}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Open Tickets</p>
                      <p className="text-3xl font-bold">{stats.openTickets}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Resolved</p>
                      <p className="text-3xl font-bold">{stats.resolvedTickets}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Resolution</p>
                      <p className="text-3xl font-bold">{stats.averageResolutionTime}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Department Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg">{department.name}</p>
                </div>
                {department.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-lg">{department.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Auto-Assignment</label>
                  <Badge variant={department.autoAssignEnabled ? 'default' : 'secondary'}>
                    {department.autoAssignEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assignment Strategy</label>
                  <p className="text-lg capitalize">{department.assignmentStrategy.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Max Tickets per Agent</label>
                  <p className="text-lg">{department.maxTicketsPerAgent}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tickets by Priority */}
            {stats && Object.keys(stats.ticketsByPriority).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.ticketsByPriority).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{priority}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tickets by Category */}
            {stats && Object.keys(stats.ticketsByCategory).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.ticketsByCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <DepartmentTicketsView 
          departmentId={departmentId!} 
          departmentName={department.name} 
        />
      )}
    </div>
  );
}
