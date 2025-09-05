import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { SearchQuery, ApiResponse } from '../types';

const router = Router();

// Global search across tickets, knowledge base, and users
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      q,
      type = 'all',
      category,
      page = 1,
      limit = 20
    } = req.query;

    // Type guard for required query parameter
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;
    const searchTerm = (q as string).trim();

    let results: any = {};
    let totalResults = 0;

    // Search tickets
    if (type === 'all' || type === 'tickets') {
      const ticketWhere: any = {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      if (category) ticketWhere.category = category;

      const [ticketCount, tickets] = await Promise.all([
        prisma.ticket.count({ where: ticketWhere }),
        prisma.ticket.findMany({
          where: ticketWhere,
          include: {
            submitter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                email: true,
                avatar: true
              }
            },
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                email: true,
                avatar: true
              }
            },
            _count: {
              select: {
                comments: true,
                attachments: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limitNum
        })
      ]);

      results.tickets = {
        data: tickets,
        total: ticketCount,
        type: 'tickets'
      };
      totalResults += ticketCount;
    }

    // Search knowledge base
    if (type === 'all' || type === 'knowledge') {
      const kbWhere: any = {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { content: { contains: searchTerm, mode: 'insensitive' } },
          { tags: { array_contains: [searchTerm] } }
        ]
      };

      if (category) kbWhere.category = category;

      const [kbCount, knowledgeBase] = await Promise.all([
        prisma.knowledgeBase.count({ where: kbWhere }),
        prisma.knowledgeBase.findMany({
          where: kbWhere,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                email: true,
                avatar: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limitNum
        })
      ]);

      results.knowledge = {
        data: knowledgeBase,
        total: kbCount,
        type: 'knowledge'
      };
      totalResults += kbCount;
    }

    // Search users (admin only via RBAC)
    const requester = (req as any).user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.some((r: any) => r?.role?.name === 'admin');
    if ((type === 'all' || type === 'users') && isAdmin) {
      const userWhere: any = {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { middleName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { department: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      const [userCount, users] = await Promise.all([
        prisma.user.count({ where: userWhere }),
        prisma.user.findMany({
          where: userWhere,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            // role column deprecated; include roles relation if needed
            department: true,
            avatar: true,
            isAgent: true,
            createdAt: true
          },
          orderBy: { firstName: 'asc' },
          skip,
          take: limitNum
        })
      ]);

      results.users = {
        data: users,
        total: userCount,
        type: 'users'
      };
      totalResults += userCount;
    }

    const totalPages = Math.ceil(totalResults / limitNum);

    const response: ApiResponse = {
      success: true,
      data: {
        query: searchTerm,
        results,
        totalResults
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalResults,
        totalPages
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Search suggestions (autocomplete)
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchTerm = (q as string).trim();
    const suggestions: any[] = [];

    // Ticket suggestions
    if (type === 'all' || type === 'tickets') {
      const ticketSuggestions = await prisma.ticket.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { category: { name: { contains: searchTerm, mode: 'insensitive' } } }
          ]
        },
        select: {
          id: true,
          title: true,
          category: {
            select: {
              name: true
            }
          },
          status: {
            select: {
              name: true
            }
          }
        },
        take: 5
      });

      suggestions.push(...ticketSuggestions.map(t => ({
        ...t,
        type: 'ticket',
        display: `${t.title} (${t.category?.name || 'Unknown'})`
      })));
    }

    // Knowledge base suggestions
    if (type === 'all' || type === 'knowledge') {
      const kbSuggestions = await prisma.knowledgeBase.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { category: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          category: true
        },
        take: 5
      });

      suggestions.push(...kbSuggestions.map(kb => ({
        ...kb,
        type: 'knowledge',
        display: `${kb.title} (${kb.category})`
      })));
    }

    // User suggestions (admin only via RBAC)
    const requester = (req as any).user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.some((r: any) => r?.role?.name === 'admin');
    if ((type === 'all' || type === 'users') && isAdmin) {
      const userSuggestions = await prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { middleName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          email: true
        },
        take: 5
      });

      suggestions.push(...userSuggestions.map(u => ({
        ...u,
        type: 'user',
        display: `${u.middleName ? `${u.firstName} ${u.middleName} ${u.lastName}` : `${u.firstName} ${u.lastName}`} (${u.email})`
      })));
    }

    // Sort by relevance and limit total results
    const sortedSuggestions = suggestions
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.display.toLowerCase().includes(searchTerm.toLowerCase());
        const bExact = b.display.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return 0;
      })
      .slice(0, 10);

    return res.json({
      success: true,
      data: sortedSuggestions
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get search suggestions'
    });
  }
});

// Get search statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchTerm = (q as string).trim();

    // Count results by type
    const [ticketCount, kbCount, userCount] = await Promise.all([
      prisma.ticket.count({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        }
      }),
      prisma.knowledgeBase.count({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } }
          ]
        }
      }),
      (Array.isArray((req as any).user?.roles) && (req as any).user.roles.some((r: any) => r?.role?.name === 'admin')) ? prisma.user.count({
        where: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { middleName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } }
          ]
        }
      }) : Promise.resolve(0)
    ]);

    const stats = {
      query: searchTerm,
      results: {
        tickets: ticketCount,
        knowledge: kbCount,
        users: userCount,
        total: ticketCount + kbCount + userCount
      }
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Search stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get search statistics'
    });
  }
});

export default router;
