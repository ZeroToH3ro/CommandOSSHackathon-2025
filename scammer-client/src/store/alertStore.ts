import { create } from 'zustand';
import { Alert } from '../types/transactions';

interface AlertStore {
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
  markAsRead: (id: string) => void;
  getUnreadCount: () => number;
}

export const useAlertStore = create<AlertStore>()((set, get) => ({
  alerts: [],
  
  addAlert: (alert: Alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts]
    }));
    
    // Auto-remove alert after 30 seconds for low severity
    if (alert.severity === 'low') {
      setTimeout(() => {
        get().removeAlert(alert.id);
      }, 30000);
    }
  },
  
  removeAlert: (id: string) => {
    set((state) => ({
      alerts: state.alerts.filter(alert => alert.id !== id)
    }));
  },
  
  clearAlerts: () => {
    set({ alerts: [] });
  },
  
  markAsRead: (id: string) => {
    set((state) => ({
      alerts: state.alerts.map(alert =>
        alert.id === id ? { ...alert, read: true } : alert
      )
    }));
  },
  
  getUnreadCount: () => {
    return get().alerts.filter(alert => !alert.read).length;
  }
}));