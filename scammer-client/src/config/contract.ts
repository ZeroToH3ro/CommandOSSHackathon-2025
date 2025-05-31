export const CONTRACT_CONFIG = {
  // Replace with your actual deployed values after deployment
  PACKAGE_ID: import.meta.env.VITE_PACKAGE_ID || "0x9b53189a196c6ec15307b3e785dee73c8874f00383cbe8f825b9be5a9c0c3a27", // Deployed detector AI package
  DETECTOR_STATE_ID: import.meta.env.VITE_DETECTOR_STATE_ID || "0xd1a7e960346b2c57daf13df5d717bbfa4b5da760468477ecb414b87108a00fdf", // Detector AI state object
  
  // Network configuration
  NETWORK: (import.meta.env.VITE_NETWORK as 'testnet' | 'devnet' | 'mainnet') || 'devnet',
  
  // Contract constants (matching your Move contract)
  ALERT_TYPES: {
    SECURITY: 1,
    WARNING: 2,
    INFO: 3,
    ERROR: 4,
  } as const,
  
  PATTERN_TYPES: {
    RAPID_TRANSACTIONS: 1,
    LARGE_TRANSFER: 2,
    UNUSUAL_CONTRACT: 3,
    FAILED_SPIKE: 4,
    ROUND_AMOUNTS: 5,
    NEW_ADDRESS: 6,
    BLACKLISTED_ADDRESS: 7,
  } as const,
  
  TX_TYPES: {
    SEND: 1,
    RECEIVE: 2,
    CONTRACT: 3,
    APPROVAL: 4,
  } as const,
  
  RISK_THRESHOLDS: {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 90,
  } as const,
  
  // Default risk thresholds (matching contract init)
  DEFAULT_RISK_THRESHOLDS: {
    rapid_transaction_threshold: 300000, // 5 minutes in ms
    large_transfer_threshold: 1000000000000, // 1000 SUI in MIST
    failed_transaction_threshold: 3,
    contract_interaction_threshold: 70,
    round_amount_threshold: 5,
    unusual_time_threshold: 6,
  } as const,
};

export type AlertType = keyof typeof CONTRACT_CONFIG.ALERT_TYPES;
export type PatternType = keyof typeof CONTRACT_CONFIG.PATTERN_TYPES;
export type TxType = keyof typeof CONTRACT_CONFIG.TX_TYPES;
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function getRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.HIGH) return 'high';
  if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

export function formatAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(amount: number | string): string {
  const amountNum = typeof amount === 'string' ? parseInt(amount) : amount;
  return (amountNum / 1e9).toFixed(2); // Convert MIST to SUI
}
