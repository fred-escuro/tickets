import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorizePermission } from '../middleware/auth';
import { Request, Response } from 'express';

const router = Router();

// Email truncation settings
interface EmailTruncationSettings {
  enabled: boolean;
  maxLength: number;
  preserveFirstEmail: boolean;
  truncationSuffix: string;
}

// Automatic response settings
interface AutoResponseSettings {
  enabled: boolean;
  contentTruncationLength: number;
  responseTemplate: string;
  subjectTemplate: string;
}

// Email response settings
interface EmailResponseSettings {
  includeOriginalContent: boolean;
  includeAllRecipients: boolean;
  includeCcRecipients: boolean;
  includeBccRecipients: boolean;
}

// Get email truncation settings
router.get('/email-truncation', authenticate, authorizePermission('settings:read'), async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        namespace: 'system',
        key: {
          in: [
            'email_truncation_enabled',
            'email_truncation_max_length',
            'email_truncation_preserve_first_email',
            'email_truncation_suffix'
          ]
        }
      }
    });

    const defaultSettings: EmailTruncationSettings = {
      enabled: true,
      maxLength: 1000,
      preserveFirstEmail: true,
      truncationSuffix: '... [Content truncated - click to expand]'
    };

    const result: EmailTruncationSettings = { ...defaultSettings };

    settings.forEach((setting: any) => {
      switch (setting.key) {
        case 'email_truncation_enabled':
          result.enabled = setting.value === true || setting.value === 'true';
          break;
        case 'email_truncation_max_length':
          result.maxLength = parseInt(String(setting.value)) || 1000;
          break;
        case 'email_truncation_preserve_first_email':
          result.preserveFirstEmail = setting.value === true || setting.value === 'true';
          break;
        case 'email_truncation_suffix':
          result.truncationSuffix = String(setting.value) || defaultSettings.truncationSuffix;
          break;
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get email truncation settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email truncation settings'
    });
  }
});

// Update email truncation settings
router.put('/email-truncation', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { enabled, maxLength, preserveFirstEmail, truncationSuffix }: EmailTruncationSettings = req.body;

    // Validate input
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean'
      });
    }

    if (typeof maxLength !== 'number' || maxLength < 100 || maxLength > 10000) {
      return res.status(400).json({
        success: false,
        error: 'maxLength must be a number between 100 and 10000'
      });
    }

    if (typeof preserveFirstEmail !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'preserveFirstEmail must be a boolean'
      });
    }

    if (typeof truncationSuffix !== 'string' || truncationSuffix.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'truncationSuffix must be a string with max 200 characters'
      });
    }

    // Update settings
    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'system', key: 'email_truncation_enabled' } },
      update: { value: enabled },
      create: { namespace: 'system', key: 'email_truncation_enabled', value: enabled }
    });

    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'system', key: 'email_truncation_max_length' } },
      update: { value: maxLength },
      create: { namespace: 'system', key: 'email_truncation_max_length', value: maxLength }
    });

    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'system', key: 'email_truncation_preserve_first_email' } },
      update: { value: preserveFirstEmail },
      create: { namespace: 'system', key: 'email_truncation_preserve_first_email', value: preserveFirstEmail }
    });

    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'system', key: 'email_truncation_suffix' } },
      update: { value: truncationSuffix },
      create: { namespace: 'system', key: 'email_truncation_suffix', value: truncationSuffix }
    });

    return res.json({
      success: true,
      message: 'Email truncation settings updated successfully'
    });
  } catch (error) {
    console.error('Update email truncation settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update email truncation settings'
    });
  }
});

// Get automatic response settings
router.get('/auto-response', authenticate, authorizePermission('settings:read'), async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        namespace: 'system',
        key: {
          in: [
            'auto_response_enabled',
            'auto_response_include_original_content',
            'auto_response_content_truncation_length',
            'auto_response_template',
            'auto_response_subject_template'
          ]
        }
      }
    });

    const defaultSettings: AutoResponseSettings = {
      enabled: true,
      contentTruncationLength: 500,
      responseTemplate: `Thank you for contacting our support team. We have received your ticket and will review it shortly.

Ticket Details:
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{priority}}
- Category: {{category}}

{{#includeOriginalContent}}
Original Message:
{{originalContent}}
{{/includeOriginalContent}}

Our support team will get back to you as soon as possible. You can track the progress of your ticket by logging into our support portal.

Best regards,
Support Team`,
      subjectTemplate: 'Re: {{ticketTitle}} - Ticket #{{ticketNumber}}'
    };

    const result: AutoResponseSettings = { ...defaultSettings };

    settings.forEach((setting: any) => {
      switch (setting.key) {
        case 'auto_response_enabled':
          result.enabled = setting.value === true || setting.value === 'true';
          break;
        case 'auto_response_content_truncation_length':
          result.contentTruncationLength = parseInt(String(setting.value)) || 500;
          break;
        case 'auto_response_template':
          result.responseTemplate = String(setting.value) || defaultSettings.responseTemplate;
          break;
        case 'auto_response_subject_template':
          result.subjectTemplate = String(setting.value) || defaultSettings.subjectTemplate;
          break;
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get auto response settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get auto response settings'
    });
  }
});

// Update automatic response settings
router.put('/auto-response', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { enabled, contentTruncationLength, responseTemplate, subjectTemplate }: AutoResponseSettings = req.body;

    // Validate input
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean'
      });
    }

    if (typeof contentTruncationLength !== 'number' || contentTruncationLength < 100 || contentTruncationLength > 2000) {
      return res.status(400).json({
        success: false,
        error: 'contentTruncationLength must be a number between 100 and 2000'
      });
    }

    if (typeof responseTemplate !== 'string' || responseTemplate.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'responseTemplate must be a string with max 5000 characters'
      });
    }

    if (typeof subjectTemplate !== 'string' || subjectTemplate.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'subjectTemplate must be a string with max 200 characters'
      });
    }

    // Update settings
    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'system', key: 'auto_response_enabled' } },
      update: { value: enabled },
      create: { namespace: 'system', key: 'auto_response_enabled', value: enabled }
    });


    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'system', key: 'auto_response_content_truncation_length' } },
      update: { value: contentTruncationLength },
      create: { namespace: 'system', key: 'auto_response_content_truncation_length', value: contentTruncationLength }
    });

    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'system', key: 'auto_response_template' } },
      update: { value: responseTemplate },
      create: { namespace: 'system', key: 'auto_response_template', value: responseTemplate }
    });

    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'system', key: 'auto_response_subject_template' } },
      update: { value: subjectTemplate },
      create: { namespace: 'system', key: 'auto_response_subject_template', value: subjectTemplate }
    });

    return res.json({
      success: true,
      message: 'Automatic response settings updated successfully'
    });
  } catch (error) {
    console.error('Update auto response settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update automatic response settings'
    });
  }
});

// Get email response settings
router.get('/email-responses', authenticate, authorizePermission('settings:read'), async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        namespace: 'email.responses',
        key: {
          in: [
            'include_original_content',
            'include_all_recipients',
            'include_cc_recipients',
            'include_bcc_recipients'
          ]
        }
      }
    });

    const defaultSettings: EmailResponseSettings = {
      includeOriginalContent: true,
      includeAllRecipients: false,
      includeCcRecipients: true,
      includeBccRecipients: false
    };

    const result: EmailResponseSettings = { ...defaultSettings };

    settings.forEach((setting: any) => {
      switch (setting.key) {
        case 'include_original_content':
          result.includeOriginalContent = setting.value === true || setting.value === 'true';
          break;
        case 'include_all_recipients':
          result.includeAllRecipients = setting.value === true || setting.value === 'true';
          break;
        case 'include_cc_recipients':
          result.includeCcRecipients = setting.value === true || setting.value === 'true';
          break;
        case 'include_bcc_recipients':
          result.includeBccRecipients = setting.value === true || setting.value === 'true';
          break;
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get email response settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email response settings'
    });
  }
});

// Update email response settings
router.put('/email-responses', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { 
      includeOriginalContent, 
      includeAllRecipients, 
      includeCcRecipients, 
      includeBccRecipients 
    }: EmailResponseSettings = req.body;

    // Validate input
    if (typeof includeOriginalContent !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'includeOriginalContent must be a boolean'
      });
    }

    if (typeof includeAllRecipients !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'includeAllRecipients must be a boolean'
      });
    }

    if (typeof includeCcRecipients !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'includeCcRecipients must be a boolean'
      });
    }

    if (typeof includeBccRecipients !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'includeBccRecipients must be a boolean'
      });
    }

    // Update settings
    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'email.responses', key: 'include_original_content' } },
      update: { value: includeOriginalContent },
      create: { namespace: 'email.responses', key: 'include_original_content', value: includeOriginalContent }
    });

    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'email.responses', key: 'include_all_recipients' } },
      update: { value: includeAllRecipients },
      create: { namespace: 'email.responses', key: 'include_all_recipients', value: includeAllRecipients }
    });

    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'email.responses', key: 'include_cc_recipients' } },
      update: { value: includeCcRecipients },
      create: { namespace: 'email.responses', key: 'include_cc_recipients', value: includeCcRecipients }
    });

    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: 'email.responses', key: 'include_bcc_recipients' } },
      update: { value: includeBccRecipients },
      create: { namespace: 'email.responses', key: 'include_bcc_recipients', value: includeBccRecipients }
    });

    return res.json({
      success: true,
      message: 'Email response settings updated successfully'
    });
  } catch (error) {
    console.error('Update email response settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update email response settings'
    });
  }
});

// Get followup management settings
router.get('/followup', authenticate, authorizePermission('settings:read'), async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        namespace: 'followup'
      }
    });

    // Convert array to object
    const settingsObject: Record<string, any> = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value;
    });

    return res.json({
      success: true,
      data: settingsObject
    });
  } catch (error) {
    console.error('Get followup settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get followup settings'
    });
  }
});

// Get auto-response settings
router.get('/auto-response', authenticate, authorizePermission('settings:read'), async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        namespace: 'auto_response'
      }
    });

    const settingsObject: Record<string, any> = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value;
    });

    return res.json({
      success: true,
      data: settingsObject
    });
  } catch (error) {
    console.error('Get auto-response settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get auto-response settings'
    });
  }
});

// Update auto-response settings
router.put('/auto-response', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid enabled value. Must be boolean.'
      });
    }

    // Upsert the auto-response enabled setting
    await prisma.appSetting.upsert({
      where: {
        namespace_key: {
          namespace: 'auto_response',
          key: 'enabled'
        }
      },
      update: {
        value: enabled,
        updatedAt: new Date()
      },
      create: {
        namespace: 'auto_response',
        key: 'enabled',
        value: enabled,
        description: 'Enable automatic responses to new tickets'
      }
    });

    return res.json({
      success: true,
      message: 'Auto-response settings updated successfully'
    });
  } catch (error) {
    console.error('Update auto-response settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update auto-response settings'
    });
  }
});

export default router;