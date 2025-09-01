import { useState, useCallback, useRef } from 'react';

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: { autoExecute?: boolean } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  // Auto-execute if requested
  if (options.autoExecute && !data && !loading && !error) {
    execute();
  }

  return {
    data,
    loading,
    error,
    execute,
  };
}
