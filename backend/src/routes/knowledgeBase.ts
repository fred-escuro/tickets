import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireAgent } from '../middleware/auth';
import { CreateKnowledgeBaseRequest, ApiResponse } from '../types';

const router = Router();

// Get all knowledge base articles
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.knowledgeBase.count({ where });

    // Get articles
    const articles = await prisma.knowledgeBase.findMany({
      where,
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
      orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
      skip,
      take: limitNum
    });

    const totalPages = Math.ceil(total / limitNum);

    const response: ApiResponse = {
      success: true,
      data: articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Get knowledge base error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get knowledge base articles'
    });
  }
});

// Get article by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count
    await prisma.knowledgeBase.update({
      where: { id },
      data: { views: { increment: 1 } }
    });

    const article = await prisma.knowledgeBase.findUnique({
      where: { id },
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
      }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    return res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Get article error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get article'
    });
  }
});

// Create new article (agents only)
router.post('/', authenticate, requireAgent, async (req, res) => {
  try {
    const { title, content, category, tags }: CreateKnowledgeBaseRequest = req.body;
    const authorId = (req as any).user.id;

    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, and category are required'
      });
    }

    const article = await prisma.knowledgeBase.create({
      data: {
        title,
        content,
        category,
        tags: tags || [],
        authorId
      },
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
      }
    });

    return res.status(201).json({
      success: true,
      data: article,
      message: 'Article created successfully'
    });
  } catch (error) {
    console.error('Create article error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create article'
    });
  }
});

// Update article
router.put('/:id', authenticate, requireAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags } = req.body;
    const userId = (req as any).user.id;

    // Check if article exists
    const existingArticle = await prisma.knowledgeBase.findUnique({
      where: { id }
    });

    if (!existingArticle) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    // Only allow updates if user is the author or admin via RBAC
    const requester = (req as any).user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.some((r: any) => r?.role?.name === 'admin');
    if (existingArticle.authorId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update this article'
      });
    }

    const updatedArticle = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        title,
        content,
        category,
        tags,
        updatedAt: new Date()
      },
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
      }
    });

    return res.json({
      success: true,
      data: updatedArticle,
      message: 'Article updated successfully'
    });
  } catch (error) {
    console.error('Update article error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update article'
    });
  }
});

// Delete article
router.delete('/:id', authenticate, requireAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const article = await prisma.knowledgeBase.findUnique({
      where: { id }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    // Only allow deletion if user is the author or admin via RBAC
    const requester = (req as any).user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.some((r: any) => r?.role?.name === 'admin');
    if (article.authorId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete this article'
      });
    }

    await prisma.knowledgeBase.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete article'
    });
  }
});

// Mark article as helpful
router.post('/:id/helpful', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const article = await prisma.knowledgeBase.findUnique({
      where: { id }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    const updatedArticle = await prisma.knowledgeBase.update({
      where: { id },
      data: { helpful: { increment: 1 } }
    });

    return res.json({
      success: true,
      data: updatedArticle,
      message: 'Article marked as helpful'
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark article as helpful'
    });
  }
});

// Get categories
router.get('/categories/list', authenticate, async (req, res) => {
  try {
    const categories = await prisma.knowledgeBase.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    });

    const categoryList = categories.map(cat => ({
      name: cat.category,
      count: cat._count.category
    }));

    return res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
});

export default router;
