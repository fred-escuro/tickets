import { PrismaClient } from '@prisma/client';
import { 
  AutoResponseTemplate, 
  AutoResponse, 
  EmailFollowup,
  CreateAutoResponseTemplateRequest,
  UpdateAutoResponseTemplateRequest,
  AutoResponseTemplateFilters,
  AutoResponseFilters,
  EmailFollowupFilters,
  TemplateVariables,
  GeneratedAutoResponse,
  AutoResponseStatus,
  FollowupStatus
} from '../types/autoResponse';

const prisma = new PrismaClient();

export class AutoResponseService {
  // Template Management
  async createTemplate(data: CreateAutoResponseTemplateRequest, createdBy?: string): Promise<AutoResponseTemplate> {
    const template = await prisma.autoResponseTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        subjectTemplate: data.subjectTemplate,
        bodyTemplate: data.bodyTemplate,
        triggerConditions: data.triggerConditions as any,
        departmentId: data.departmentId || undefined,
        isActive: data.isActive ?? true,
        createdBy,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return template as AutoResponseTemplate;
  }

  async getTemplates(filters: AutoResponseTemplateFilters = {}): Promise<{
    templates: AutoResponseTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 25,
      search,
      departmentId,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [templates, total] = await Promise.all([
      prisma.autoResponseTemplate.findMany({
        where,
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.autoResponseTemplate.count({ where }),
    ]);

    return {
      templates: templates as AutoResponseTemplate[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTemplateById(id: string): Promise<AutoResponseTemplate | null> {
    const template = await prisma.autoResponseTemplate.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return template as AutoResponseTemplate | null;
  }

  async updateTemplate(id: string, data: UpdateAutoResponseTemplateRequest): Promise<AutoResponseTemplate> {
    const template = await prisma.autoResponseTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        subjectTemplate: data.subjectTemplate,
        bodyTemplate: data.bodyTemplate,
        triggerConditions: data.triggerConditions as any,
        departmentId: data.departmentId || undefined,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return template as AutoResponseTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    await prisma.autoResponseTemplate.delete({
      where: { id },
    });
  }

  // Auto-Response Management
  async createResponse(data: {
    ticketId: string;
    templateId: string;
    responseId: string;
    toEmail: string;
    subject: string;
    body: string;
    threadId?: string;
    status?: AutoResponseStatus;
  }): Promise<AutoResponse> {
    const response = await prisma.autoResponse.create({
      data: {
        ...data,
        status: data.status || AutoResponseStatus.SENT,
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return response as AutoResponse;
  }

  async getResponses(filters: AutoResponseFilters = {}): Promise<{
    responses: AutoResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 25,
      ticketId,
      templateId,
      status,
      fromDate,
      toDate,
      sortBy = 'sentAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (ticketId) {
      where.ticketId = ticketId;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      where.sentAt = {};
      if (fromDate) {
        where.sentAt.gte = fromDate;
      }
      if (toDate) {
        where.sentAt.lte = toDate;
      }
    }

    const [responses, total] = await Promise.all([
      prisma.autoResponse.findMany({
        where,
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.autoResponse.count({ where }),
    ]);

    return {
      responses: responses as AutoResponse[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getResponseByResponseId(responseId: string): Promise<AutoResponse | null> {
    const response = await prisma.autoResponse.findUnique({
      where: { responseId },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return response as AutoResponse | null;
  }

  // Follow-up Management
  async createFollowup(data: {
    autoResponseId: string;
    ticketId: string;
    originalEmailId?: string;
    followupEmailId?: string;
    content: string;
    status?: FollowupStatus;
  }): Promise<EmailFollowup> {
    const followup = await prisma.emailFollowup.create({
      data: {
        ...data,
        status: data.status || FollowupStatus.PROCESSED,
      },
      include: {
        autoResponse: true,
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
          },
        },
      },
    });

    return followup as EmailFollowup;
  }

  async getFollowups(filters: EmailFollowupFilters = {}): Promise<{
    followups: EmailFollowup[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 25,
      ticketId,
      autoResponseId,
      status,
      fromDate,
      toDate,
      sortBy = 'processedAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (ticketId) {
      where.ticketId = ticketId;
    }

    if (autoResponseId) {
      where.autoResponseId = autoResponseId;
    }

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      where.processedAt = {};
      if (fromDate) {
        where.processedAt.gte = fromDate;
      }
      if (toDate) {
        where.processedAt.lte = toDate;
      }
    }

    const [followups, total] = await Promise.all([
      prisma.emailFollowup.findMany({
        where,
        include: {
          autoResponse: true,
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.emailFollowup.count({ where }),
    ]);

    return {
      followups: followups as EmailFollowup[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Template Selection Logic
  async selectTemplateForTicket(ticket: any, email: any): Promise<AutoResponseTemplate | null> {
    console.log(`Selecting template for ticket ${ticket.ticketNumber}, department: ${ticket.assignedToDepartmentId}`);
    
    // Get all active templates
    const templates = await prisma.autoResponseTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { departmentId: ticket.assignedToDepartmentId },
          { departmentId: null }, // Global templates
        ],
      },
      include: {
        department: true,
      },
    });

    console.log(`Found ${templates.length} templates:`, templates.map(t => `${t.name} (${t.department?.name || 'Global'})`));

    // Find the best matching template based on trigger conditions
    for (const template of templates) {
      if (this.matchesTriggerConditions(template, ticket, email)) {
        return template as AutoResponseTemplate;
      }
    }

    return null;
  }

  private matchesTriggerConditions(template: any, ticket: any, email: any): boolean {
    const conditions = template.triggerConditions;
    console.log(`Checking template ${template.name} conditions:`, conditions);
    console.log(`Ticket: category=${ticket.categoryId}, priority=${ticket.priorityId}, status=${ticket.statusId}, source=${ticket.source}`);
    
    if (!conditions) {
      console.log(`Template ${template.name} has no conditions - matching`);
      return true; // No conditions means always match
    }

    // Check category match
    if (conditions.categories && conditions.categories.length > 0 && !conditions.categories.includes(ticket.categoryId)) {
      return false;
    }

    // Check priority match
    if (conditions.priorities && conditions.priorities.length > 0 && !conditions.priorities.includes(ticket.priorityId)) {
      return false;
    }

    // Check status match
    if (conditions.statuses && conditions.statuses.length > 0 && !conditions.statuses.includes(ticket.statusId)) {
      return false;
    }

    // Check source match
    if (conditions.sources && conditions.sources.length > 0 && !conditions.sources.includes(ticket.source)) {
      return false;
    }

    // Check email domain match
    if (conditions.fromDomains) {
      const emailDomain = email.from?.split('@')[1];
      if (!emailDomain || !conditions.fromDomains.includes(emailDomain)) {
        return false;
      }
    }

    // Check subject keywords
    if (conditions.subjectKeywords && email.subject) {
      const subjectLower = email.subject.toLowerCase();
      const hasKeyword = conditions.subjectKeywords.some((keyword: string) =>
        subjectLower.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    // Check body keywords
    if (conditions.bodyKeywords && email.body) {
      const bodyLower = email.body.toLowerCase();
      const hasKeyword = conditions.bodyKeywords.some((keyword: string) =>
        bodyLower.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  }

  // Template Variable Generation
  generateTemplateVariables(ticket: any, email: any): TemplateVariables {
    return {
      ticketNumber: `#${ticket.ticketNumber}`,
      ticketTitle: ticket.title,
      ticketStatus: ticket.status?.name || 'Unknown',
      ticketPriority: ticket.priority?.name || 'Unknown',
      ticketCategory: ticket.category?.name || 'Unknown',
      submitterName: ticket.submitter?.firstName + ' ' + ticket.submitter?.lastName || 'Unknown',
      submitterEmail: ticket.submitter?.email || email.from,
      assignedAgent: ticket.assignee?.firstName + ' ' + ticket.assignee?.lastName,
      assignedDepartment: ticket.assignedToDepartment?.name,
      companyName: 'TicketHub', // This should come from app settings
      supportEmail: 'support@tickethub.com', // This should come from app settings
      supportPhone: '+1-800-SUPPORT', // This should come from app settings
      estimatedResponseTime: '24 hours', // This should come from SLA settings
      estimatedResolutionTime: '72 hours', // This should come from SLA settings
      ticketUrl: `${process.env.FRONTEND_URL}/tickets/${ticket.id}`, // This should be configurable
      customFields: ticket.customFields || {},
    };
  }

  // Template Rendering
  renderTemplate(template: AutoResponseTemplate, variables: TemplateVariables): GeneratedAutoResponse {
    let subject = template.subjectTemplate;
    let body = template.bodyTemplate;

    // Replace variables in subject
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement = value?.toString() || '';
      subject = subject.replace(new RegExp(placeholder, 'g'), replacement);
      body = body.replace(new RegExp(placeholder, 'g'), replacement);
    });

    // Generate unique response ID for tracking
    const responseId = `ar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      subject,
      body,
      responseId,
      threadId: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

export const autoResponseService = new AutoResponseService();
