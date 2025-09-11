import { useEffect, useState } from 'react';
import { settingsService } from '../lib/settingsService';
import { settingsApi } from '../lib/services/settingsApi';

export const useAppTitle = (pageTitle: string) => {
  const [appName, setAppName] = useState<string>('TicketHub');
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load company name from local settings
        const settings = settingsService.getSettings();
        const company = settings?.general?.companyName || '';
        setCompanyName(company);

        // Load app name from API
        const res = await settingsApi.preloadBranding();
        if (res.success && res.data) {
          const branding = res.data['branding'] || {};
          const app = branding.appName || branding.name || 'TicketHub';
          setAppName(app);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setAppName('TicketHub');
      }
    };

    loadSettings();

    // Listen for branding updates
    const handleBrandingUpdate = (event: CustomEvent) => {
      const { appName: newAppName } = event.detail || {};
      if (newAppName) {
        setAppName(newAppName);
      }
    };

    window.addEventListener('branding-updated', handleBrandingUpdate as EventListener);

    return () => {
      window.removeEventListener('branding-updated', handleBrandingUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    let title = '';
    
    // Use app name as the base title
    if (appName) {
      title = appName;
    } else {
      title = pageTitle; // fallback to page title if no app name
    }
    
    // Add company name if available
    if (companyName) {
      title = `${title} - ${companyName}`;
    }
    
    document.title = title;
  }, [pageTitle, appName, companyName]);

  return { appName, companyName };
};
