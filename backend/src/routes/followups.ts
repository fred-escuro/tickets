import express from 'express';
import { followupDetectionService, InboundEmail } from '../services/followupDetectionService';
import { followupProcessorService } from '../services/followupProcessorService';
import { authenticate } from '../middleware/auth';
import { prisma } from '../index';

const router = express.Router();

/**
 * POST /api/followups/detect
 * Detect if an email is a follow-up to an auto-response
 */
router.post('/detect', authenticate, async (req, res) => {
  try {
    const email: InboundEmail = req.body;

    if (!email.from || !email.subject || !email.body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required email fields'
      });
    }

    const detection = await followupDetectionService.detectAutoResponseReply(email);

    return res.json({
      success: true,
      data: detection
    });
  } catch (error) {
    console.error('Error detecting follow-up:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to detect follow-up'
    });
  }
});

/**
 * POST /api/followups/process
 * Process a follow-up email and add it as a ticket comment
 */
router.post('/process', authenticate, async (req, res) => {
  try {
    const email: InboundEmail = req.body;

    if (!email.from || !email.subject || !email.body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required email fields'
      });
    }

    const result = await followupProcessorService.processFollowup(email);

    return res.json({
      success: result.success,
      data: result,
      error: result.error
    });
  } catch (error) {
    console.error('Error processing follow-up:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process follow-up'
    });
  }
});

/**
 * POST /api/followups/process-batch
 * Process multiple follow-up emails in batch
 */
router.post('/process-batch', authenticate, async (req, res) => {
  try {
    const emails: InboundEmail[] = req.body.emails;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or empty emails array'
      });
    }

    const results = await followupProcessorService.processBatchFollowups(emails);

    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error processing batch follow-ups:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process batch follow-ups'
    });
  }
});

/**
 * GET /api/followups/ticket/:ticketId
 * Get all follow-ups for a specific ticket
 */
router.get('/ticket/:ticketId', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const followups = await followupProcessorService.getTicketFollowups(ticketId);

    return res.json({
      success: true,
      data: followups
    });
  } catch (error) {
    console.error('Error fetching ticket follow-ups:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket follow-ups'
    });
  }
});

/**
 * GET /api/followups/auto-response/:autoResponseId
 * Get all follow-ups for a specific auto-response
 */
router.get('/auto-response/:autoResponseId', authenticate, async (req, res) => {
  try {
    const { autoResponseId } = req.params;

    const followups = await followupDetectionService.getAutoResponseFollowups(autoResponseId);

    return res.json({
      success: true,
      data: followups
    });
  } catch (error) {
    console.error('Error fetching auto-response follow-ups:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch auto-response follow-ups'
    });
  }
});

/**
 * GET /api/followups/stats
 * Get follow-up statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.query;

    const stats = await followupProcessorService.getFollowupStats(
      ticketId as string | undefined
    );

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching follow-up stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch follow-up stats'
    });
  }
});

/**
 * GET /api/followups/recent
 * Get recent follow-ups across all tickets
 */
router.get('/recent', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const followups = await prisma.emailFollowup.findMany({
      take: limit,
      skip: offset,
      orderBy: { processedAt: 'desc' },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true
          }
        },
        autoResponse: {
          select: {
            id: true,
            toEmail: true,
            subject: true,
            template: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return res.json({
      success: true,
      data: followups
    });
  } catch (error) {
    console.error('Error fetching recent follow-ups:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recent follow-ups'
    });
  }
});

/**
 * PUT /api/followups/:followupId/status
 * Update follow-up status
 */
router.put('/:followupId/status', authenticate, async (req, res) => {
  try {
    const { followupId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const followup = await prisma.emailFollowup.update({
      where: { id: followupId },
      data: { status }
    });

    return res.json({
      success: true,
      data: followup
    });
  } catch (error) {
    console.error('Error updating follow-up status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update follow-up status'
    });
  }
});

/**
 * DELETE /api/followups/:followupId
 * Delete a follow-up (soft delete by marking as ignored)
 */
router.delete('/:followupId', authenticate, async (req, res) => {
  try {
    const { followupId } = req.params;

    const followup = await prisma.emailFollowup.update({
      where: { id: followupId },
      data: { status: 'IGNORED' }
    });

    return res.json({
      success: true,
      data: followup
    });
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete follow-up'
    });
  }
});

export default router;
