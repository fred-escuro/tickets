import React, { useState, useCallback } from 'react';
import ProcessingModal from '@/components/ui/ProcessingModal';

export interface ProcessingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  status?: 'processing' | 'success' | 'error' | 'warning';
  progress?: number; // 0-100
  showProgress?: boolean;
  allowClose?: boolean;
  autoCloseDelay?: number; // milliseconds
  onAutoClose?: () => void;
}

export interface UseProcessingModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setStatus: (status: ProcessingModalProps['status']) => void;
  setMessage: (message: string) => void;
  setTitle: (title: string) => void;
  setProgress: (progress: number) => void;
  showProgress: (show: boolean) => void;
  ProcessingModalComponent: React.FC<Partial<ProcessingModalProps>>;
}

export const useProcessingModal = (initialProps?: Partial<ProcessingModalProps>): UseProcessingModalReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [props, setProps] = useState<ProcessingModalProps>({
    isOpen: false,
    title: 'Processing...',
    message: 'Please wait while we process your request.',
    status: 'processing',
    showProgress: false,
    allowClose: false,
    ...initialProps
  });

  const open = useCallback(() => {
    setIsOpen(true);
    setProps(prev => ({ ...prev, isOpen: true, status: 'processing' }));
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setProps(prev => ({ ...prev, isOpen: false }));
  }, []);

  const setStatus = useCallback((status: ProcessingModalProps['status']) => {
    setProps(prev => ({ ...prev, status }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setProps(prev => ({ ...prev, message }));
  }, []);

  const setTitle = useCallback((title: string) => {
    setProps(prev => ({ ...prev, title }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setProps(prev => ({ ...prev, progress }));
  }, []);

  const showProgress = useCallback((show: boolean) => {
    setProps(prev => ({ ...prev, showProgress: show }));
  }, []);

  const ProcessingModalComponent = useCallback((overrideProps: Partial<ProcessingModalProps> = {}) => (
    <ProcessingModal
      {...props}
      {...overrideProps}
      isOpen={isOpen}
      onClose={close}
    />
  ), [props, isOpen, close]);

  return {
    isOpen,
    open,
    close,
    setStatus,
    setMessage,
    setTitle,
    setProgress,
    showProgress,
    ProcessingModalComponent
  };
};

export default useProcessingModal;
