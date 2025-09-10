import { prisma } from '../index';

export interface AssignmentRule {
  categoryId: string;
  assignmentType: 'department' | 'agent' | 'round_robin' | 'workload_balance';
  targetDepartmentId?: string;
  targetAgentId?: string;
  fallbackTo?: 'round_robin' | 'workload_balance' | 'none';
  priority?: number;
  conditions?: {
    priority?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
  };
}

export interface AssignmentResult {
  success: boolean;
  assignedTo?: string;
  assignedAt?: Date;
  method?: string;
  reason?: string;
  error?: string;
}

export class AutoAssignmentService {
  /**
   * Attempts to auto-assign a ticket based on category rules
   */
  static async assignTicket(ticketId: string): Promise<AssignmentResult> {
    try {
      // Get ticket with category information
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          category: true,
          priority: true,
          submitter: {
            select: { departmentId: true }
          }
        }
      });

      if (!ticket) {
        return { success: false, error: 'Ticket not found' };
      }

      // Get assignment rules for the category
      const assignmentRules = await this.getAssignmentRules(ticket.categoryId);
      
      if (!assignmentRules || assignmentRules.length === 0) {
        return { 
          success: false, 
          reason: 'No assignment rules configured for this category' 
        };
      }

      // Find the best matching rule
      const bestRule = this.findBestRule(assignmentRules, ticket);
      
      if (!bestRule) {
        return { 
          success: false, 
          reason: 'No matching assignment rule found' 
        };
      }

      // Execute assignment based on rule type
      const assignmentResult = await this.executeAssignment(ticket, bestRule);
      
      if (assignmentResult.success) {
        // Update ticket with assignment
        await prisma.ticket.update({
          where: { id: ticketId },
          data: {
            assignedTo: assignmentResult.assignedTo,
            assignedAt: assignmentResult.assignedAt || new Date()
          }
        });

        // Log assignment history
        await this.logAssignmentHistory(ticketId, assignmentResult.assignedTo!, 'auto_assignment');
      }

      return assignmentResult;

    } catch (error) {
      console.error('Auto-assignment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Gets assignment rules for a category
   */
  private static async getAssignmentRules(categoryId: string): Promise<AssignmentRule[]> {
    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
      select: { autoAssignRules: true }
    });

    if (!category?.autoAssignRules) {
      return [];
    }

    const rules = category.autoAssignRules as any;
    return Array.isArray(rules) ? rules : [rules];
  }

  /**
   * Finds the best matching rule for a ticket
   */
  private static findBestRule(rules: AssignmentRule[], ticket: any): AssignmentRule | null {
    // Sort rules by priority (higher number = higher priority)
    const sortedRules = rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of sortedRules) {
      if (this.ruleMatches(rule, ticket)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Checks if a rule matches the ticket conditions
   */
  private static ruleMatches(rule: AssignmentRule, ticket: any): boolean {
    if (!rule.conditions) {
      return true; // No conditions means always match
    }

    const conditions = rule.conditions;

    // Check priority conditions
    if (conditions.priority && conditions.priority.length > 0) {
      if (!conditions.priority.includes(ticket.priority?.name)) {
        return false;
      }
    }

    // Check tag conditions
    if (conditions.tags && conditions.tags.length > 0) {
      const ticketTags = ticket.tags || [];
      if (!conditions.tags.some((tag: string) => ticketTags.includes(tag))) {
        return false;
      }
    }

    // Check custom field conditions
    if (conditions.customFields) {
      const ticketCustomFields = ticket.customFields || {};
      for (const [key, value] of Object.entries(conditions.customFields)) {
        if (ticketCustomFields[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Executes the assignment based on rule type
   */
  private static async executeAssignment(ticket: any, rule: AssignmentRule): Promise<AssignmentResult> {
    switch (rule.assignmentType) {
      case 'department':
        return await this.assignToDepartment(ticket, rule);
      
      case 'agent':
        return await this.assignToSpecificAgent(ticket, rule);
      
      case 'round_robin':
        return await this.assignRoundRobin(ticket, rule);
      
      case 'workload_balance':
        return await this.assignByWorkload(ticket, rule);
      
      default:
        return { success: false, error: 'Unknown assignment type' };
    }
  }

  /**
   * Assigns ticket to a department using round-robin
   */
  private static async assignToDepartment(ticket: any, rule: AssignmentRule): Promise<AssignmentResult> {
    if (!rule.targetDepartmentId) {
      return { success: false, error: 'No target department specified' };
    }

    // Get available agents in the target department
    const availableAgents = await this.getAvailableAgents(rule.targetDepartmentId);
    
    if (availableAgents.length === 0) {
      // Try fallback strategy
      if (rule.fallbackTo) {
        return await this.executeFallback(ticket, rule.fallbackTo, rule.targetDepartmentId);
      }
      return { success: false, reason: 'No available agents in target department' };
    }

    // Use round-robin to select agent
    const selectedAgent = this.selectAgentRoundRobin(availableAgents);
    
    return {
      success: true,
      assignedTo: selectedAgent.id,
      assignedAt: new Date(),
      method: 'department_round_robin'
    };
  }

  /**
   * Assigns ticket to a specific agent
   */
  private static async assignToSpecificAgent(ticket: any, rule: AssignmentRule): Promise<AssignmentResult> {
    if (!rule.targetAgentId) {
      return { success: false, error: 'No target agent specified' };
    }

    // Check if agent is available
    const agent = await prisma.user.findUnique({
      where: { id: rule.targetAgentId },
      select: {
        id: true,
        isAgent: true,
        isAvailable: true,
        maxConcurrentTickets: true,
        assignedTickets: {
          where: {
            status: {
              name: { notIn: ['RESOLVED', 'CLOSED'] }
            }
          }
        }
      }
    });

    if (!agent || !agent.isAgent || !agent.isAvailable) {
      return { success: false, reason: 'Target agent is not available' };
    }

    if (agent.assignedTickets.length >= agent.maxConcurrentTickets) {
      return { success: false, reason: 'Target agent has reached maximum ticket limit' };
    }

    return {
      success: true,
      assignedTo: agent.id,
      assignedAt: new Date(),
      method: 'specific_agent'
    };
  }

  /**
   * Assigns ticket using round-robin strategy
   */
  private static async assignRoundRobin(ticket: any, rule: AssignmentRule): Promise<AssignmentResult> {
    const departmentId = rule.targetDepartmentId || ticket.submitter?.departmentId;
    
    if (!departmentId) {
      return { success: false, error: 'No department context for round-robin assignment' };
    }

    const availableAgents = await this.getAvailableAgents(departmentId);
    
    if (availableAgents.length === 0) {
      return { success: false, reason: 'No available agents for round-robin assignment' };
    }

    const selectedAgent = this.selectAgentRoundRobin(availableAgents);
    
    return {
      success: true,
      assignedTo: selectedAgent.id,
      assignedAt: new Date(),
      method: 'round_robin'
    };
  }

  /**
   * Assigns ticket based on workload balance
   */
  private static async assignByWorkload(ticket: any, rule: AssignmentRule): Promise<AssignmentResult> {
    const departmentId = rule.targetDepartmentId || ticket.submitter?.departmentId;
    
    if (!departmentId) {
      return { success: false, error: 'No department context for workload assignment' };
    }

    const availableAgents = await this.getAvailableAgents(departmentId);
    
    if (availableAgents.length === 0) {
      return { success: false, reason: 'No available agents for workload assignment' };
    }

    const selectedAgent = this.selectAgentByWorkload(availableAgents);
    
    return {
      success: true,
      assignedTo: selectedAgent.id,
      assignedAt: new Date(),
      method: 'workload_balance'
    };
  }

  /**
   * Gets available agents in a department
   */
  private static async getAvailableAgents(departmentId: string) {
    return await prisma.user.findMany({
      where: {
        departmentId,
        isAgent: true,
        isAvailable: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        maxConcurrentTickets: true,
        lastAssignmentAt: true,
        assignedTickets: {
          where: {
            status: {
              name: { notIn: ['RESOLVED', 'CLOSED'] }
            }
          }
        }
      },
      orderBy: {
        lastAssignmentAt: 'asc'
      }
    });
  }

  /**
   * Selects agent using round-robin (based on last assignment time)
   */
  private static selectAgentRoundRobin(agents: any[]): any {
    // Sort by last assignment time (ascending) to implement round-robin
    const sortedAgents = agents.sort((a, b) => {
      const aTime = a.lastAssignmentAt?.getTime() || 0;
      const bTime = b.lastAssignmentAt?.getTime() || 0;
      return aTime - bTime;
    });

    return sortedAgents[0];
  }

  /**
   * Selects agent with lowest workload
   */
  private static selectAgentByWorkload(agents: any[]): any {
    return agents.reduce((lowest, current) => {
      const currentLoad = current.assignedTickets.length;
      const lowestLoad = lowest.assignedTickets.length;
      
      if (currentLoad < lowestLoad) {
        return current;
      }
      
      // If workload is equal, prefer agent with higher assignment priority
      if (currentLoad === lowestLoad && current.assignmentPriority > lowest.assignmentPriority) {
        return current;
      }
      
      return lowest;
    });
  }

  /**
   * Executes fallback assignment strategy
   */
  private static async executeFallback(ticket: any, fallbackType: string, departmentId: string): Promise<AssignmentResult> {
    const rule: AssignmentRule = {
      categoryId: ticket.categoryId,
      assignmentType: fallbackType as any,
      targetDepartmentId: departmentId
    };

    return await this.executeAssignment(ticket, rule);
  }

  /**
   * Logs assignment history
   */
  private static async logAssignmentHistory(ticketId: string, assignedTo: string, method: string) {
    try {
      // Get the current status and IN_PROGRESS status IDs
      const [currentStatus, inProgressStatus] = await Promise.all([
        prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { statusId: true }
        }),
        prisma.ticketStatus.findFirst({
          where: { name: 'IN_PROGRESS' },
          select: { id: true }
        })
      ]);

      if (currentStatus && inProgressStatus) {
        await prisma.ticketStatusHistory.create({
          data: {
            ticketId,
            previousStatusId: currentStatus.statusId,
            statusId: inProgressStatus.id,
            changedBy: assignedTo,
            reason: `Auto-assigned via ${method}`
          }
        });
      }
    } catch (error) {
      console.error('Failed to log assignment history:', error);
    }
  }

  /**
   * Updates agent's last assignment time
   */
  static async updateAgentAssignmentTime(agentId: string) {
    await prisma.user.update({
      where: { id: agentId },
      data: { lastAssignmentAt: new Date() }
    });
  }
}
