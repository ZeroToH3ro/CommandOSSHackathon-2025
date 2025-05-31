export interface Transaction {
  id: string;
  hash: string;
  type: 'send' | 'receive' | 'contract' | 'approval';
  amount: number;
  token: string;
  timestamp: number;
  status: 'success' | 'failed' | 'pending' | 'confirmed';
  from: string;
  to: string;
  gasUsed?: number;
  gasPrice?: number;
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  suspicious?: boolean;
  blockNumber?: number;
  confirmations?: number;
  fee?: number;
  data?: string;
  digest?: string;
  checkpoint?: string; 
  approvalDetails?: {
    token: string;
    spender: string;
    amount: string | 'unlimited';
  };
  contractDetails?: {
    address: string;
    function: string;
    parameters?: any[];
  };
}

export interface Alert {
  id: string;
  type: 'security' | 'warning' | 'info' | 'success' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  read?: boolean;
  autoClose?: boolean;
  duration?: number;
  data?: {
    pattern?: SuspiciousActivity;
    walletAddress?: string;
    transactionId?: string;
    amount?: number;
    [key: string]: any;
  };
}

export interface TransactionFilter {
  type?: Transaction['type'][];
  status?: Transaction['status'][];
  timeRange?: {
    start: number;
    end: number;
  };
  amountRange?: {
    min?: number;
    max?: number;
  };
  riskScore?: {
    min?: number;
    max?: number;
  };
  onlySuspicious?: boolean;
  tokens?: string[];
  addresses?: string[];
}

export interface TransactionAnalysis {
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  averageGasUsed: number;
  suspiciousCount: number;
  averageRiskScore: number;
  transactionsByType: Record<Transaction['type'], number>;
  transactionsByStatus: Record<Transaction['status'], number>;
  topTokens: Array<{
    token: string;
    count: number;
    volume: number;
  }>;
  timeDistribution: Array<{
    hour: number;
    count: number;
    volume: number;
  }>;
}

export interface SuspiciousActivity {
  id: string;
  type: 'rapid_transactions' | 'large_transfer' | 'unusual_contract' | 'failed_spike' | 'round_amounts' | 'new_address' | 'blacklisted_address';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  transactionIds: string[];
  detectedAt: number;
  riskScore: number;
  metadata?: Record<string, any>;
}

export interface RiskAssessment {
  overall: number;
  factors: Array<{
    factor: string;
    score: number;
    weight: number;
    description: string;
  }>;
  recommendations: string[];
  lastUpdated: number;
}

export interface WalletMetrics {
  address: string;
  totalTransactions: number;
  totalSent: number;
  totalReceived: number;
  netBalance: number;
  avgTransactionSize: number;
  mostActiveDay: string;
  firstTransaction: number;
  lastTransaction: number;
  uniqueAddresses: number;
  contractInteractions: number;
  failureRate: number;
}

// Utility types for transaction processing
export interface SuiTransactionBlock {
  digest: string;
  timestampMs: string;
  transaction: {
    data: {
      sender: string;
      transaction: {
        kind: string;
        inputs?: any[];
        transactions?: any[];
      };
    };
  };
  effects?: {
    status: {
      status: 'success' | 'failure';
      error?: string;
    };
    gasUsed: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
      nonRefundableStorageFee: string;
    };
    created?: any[];
    mutated?: any[];
    deleted?: any[];
    dependencies?: string[];
  };
  balanceChanges?: Array<{
    owner: string | { AddressOwner: string };
    coinType: string;
    amount: string;
  }>;
  objectChanges?: any[];
  events?: any[];
  checkpoint?: string;
}

// Pattern detection types
export interface PatternDetectionConfig {
  rapidTransactionThreshold: number; // minutes
  largeTransferThreshold: number; // SUI amount
  failedTransactionThreshold: number; // count
  contractInteractionThreshold: number; // percentage
  roundAmountThreshold: number; // count
  unusualTimeThreshold: number; // hours (unusual activity outside normal hours)
  newAddressRiskWindow: number; // hours
}

export interface DetectionPattern {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  config: Record<string, any>;
  detector: (transactions: Transaction[], config: any) => SuspiciousActivity[];
}

// Transaction enrichment types
export interface AddressInfo {
  address: string;
  label?: string;
  isContract: boolean;
  isKnown: boolean;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  firstSeen: number;
  lastSeen: number;
  transactionCount: number;
}

export interface TokenInfo {
  type: string;
  symbol: string;
  name: string;
  decimals: number;
  verified: boolean;
  logoUrl?: string;
  description?: string;
}

// Export default pattern detection config
export const DEFAULT_PATTERN_CONFIG: PatternDetectionConfig = {
  rapidTransactionThreshold: 5, // 5 minutes
  largeTransferThreshold: 1000, // 1000 SUI
  failedTransactionThreshold: 3, // 3 failed transactions
  contractInteractionThreshold: 30, // 30% of transactions
  roundAmountThreshold: 5, // 5 round amount transactions
  unusualTimeThreshold: 2, // transactions between 2-6 AM
  newAddressRiskWindow: 24, // 24 hours
};

// Utility functions for transaction processing
export function normalizeTransaction(
  suiTx: SuiTransactionBlock,
  walletAddress: string
): Transaction {
  const balanceChanges = suiTx.balanceChanges || [];
  const timestamp = parseInt(suiTx.timestampMs || '0');
  
  // Determine transaction type and amount
  let type: Transaction['type'] = 'contract';
  let amount = 0;
  let token = 'SUI';
  let to = '';
  
  // Find relevant balance change for this wallet
  const relevantChange = balanceChanges.find(change => {
    const owner = typeof change.owner === 'string' 
      ? change.owner 
      : change.owner.AddressOwner;
    return owner === walletAddress;
  });

  if (relevantChange) {
    amount = Math.abs(parseInt(relevantChange.amount)) / 1e9; // Convert from MIST to SUI
    type = parseInt(relevantChange.amount) < 0 ? 'send' : 'receive';
    token = relevantChange.coinType?.split('::').pop() || 'SUI';
  }

  // Check for contract interactions
  if (suiTx.transaction?.data.transaction.kind === 'ProgrammableTransaction') {
    type = 'contract';
  }

  // Determine 'to' address for send transactions
  if (type === 'send') {
    const otherChange = balanceChanges.find(change => {
      const owner = typeof change.owner === 'string' 
        ? change.owner 
        : change.owner.AddressOwner;
      return owner !== walletAddress && parseInt(change.amount) > 0;
    });
    
    if (otherChange) {
      to = typeof otherChange.owner === 'string' 
        ? otherChange.owner 
        : otherChange.owner.AddressOwner;
    }
  }

  return {
    id: suiTx.digest,
    hash: suiTx.digest,
    type,
    amount,
    token,
    timestamp,
    status: suiTx.effects?.status?.status === 'success' ? 'success' : 'failed',
    from: suiTx.transaction?.data.sender || '',
    to,
    gasUsed: suiTx.effects?.gasUsed ? 
      (parseInt(suiTx.effects.gasUsed.computationCost) + 
       parseInt(suiTx.effects.gasUsed.storageCost)) / 1e9 : 0,
    digest: suiTx.digest,
    checkpoint: suiTx.checkpoint,
  };
}

export function calculateTransactionAnalysis(transactions: Transaction[]): TransactionAnalysis {
  const totalTransactions = transactions.length;
  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const successfulTxs = transactions.filter(tx => tx.status === 'success');
  const successRate = totalTransactions > 0 ? successfulTxs.length / totalTransactions : 0;
  const totalGasUsed = transactions.reduce((sum, tx) => sum + (tx.gasUsed || 0), 0);
  const averageGasUsed = totalTransactions > 0 ? totalGasUsed / totalTransactions : 0;
  const suspiciousCount = transactions.filter(tx => tx.suspicious).length;
  const totalRiskScore = transactions.reduce((sum, tx) => sum + (tx.riskScore || 0), 0);
  const averageRiskScore = totalTransactions > 0 ? totalRiskScore / totalTransactions : 0;

  // Count by type
  const transactionsByType = transactions.reduce((acc, tx) => {
    acc[tx.type] = (acc[tx.type] || 0) + 1;
    return acc;
  }, {} as Record<Transaction['type'], number>);

  // Count by status
  const transactionsByStatus = transactions.reduce((acc, tx) => {
    acc[tx.status] = (acc[tx.status] || 0) + 1;
    return acc;
  }, {} as Record<Transaction['status'], number>);

  // Top tokens
  const tokenStats = transactions.reduce((acc, tx) => {
    if (!acc[tx.token]) {
      acc[tx.token] = { count: 0, volume: 0 };
    }
    acc[tx.token].count++;
    acc[tx.token].volume += tx.amount;
    return acc;
  }, {} as Record<string, { count: number; volume: number }>);

  const topTokens = Object.entries(tokenStats)
    .map(([token, stats]) => ({ token, ...stats }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);

  // Time distribution (by hour)
  const timeDistribution = Array.from({ length: 24 }, (_, hour) => {
    const hourTxs = transactions.filter(tx => 
      new Date(tx.timestamp).getHours() === hour
    );
    return {
      hour,
      count: hourTxs.length,
      volume: hourTxs.reduce((sum, tx) => sum + tx.amount, 0),
    };
  });

  return {
    totalTransactions,
    totalVolume,
    successRate,
    averageGasUsed,
    suspiciousCount,
    averageRiskScore,
    transactionsByType,
    transactionsByStatus,
    topTokens,
    timeDistribution,
  };
}