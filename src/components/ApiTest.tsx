import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, API_ENDPOINTS } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Server } from 'lucide-react';

export const ApiTest = () => {
  const [healthStatus, setHealthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [healthData, setHealthData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const testBackendConnection = async () => {
    setHealthStatus('loading');
    setErrorMessage('');
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH);
      
      if (response.success) {
        setHealthStatus('success');
        setHealthData(response.data);
      } else {
        setHealthStatus('error');
        setErrorMessage(response.error || 'Health check failed');
      }
    } catch (error) {
      setHealthStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Server className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (healthStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Connected</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Error</Badge>;
      case 'loading':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Testing...</Badge>;
      default:
        return <Badge variant="outline">Not Tested</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Backend Connection Test</CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm">
            {healthStatus === 'idle' && 'Click the button below to test backend connection'}
            {healthStatus === 'loading' && 'Testing backend connection...'}
            {healthStatus === 'success' && 'Backend connection successful!'}
            {healthStatus === 'error' && 'Backend connection failed'}
          </span>
        </div>

        <Button 
          onClick={testBackendConnection} 
          disabled={healthStatus === 'loading'}
          className="w-full"
        >
          {healthStatus === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Testing...
            </>
          ) : (
            'Test Backend Connection'
          )}
        </Button>

        {healthStatus === 'success' && healthData && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Backend Status:</h4>
            <div className="space-y-1 text-sm text-green-700">
              <div><strong>Status:</strong> {healthData.status}</div>
              <div><strong>Environment:</strong> {healthData.environment}</div>
              <div><strong>Timestamp:</strong> {new Date(healthData.timestamp).toLocaleString()}</div>
            </div>
          </div>
        )}

        {healthStatus === 'error' && errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
            <p className="text-sm text-red-700">{errorMessage}</p>
            <div className="mt-2 text-xs text-red-600">
              <p>Make sure your backend is running on port 3001</p>
              <p>Check that CORS is properly configured</p>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Backend URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:3001'}</p>
          <p><strong>Frontend URL:</strong> {window.location.origin}</p>
          <p><strong>Health Endpoint:</strong> /health</p>
        </div>
      </CardContent>
    </Card>
  );
};
