import { Router } from 'express';
import { authenticate, authorizePermission } from '../middleware/auth';
import { emailTrackingService } from '../services/emailTrackingService';
import { EmailDirection, EmailStatus } from '@prisma/client';
import { prisma } from '../index';

const router = Router();

// Get email logs with filtering and pagination
router.get('/', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const {
      direction,
      status,
      ticketId,
      userId,
      from,
      to,
      subject,
      startDate,
      endDate,
      page = '1',
      limit = '50',
      sortBy = 'processedAt',
      sortOrder = 'desc',
    } = req.query;

    const options = {
      direction: direction as EmailDirection,
      status: status as EmailStatus,
      ticketId: ticketId as string,
      userId: userId as string,
      from: from as string,
      to: to as string,
      subject: subject as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await emailTrackingService.getEmailLogs(options);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get email statistics
router.get('/statistics', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      ticketId,
      userId,
    } = req.query;

    const options = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      ticketId: ticketId as string,
      userId: userId as string,
    };

    const statistics = await emailTrackingService.getEmailStatistics(options);
    res.json({ success: true, data: statistics });
  } catch (error: any) {
    console.error('Error fetching email statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get email thread for a specific ticket
router.get('/ticket/:ticketId', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const thread = await emailTrackingService.getEmailThread(ticketId);
    res.json({ success: true, data: thread });
  } catch (error: any) {
    console.error('Error fetching email thread:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific email log details
router.get('/:id', authenticate, authorizePermission('tickets:read'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const emailLog = await prisma.emailLog.findUnique({
      where: { id },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!emailLog) {
      return res.status(404).json({ success: false, error: 'Email log not found' });
    }

    return res.json({ success: true, data: emailLog });
  } catch (error: any) {
    console.error('Error fetching email log:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Update email status (for webhooks, delivery notifications, etc.)
router.patch('/:id/status', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, error, deliveryStatus, readAt } = req.body;

    if (!Object.values(EmailStatus).includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    await emailTrackingService.updateEmailStatus(id, status, {
      error,
      deliveryStatus,
      readAt: readAt ? new Date(readAt) : undefined,
    });

    return res.json({ success: true, message: 'Email status updated' });
  } catch (error: any) {
    console.error('Error updating email status:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Retry failed email
router.post('/:id/retry', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const newEmailLogId = await emailTrackingService.retryEmail(id);
    res.json({ success: true, data: { newEmailLogId }, message: 'Email retry initiated' });
  } catch (error: any) {
    console.error('Error retrying email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send test email
router.post('/send-test', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { to, subject, text, html, ticketId, userId } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    const emailData = {
      to,
      subject: subject || 'Test Email from TicketHub',
      text: text || 'This is a test email from TicketHub email tracking system.',
      html: html || '<p>This is a test email from TicketHub email tracking system.</p>',
      options: {
        ticketId,
        userId,
        type: 'NEW' as const,
      },
    };

    const emailLogId = await emailTrackingService.sendEmail(emailData);
    return res.json({ success: true, data: { emailLogId }, message: 'Test email sent' });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Delete email log (requires settings:write permission)
router.delete('/:id', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if email log exists
    const emailLog = await prisma.emailLog.findUnique({
      where: { id },
      select: { id: true, ticketId: true }
    });

    if (!emailLog) {
      return res.status(404).json({ success: false, error: 'Email log not found' });
    }

    // If email log is associated with a ticket, we might want to prevent deletion
    // or at least warn the user. For now, we'll allow deletion but log it.
    if (emailLog.ticketId) {
      console.log(`Deleting email log ${id} associated with ticket ${emailLog.ticketId}`);
    }
    
    await prisma.emailLog.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'Email log deleted' });
  } catch (error: any) {
    console.error('Error deleting email log:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
