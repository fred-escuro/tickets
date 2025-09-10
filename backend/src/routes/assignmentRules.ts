import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, authorizePermission } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = Router();

// Get assignment rules for a category
router.get('/category/:categoryId', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        autoAssignRules: true
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    return res.json({
      success: true,
      data: {
        categoryId: category.id,
        categoryName: category.name,
        rules: category.autoAssignRules || []
      }
    });
  } catch (error) {
    console.error('Get assignment rules error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get assignment rules'
    });
  }
});

// Update assignment rules for a category
router.put('/category/:categoryId', authenticate, authorizePermission('tickets:write'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        error: 'Rules must be an array'
      });
    }

    // Validate rules structure
    for (const rule of rules) {
      if (!rule.assignmentType) {
        return res.status(400).json({
          success: false,
          error: 'Each rule must have an assignmentType'
        });
      }

      if (!['department', 'agent', 'round_robin', 'workload_balance'].includes(rule.assignmentType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid assignmentType. Must be: department, agent, round_robin, or workload_balance'
        });
      }

      if (rule.assignmentType === 'department' && !rule.targetDepartmentId) {
        return res.status(400).json({
          success: false,
          error: 'Department assignment requires targetDepartmentId'
        });
      }

      if (rule.assignmentType === 'agent' && !rule.targetAgentId) {
        return res.status(400).json({
          success: false,
          error: 'Agent assignment requires targetAgentId'
        });
      }
    }

    const category = await prisma.ticketCategory.update({
      where: { id: categoryId },
      data: {
        autoAssignRules: rules
      },
      select: {
        id: true,
        name: true,
        autoAssignRules: true
      }
    });

    return res.json({
      success: true,
      data: {
        categoryId: category.id,
        categoryName: category.name,
        rules: category.autoAssignRules
      },
      message: 'Assignment rules updated successfully'
    });
  } catch (error) {
    console.error('Update assignment rules error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update assignment rules'
    });
  }
});

// Get all categories with their assignment rules
router.get('/categories', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const categories = await prisma.ticketCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        autoAssignRules: true
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      data: categories.map(cat => ({
        categoryId: cat.id,
        categoryName: cat.name,
        description: cat.description,
        rules: cat.autoAssignRules || []
      }))
    });
  } catch (error) {
    console.error('Get categories with rules error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get categories with assignment rules'
    });
  }
});

// Get available departments for assignment
router.get('/departments', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        autoAssignEnabled: true,
        assignmentStrategy: true,
        maxTicketsPerAgent: true,
        users: {
          where: { isAgent: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isAvailable: true,
            maxConcurrentTickets: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get departments'
    });
  }
});

// Get available agents for assignment
router.get('/agents', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { departmentId } = req.query;

    const where: any = {
      isAgent: true
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const agents = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        departmentId: true,
        isAvailable: true,
        maxConcurrentTickets: true,
        assignmentPriority: true,
        lastAssignmentAt: true,
        skills: true,
        departmentEntity: {
          select: {
            id: true,
            name: true
          }
        },
        assignedTickets: {
          where: {
            status: {
              name: { notIn: ['RESOLVED', 'CLOSED'] }
            }
          },
          select: { id: true }
        }
      },
      orderBy: [
        { isAvailable: 'desc' },
        { assignmentPriority: 'desc' },
        { lastAssignmentAt: 'asc' }
      ]
    });

    return res.json({
      success: true,
      data: agents.map(agent => ({
        ...agent,
        currentTicketCount: agent.assignedTickets.length,
        isOverloaded: agent.assignedTickets.length >= agent.maxConcurrentTickets
      }))
    });
  } catch (error) {
    console.error('Get agents error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get agents'
    });
  }
});

// Test assignment rules
router.post('/test', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { categoryId, priority, tags, customFields } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Category ID is required for testing'
      });
    }

    // Get category and its rules
    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        autoAssignRules: true
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Create a mock ticket for testing
    const mockTicket = {
      id: 'test-ticket',
      categoryId: category.id,
      priority: { name: priority || 'MEDIUM' },
      tags: tags || [],
      customFields: customFields || {},
      submitter: { departmentId: null }
    };

    // Import and use the auto-assignment service
    const { AutoAssignmentService } = await import('../services/autoAssignmentService');
    
    // Test the assignment logic
    const assignmentResult = await AutoAssignmentService.assignTicket(mockTicket.id);

    return res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          name: category.name,
          rules: category.autoAssignRules || []
        },
        testTicket: mockTicket,
        assignmentResult
      }
    });
  } catch (error) {
    console.error('Test assignment rules error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to test assignment rules'
    });
  }
});

export default router;
