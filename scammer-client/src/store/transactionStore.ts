import { create } from 'zustand';
import { Transaction, TransactionFilter, TransactionAnalysis, WalletMetrics } from '../types/transactions';

interface TransactionStore {
  // State
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  filter: TransactionFilter;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  
  // Computed values
  analysis: TransactionAnalysis | null;
  metrics: WalletMetrics | null;
  
  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  setFilter: (filter: TransactionFilter) => void;
  clearFilter: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed actions
  applyFilter: () => void;
  calculateAnalysis: () => void;
  calculateMetrics: (walletAddress: string) => void;
}

const applyTransactionFilter = (transactions: Transaction[], filter: TransactionFilter): Transaction[] => {
  return transactions.filter(transaction => {
    // Filter by type
    if (filter.type && filter.type.length > 0) {
      if (!filter.type.includes(transaction.type)) return false;
    }
    
    // Filter by status
    if (filter.status && filter.status.length > 0) {
      if (!filter.status.includes(transaction.status)) return false;
    }
    
    // Filter by time range
    if (filter.timeRange) {
      if (transaction.timestamp < filter.timeRange.start || transaction.timestamp > filter.timeRange.end) {
        return false;
      }
    }
    
    // Filter by amount range
    if (filter.amountRange) {
      if (filter.amountRange.min !== undefined && transaction.amount < filter.amountRange.min) {
        return false;
      }
      if (filter.amountRange.max !== undefined && transaction.amount > filter.amountRange.max) {
        return false;
      }
    }
    
    // Filter by risk score
    if (filter.riskScore && transaction.riskScore !== undefined) {
      if (filter.riskScore.min !== undefined && transaction.riskScore < filter.riskScore.min) {
        return false;
      }
      if (filter.riskScore.max !== undefined && transaction.riskScore > filter.riskScore.max) {
        return false;
      }
    }
    
    // Filter by suspicious flag
    if (filter.onlySuspicious && !transaction.suspicious) {
      return false;
    }
    
    // Filter by tokens
    if (filter.tokens && filter.tokens.length > 0) {
      if (!filter.tokens.includes(transaction.token)) return false;
    }
    
    // Filter by addresses
    if (filter.addresses && filter.addresses.length > 0) {
      if (!filter.addresses.includes(transaction.from) && !filter.addresses.includes(transaction.to)) {
        return false;
      }
    }
    
    return true;
  });
};

const calculateTransactionAnalysis = (transactions: Transaction[]): TransactionAnalysis => {
  const totalTransactions = transactions.length;
  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const successfulTxs = transactions.filter(tx => tx.status === 'success' || tx.status === 'confirmed');
  const successRate = totalTransactions > 0 ? successfulTxs.length / totalTransactions : 0;
  const avgGasUsed = transactions.reduce((sum, tx) => sum + (tx.gasUsed || 0), 0) / totalTransactions;
  const suspiciousCount = transactions.filter(tx => tx.suspicious).length;
  const avgRiskScore = transactions.reduce((sum, tx) => sum + (tx.riskScore || 0), 0) / totalTransactions;
  
  // Group by type
  const transactionsByType = transactions.reduce((acc, tx) => {
    acc[tx.type] = (acc[tx.type] || 0) + 1;
    return acc;
  }, {} as Record<Transaction['type'], number>);
  
  // Group by status
  const transactionsByStatus = transactions.reduce((acc, tx) => {
    acc[tx.status] = (acc[tx.status] || 0) + 1;
    return acc;
  }, {} as Record<Transaction['status'], number>);
  
  // Top tokens
  const tokenCounts = transactions.reduce((acc, tx) => {
    if (!acc[tx.token]) {
      acc[tx.token] = { count: 0, volume: 0 };
    }
    acc[tx.token].count++;
    acc[tx.token].volume += tx.amount;
    return acc;
  }, {} as Record<string, { count: number; volume: number }>);
  
  const topTokens = Object.entries(tokenCounts)
    .map(([token, data]) => ({ token, ...data }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);
  
  // Time distribution
  const timeDistribution = Array.from({ length: 24 }, (_, hour) => {
    const hourTransactions = transactions.filter(tx => {
      const txHour = new Date(tx.timestamp).getHours();
      return txHour === hour;
    });
    
    return {
      hour,
      count: hourTransactions.length,
      volume: hourTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    };
  });
  
  return {
    totalTransactions,
    totalVolume,
    successRate,
    averageGasUsed: avgGasUsed,
    suspiciousCount,
    averageRiskScore: avgRiskScore,
    transactionsByType,
    transactionsByStatus,
    topTokens,
    timeDistribution
  };
};

const calculateWalletMetrics = (transactions: Transaction[], walletAddress: string): WalletMetrics => {
  const sentTxs = transactions.filter(tx => tx.from === walletAddress);
  const receivedTxs = transactions.filter(tx => tx.to === walletAddress);
  const contractTxs = transactions.filter(tx => tx.type === 'contract');
  const failedTxs = transactions.filter(tx => tx.status === 'failed');
  
  const totalSent = sentTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const totalReceived = receivedTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const avgTransactionSize = transactions.length > 0 ? transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length : 0;
  
  const addresses = new Set();
  transactions.forEach(tx => {
    addresses.add(tx.from);
    addresses.add(tx.to);
  });
  
  const timestamps = transactions.map(tx => tx.timestamp).sort((a, b) => a - b);
  
  return {
    address: walletAddress,
    totalTransactions: transactions.length,
    totalSent,
    totalReceived,
    netBalance: totalReceived - totalSent,
    avgTransactionSize,
    mostActiveDay: '', // Could be calculated from timestamps
    firstTransaction: timestamps[0] || 0,
    lastTransaction: timestamps[timestamps.length - 1] || 0,
    uniqueAddresses: addresses.size,
    contractInteractions: contractTxs.length,
    failureRate: transactions.length > 0 ? failedTxs.length / transactions.length : 0
  };
};

export const useTransactionStore = create<TransactionStore>()((set, get) => ({
  // Initial state
  transactions: [],
  filteredTransactions: [],
  filter: {},
  isLoading: false,
  error: null,
  lastFetch: null,
  analysis: null,
  metrics: null,
  
  // Actions
  setTransactions: (transactions: Transaction[]) => {
    set({ 
      transactions, 
      lastFetch: Date.now() 
    });
    get().applyFilter();
    get().calculateAnalysis();
  },
  
  addTransaction: (transaction: Transaction) => {
    set(state => ({
      transactions: [transaction, ...state.transactions]
    }));
    get().applyFilter();
    get().calculateAnalysis();
  },
  
  updateTransaction: (id: string, updates: Partial<Transaction>) => {
    set(state => ({
      transactions: state.transactions.map(tx =>
        tx.id === id ? { ...tx, ...updates } : tx
      )
    }));
    get().applyFilter();
    get().calculateAnalysis();
  },
  
  setFilter: (filter: TransactionFilter) => {
    set({ filter });
    get().applyFilter();
  },
  
  clearFilter: () => {
    set({ filter: {} });
    get().applyFilter();
  },
  
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
  
  setError: (error: string | null) => {
    set({ error });
  },
  
  applyFilter: () => {
    const { transactions, filter } = get();
    const filteredTransactions = applyTransactionFilter(transactions, filter);
    set({ filteredTransactions });
  },
  
  calculateAnalysis: () => {
    const { filteredTransactions } = get();
    const analysis = calculateTransactionAnalysis(filteredTransactions);
    set({ analysis });
  },
  
  calculateMetrics: (walletAddress: string) => {
    const { transactions } = get();
    const metrics = calculateWalletMetrics(transactions, walletAddress);
    set({ metrics });
  }
}));