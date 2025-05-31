export * from './transactions';

// Additional types for the monitoring system
export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoClose?: boolean;
  duration?: number;
}

export interface MonitoringConfig {
  refreshInterval: number; // milliseconds
  alertThresholds: {
    riskScore: number;
    largeTransfer: number;
    rapidTransactions: number;
  };
  notifications: {
    email?: boolean;
    push?: boolean;
    sound?: boolean;
  };
}

export interface DashboardState {
  isConnected: boolean;
  currentAddress?: string;
  timeRange: '1h' | '24h' | '7d' | '30d';
  filters: {
    showSuspicious: boolean;
    minAmount: number;
    selectedTypes: string[];
  };
}