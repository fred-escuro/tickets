// Environment configuration
export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001'),
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },

  // App Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Nexus Dashboard',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development',
  },

  // Feature Flags
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
    fileUpload: import.meta.env.VITE_ENABLE_FILE_UPLOAD === 'true',
  },

  // Development Configuration
  dev: {
    mockData: import.meta.env.DEV,
    debugMode: import.meta.env.DEV,
  },
} as const;

// Environment helpers
export const isDevelopment = config.app.environment === 'development';
export const isProduction = config.app.environment === 'production';
export const isTest = config.app.environment === 'test';

// API URL builder
export const getApiUrl = (endpoint: string): string => {
  return `${config.api.baseUrl}${endpoint}`;
};

// Feature check helpers
export const hasFeature = (feature: keyof typeof config.features): boolean => {
  return config.features[feature];
};
