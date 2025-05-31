import { useState, useEffect, useCallback } from 'react';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoClose?: boolean;
  duration?: number; // in milliseconds
}

interface AlertsResult {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

export function useAlerts(): AlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Add a new alert
  const addAlert = useCallback((alertData: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alertData,
      id: generateAlertId(),
      timestamp: Date.now(),
    };

    setAlerts(prev => [newAlert, ...prev]);

    // Auto-close alert if specified
    if (newAlert.autoClose !== false) {
      const duration = newAlert.duration || getDefaultDuration(newAlert.severity);
      setTimeout(() => {
        dismissAlert(newAlert.id);
      }, duration);
    }
  }, []);

  // Dismiss a specific alert
  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Auto-generate security alerts based on common patterns
  useEffect(() => {
    // Simulate periodic security checks
    const interval = setInterval(() => {
      // This would normally be triggered by actual security events
      const randomEvent = Math.random();
      
      if (randomEvent < 0.1) { // 10% chance of alert
        const alertTypes = [
          {
            type: 'warning' as const,
            title: 'Unusual Activity Detected',
            message: 'Multiple rapid transactions detected in your wallet',
            severity: 'medium' as const,
          },
          {
            type: 'error' as const,
            title: 'High Risk Transaction',
            message: 'Transaction to potentially malicious address detected',
            severity: 'high' as const,
          },
          {
            type: 'info' as const,
            title: 'New Contract Interaction',
            message: 'Your wallet interacted with a new smart contract',
            severity: 'low' as const,
          },
        ];
        
        const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        addAlert(randomAlert);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [addAlert]);

  // Pre-defined alert templates
  useEffect(() => {
    // Add initial welcome alert
    if (alerts.length === 0) {
      addAlert({
        type: 'info',
        title: 'Monitoring Started',
        message: 'Wallet monitoring is now active. You will receive alerts for suspicious activities.',
        severity: 'low',
        autoClose: true,
        duration: 5000,
      });
    }
  }, [addAlert, alerts.length]);

  return {
    alerts,
    addAlert,
    dismissAlert,
    clearAllAlerts,
  };
}

// Helper functions
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultDuration(severity: Alert['severity']): number {
  switch (severity) {
    case 'critical':
      return 0; // Never auto-close critical alerts
    case 'high':
      return 15000; // 15 seconds
    case 'medium':
      return 10000; // 10 seconds
    case 'low':
      return 5000; // 5 seconds
    default:
      return 8000;
  }
}

// Export helper function to create specific alert types
export const createAlert = {
  suspiciousTransaction: (txHash: string): Omit<Alert, 'id' | 'timestamp'> => ({
    type: 'warning',
    title: 'Suspicious Transaction Detected',
    message: `Transaction ${txHash.slice(0, 8)}... shows unusual patterns`,
    severity: 'high',
    autoClose: false,
  }),

  highRiskPattern: (pattern: string): Omit<Alert, 'id' | 'timestamp'> => ({
    type: 'error',
    title: 'High Risk Pattern Detected',
    message: `Detected pattern: ${pattern}`,
    severity: 'critical',
    autoClose: false,
  }),

  contractInteraction: (contractAddress: string): Omit<Alert, 'id' | 'timestamp'> => ({
    type: 'info',
    title: 'New Contract Interaction',
    message: `Interacted with contract: ${contractAddress.slice(0, 8)}...`,
    severity: 'low',
    autoClose: true,
    duration: 8000,
  }),

  failedTransaction: (reason: string): Omit<Alert, 'id' | 'timestamp'> => ({
    type: 'warning',
    title: 'Transaction Failed',
    message: `Transaction failed: ${reason}`,
    severity: 'medium',
    autoClose: true,
    duration: 10000,
  }),
};