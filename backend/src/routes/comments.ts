import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { CreateCommentRequest, ApiResponse } from '../types';

const router = Router();

// Get comments for a ticket
router.get('/ticket/:ticketId', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Get total count
    const total = await prisma.comment.count({
      where: { ticketId }
    });

    // Get comments with author info
    const comments = await prisma.comment.findMany({
      where: { ticketId },
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
        },
        attachments: true
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limitNum
    });

    const totalPages = Math.ceil(total / limitNum);

    const response: ApiResponse = {
      success: true,
      data: comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get comments'
    });
  }
});

// Create new comment
router.post('/', authenticate, async (req, res) => {
  try {
    const { ticketId, content, isInternal = false }: CreateCommentRequest = req.body;
    const authorId = (req as any).user.id;

    // Validate required fields
    if (!ticketId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Ticket ID and content are required'
      });
    }

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        ticketId,
        authorId,
        content,
        isInternal
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
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Update ticket's updatedAt timestamp
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    });

    return res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    });
  }
});

// Update comment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.id;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Only allow updates if user is the author
    if (comment.authorId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update this comment'
      });
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
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
      data: updatedComment,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update comment'
    });
  }
});

// Delete comment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Only allow deletion if user is the author or admin via RBAC
    const requester = (req as any).user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.some((r: any) => r?.role?.name === 'admin');
    if (comment.authorId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete this comment'
      });
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
});

export default router;
