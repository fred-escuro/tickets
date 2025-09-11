import { Router } from 'express';
import { authenticate, authorizePermission } from '../middleware/auth';
import { autoResponseService } from '../services/autoResponseService';
import { 
  CreateAutoResponseTemplateRequest,
  UpdateAutoResponseTemplateRequest,
  AutoResponseTemplateFilters,
  AutoResponseFilters,
  EmailFollowupFilters
} from '../types/autoResponse';

const router = Router();

// Template Management Routes
router.get('/templates', authenticate, authorizePermission('settings:read'), async (req, res) => {
  try {
    const filters: AutoResponseTemplateFilters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      search: req.query.search as string,
      departmentId: req.query.departmentId as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      sortBy: req.query.sortBy as any || 'createdAt',
      sortOrder: req.query.sortOrder as any || 'desc',
    };

    const result = await autoResponseService.getTemplates(filters);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching auto-response templates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch templates',
    });
  }
});

router.get('/templates/:id', authenticate, authorizePermission('settings:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const template = await autoResponseService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    return res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error fetching auto-response template:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch template',
    });
  }
});

router.post('/templates', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const data: CreateAutoResponseTemplateRequest = req.body;
    const userId = (req as any).user?.id;

    const template = await autoResponseService.createTemplate(data, userId);
    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error creating auto-response template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create template',
    });
  }
});

router.put('/templates/:id', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateAutoResponseTemplateRequest = req.body;

    const template = await autoResponseService.updateTemplate(id, data);
    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error updating auto-response template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update template',
    });
  }
});

router.delete('/templates/:id', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { id } = req.params;
    await autoResponseService.deleteTemplate(id);
    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting auto-response template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete template',
    });
  }
});

// Auto-Response Management Routes
router.get('/responses', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const filters: AutoResponseFilters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      ticketId: req.query.ticketId as string,
      templateId: req.query.templateId as string,
      status: req.query.status as any,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      sortBy: req.query.sortBy as any || 'sentAt',
      sortOrder: req.query.sortOrder as any || 'desc',
    };

    const result = await autoResponseService.getResponses(filters);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching auto-responses:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch responses',
    });
  }
});

router.get('/responses/by-response-id/:responseId', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { responseId } = req.params;
    const response = await autoResponseService.getResponseByResponseId(responseId);

    if (!response) {
      return res.status(404).json({
        success: false,
        error: 'Response not found',
      });
    }

    return res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Error fetching auto-response by response ID:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch response',
    });
  }
});

// Follow-up Management Routes
router.get('/followups', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const filters: EmailFollowupFilters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      ticketId: req.query.ticketId as string,
      autoResponseId: req.query.autoResponseId as string,
      status: req.query.status as any,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      sortBy: req.query.sortBy as any || 'processedAt',
      sortOrder: req.query.sortOrder as any || 'desc',
    };

    const result = await autoResponseService.getFollowups(filters);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching email followups:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch followups',
    });
  }
});

// Template Testing Route
router.post('/templates/:id/test', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { ticketId } = req.body;

    const template = await autoResponseService.getTemplateById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Get ticket data for testing
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        submitter: true,
        assignee: true,
        assignedToDepartment: true,
        category: true,
        priority: true,
        status: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Generate test variables
    const variables = autoResponseService.generateTemplateVariables(ticket, { from: ticket.submitter.email });
    
    // Render template
    const generated = autoResponseService.renderTemplate(template, variables);

    return res.json({
      success: true,
      data: {
        template,
        variables,
        generated,
      },
    });
  } catch (error: any) {
    console.error('Error testing template:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test template',
    });
  }
});

export default router;
