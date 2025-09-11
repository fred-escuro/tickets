import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, TestTube, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { AssignmentRulesService } from '@/lib/services/assignmentRulesService';
import type { AssignmentRule, Department, Agent, CategoryWithRules } from '@/lib/services/assignmentRulesService';
import { toast } from 'sonner';

interface AssignmentRulesManagerProps {
  onClose?: () => void;
}

export default function AssignmentRulesManager({ onClose }: AssignmentRulesManagerProps) {
  const [categories, setCategories] = useState<CategoryWithRules[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  // Validate all rules when categories change
  useEffect(() => {
    const errors: Record<string, string[]> = {};
    categories.forEach(category => {
      // Ensure rules is an array before iterating
      const rules = Array.isArray(category.rules) ? category.rules : [];
      rules.forEach((rule, index) => {
        const ruleKey = `${category.categoryId}-${index}`;
        const error = validateRule(rule);
        if (error) {
          errors[ruleKey] = [error];
        }
      });
    });
    setValidationErrors(errors);
  }, [categories]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, departmentsRes, agentsRes] = await Promise.all([
        AssignmentRulesService.getAllCategoriesWithRules(),
        AssignmentRulesService.getDepartments(),
        AssignmentRulesService.getAgents()
      ]);

      if (categoriesRes.success) setCategories(categoriesRes.data || []);
      if (departmentsRes.success) setDepartments(departmentsRes.data || []);
      if (agentsRes.success) setAgents(agentsRes.data || []);

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setSelectedCategory(categoriesRes.data[0].categoryId);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentCategory = () => {
    const category = categories.find(cat => cat.categoryId === selectedCategory);
    if (category && !Array.isArray(category.rules)) {
      category.rules = [];
    }
    return category;
  };

  const addRule = () => {
    const category = getCurrentCategory();
    if (!category) return;

    const newRule: AssignmentRule = {
      categoryId: category.categoryId,
      assignmentType: 'round_robin',
      priority: 1
    };

    const updatedCategories = categories.map(cat => 
      cat.categoryId === selectedCategory 
        ? { ...cat, rules: [...cat.rules, newRule] }
        : cat
    );
    setCategories(updatedCategories);
  };

  const updateRule = (ruleIndex: number, field: keyof AssignmentRule, value: any) => {
    const updatedCategories = categories.map(cat => 
      cat.categoryId === selectedCategory 
        ? {
            ...cat,
            rules: (Array.isArray(cat.rules) ? cat.rules : []).map((rule, index) => 
              index === ruleIndex ? { ...rule, [field]: value } : rule
            )
          }
        : cat
    );
    setCategories(updatedCategories);

    // Validate the updated rule and update validation errors
    const category = updatedCategories.find(cat => cat.categoryId === selectedCategory);
    if (category) {
      const rules = Array.isArray(category.rules) ? category.rules : [];
      const updatedRule = rules[ruleIndex];
      if (updatedRule) {
        const error = validateRule(updatedRule);
        const ruleKey = `${selectedCategory}-${ruleIndex}`;
        
        setValidationErrors(prev => ({
          ...prev,
          [ruleKey]: error ? [error] : []
        }));
      }
    }
  };

  const removeRule = (ruleIndex: number) => {
    const updatedCategories = categories.map(cat => 
      cat.categoryId === selectedCategory 
        ? {
            ...cat,
            rules: (Array.isArray(cat.rules) ? cat.rules : []).filter((_, index) => index !== ruleIndex)
          }
        : cat
    );
    
    setCategories(updatedCategories);
    toast.success('Rule removed successfully');
  };

  const validateRule = (rule: AssignmentRule): string | null => {
    if (rule.assignmentType === 'department' && !rule.targetDepartmentId) {
      return 'Department assignment requires selecting a target department';
    }
    if (rule.assignmentType === 'agent' && !rule.targetAgentId) {
      return 'Agent assignment requires selecting a target agent';
    }
    
    // Check if department has support agents
    if (rule.assignmentType === 'department' && rule.targetDepartmentId) {
      const departmentAgents = agents.filter(agent => agent.departmentId === rule.targetDepartmentId);
      if (departmentAgents.length === 0) {
        const departmentName = departments.find(d => d.id === rule.targetDepartmentId)?.name || 'Unknown Department';
        return `No support agents available in ${departmentName} department`;
      }
    }
    
    // Check if specific agent is available
    if (rule.assignmentType === 'agent' && rule.targetAgentId) {
      const agent = agents.find(a => a.id === rule.targetAgentId);
      if (!agent) {
        return 'Selected agent is not available or does not exist';
      }
      if (!agent.isAvailable) {
        return 'Selected agent is currently not available';
      }
    }
    
    return null;
  };

  const validateAllRules = (rules: AssignmentRule[]): string[] => {
    const errors: string[] = [];
    rules.forEach((rule, index) => {
      const error = validateRule(rule);
      if (error) {
        errors.push(`Rule ${index + 1}: ${error}`);
      }
    });
    return errors;
  };

  const saveRules = async () => {
    const category = getCurrentCategory();
    if (!category) return;

    // Validate all rules before saving
    const rules = Array.isArray(category.rules) ? category.rules : [];
    const validationErrors = validateAllRules(rules);
    if (validationErrors.length > 0) {
      toast.error(`Validation failed: ${validationErrors.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      const result = await AssignmentRulesService.updateCategoryRules(
        category.categoryId,
        category.rules
      );

      if (result.success) {
        toast.success('Assignment rules saved successfully');
        // Update the categories with the saved data
        const updatedCategories = categories.map(cat => 
          cat.categoryId === selectedCategory 
            ? { ...cat, rules: result.data?.rules || cat.rules }
            : cat
        );
        setCategories(updatedCategories);
      } else {
        toast.error(result.error || 'Failed to save rules');
      }
    } catch (error) {
      toast.error('Failed to save assignment rules');
    } finally {
      setSaving(false);
    }
  };

  const testRules = async () => {
    const category = getCurrentCategory();
    if (!category) return;

    // Validate rules before testing
    const rules = Array.isArray(category.rules) ? category.rules : [];
    const validationErrors = validateAllRules(rules);
    if (validationErrors.length > 0) {
      toast.error(`Cannot test rules with validation errors: ${validationErrors.join(', ')}`);
      return;
    }

    setTesting(true);
    try {
      const result = await AssignmentRulesService.testAssignmentRules({
        categoryId: category.categoryId,
        priority: 'HIGH',
        tags: ['urgent']
      });

      setTestResult(result);
      if (result.success) {
        toast.success('Test completed successfully');
      } else {
        toast.error(result.error || 'Test failed');
      }
    } catch (error) {
      toast.error('Failed to test assignment rules');
    } finally {
      setTesting(false);
    }
  };

  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown Department';
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown Agent';
  };

  const getDepartmentAgentCount = (departmentId: string) => {
    return agents.filter(agent => agent.departmentId === departmentId).length;
  };

  const getAssignmentTypeLabel = (type: string) => {
    const labels = {
      department: 'Department',
      agent: 'Specific Agent',
      round_robin: 'Round Robin',
      workload_balance: 'Workload Balance'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading assignment rules...</p>
        </div>
      </div>
    );
  }

  const currentCategory = getCurrentCategory();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Assignment Rules Manager</h2>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Assignment Rules</TabsTrigger>
          <TabsTrigger value="test">Test Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Select Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.categoryId} value={category.categoryId}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {currentCategory && (
                  <p className="text-sm text-gray-600">
                    {currentCategory.description || 'No description available'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {currentCategory && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Assignment Rules for {currentCategory.categoryName}</CardTitle>
                  <div className="space-x-2">
                    <Button onClick={addRule} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                    <Button onClick={saveRules} disabled={saving} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Rules'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(Array.isArray(currentCategory.rules) ? currentCategory.rules : []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No assignment rules configured for this category.</p>
                    <p className="text-sm">Click "Add Rule" to create your first rule.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(Array.isArray(currentCategory.rules) ? currentCategory.rules : []).map((rule, index) => {
                      const ruleKey = `${selectedCategory}-${index}`;
                      const ruleErrors = validationErrors[ruleKey] || [];
                      const hasErrors = ruleErrors.length > 0;
                      
                      return (
                        <Card key={`rule-${selectedCategory}-${index}`} className={`border-l-4 ${hasErrors ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                          <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <Label>Assignment Type</Label>
                              <Select
                                value={rule.assignmentType}
                                onValueChange={(value) => {
                                  updateRule(index, 'assignmentType', value);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assignment type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="department">Department</SelectItem>
                                  <SelectItem value="agent">Specific Agent</SelectItem>
                                  <SelectItem value="round_robin">Round Robin</SelectItem>
                                  <SelectItem value="workload_balance">Workload Balance</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {rule.assignmentType === 'department' && (
                              <div>
                                <Label>Target Department</Label>
                                <Select
                                  value={rule.targetDepartmentId || ''}
                                  onValueChange={(value) => updateRule(index, 'targetDepartmentId', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((dept) => {
                                      const departmentAgents = agents.filter(agent => agent.departmentId === dept.id);
                                      const hasAgents = departmentAgents.length > 0;
                                      return (
                                        <SelectItem 
                                          key={dept.id} 
                                          value={dept.id}
                                          disabled={!hasAgents}
                                          className={!hasAgents ? 'text-gray-400' : ''}
                                        >
                                          {dept.name} {!hasAgents ? '(No agents available)' : ''}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                {rule.targetDepartmentId && getDepartmentAgentCount(rule.targetDepartmentId) === 0 && (
                                  <Alert className="mt-2 border-orange-200 bg-orange-50">
                                    <AlertCircle className="h-4 w-4 text-orange-600" />
                                    <AlertDescription className="text-orange-800">
                                      Warning: This department has no support agents available. Tickets assigned to this department will not be automatically assigned.
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            )}

                            {rule.assignmentType === 'agent' && (
                              <div>
                                <Label>Target Agent</Label>
                                <Select
                                  value={rule.targetAgentId || ''}
                                  onValueChange={(value) => updateRule(index, 'targetAgentId', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select agent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {agents.filter(a => a.isAvailable).map((agent) => (
                                      <SelectItem key={agent.id} value={agent.id}>
                                        {agent.firstName} {agent.lastName}
                                        {agent.departmentEntity && ` (${agent.departmentEntity.name})`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div>
                              <Label>Priority</Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={rule.priority || 1}
                                onChange={(e) => updateRule(index, 'priority', parseInt(e.target.value) || 1)}
                              />
                            </div>

                            <div>
                              <Label>Fallback Strategy</Label>
                              <Select
                                value={rule.fallbackTo || 'none'}
                                onValueChange={(value) => updateRule(index, 'fallbackTo', value === 'none' ? undefined : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Fallback</SelectItem>
                                  <SelectItem value="round_robin">Round Robin</SelectItem>
                                  <SelectItem value="workload_balance">Workload Balance</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {getAssignmentTypeLabel(rule.assignmentType)}
                              </Badge>
                              {rule.targetDepartmentId && (
                                <Badge variant="secondary">
                                  {getDepartmentName(rule.targetDepartmentId)}
                                </Badge>
                              )}
                              {rule.targetAgentId && (
                                <Badge variant="secondary">
                                  {getAgentName(rule.targetAgentId)}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeRule(index);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Validation Error Display */}
                          {hasErrors && (
                            <Alert className="mt-4 border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                {ruleErrors.map((error, errorIndex) => (
                                  <div key={errorIndex} className="text-sm">
                                    {error}
                                  </div>
                                ))}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Assignment Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Select Category to Test</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.categoryId} value={category.categoryId}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={testRules} disabled={testing || !selectedCategory}>
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing ? 'Testing...' : 'Test Assignment Rules'}
                </Button>

                {testResult && (
                  <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <div className="flex items-center">
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                      )}
                      <AlertDescription>
                        {testResult.success ? 'Test completed successfully' : 'Test failed'}
                      </AlertDescription>
                    </div>
                    {testResult.data && (
                      <div className="mt-2 text-sm">
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
