import { useState, useEffect, useCallback } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { ScamDetectorClient, WalletRiskInfo } from '../lib/scamDetectorClient';
import { CONTRACT_CONFIG, getRiskLevel } from '../config/contract';

export interface AlertData {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  // Contract specific fields
  sender?: string;
  recipient?: string;
  amount?: string;
  riskScore?: number;
  txDigest?: string;
}

export interface PatternData {
  id: string;
  walletAddress: string;
  patternType: number;
  patternName: string;
  riskLevel: number;
  description: string;
  riskScore: number;
  detectedAt: number;
}

export interface TransactionData {
  id: string;
  sender: string;
  recipient: string;
  amount: string;
  transactionType: number;
  riskFactors: number[];
  finalRiskScore: number;
  timestamp: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export function useScamDetector() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [patterns, setPatterns] = useState<PatternData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [monitoringWallets, setMonitoringWallets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [contractDeployed, setContractDeployed] = useState(false);
  const [adminAddress, setAdminAddress] = useState<string>('');

  const suiClient = useSuiClient();
  const scamDetectorClient = new ScamDetectorClient(suiClient);

  // Check if contract is deployed and fetch admin address
  useEffect(() => {
    const isDeployed = CONTRACT_CONFIG.PACKAGE_ID !== "0x0" && CONTRACT_CONFIG.DETECTOR_STATE_ID !== "0x0";
    setContractDeployed(isDeployed);
    
    if (!isDeployed) {
      console.warn("Scam detector contract not deployed. Please deploy the contract and update the configuration.");
    } else {
      // Fetch admin address when contract is deployed
      fetchAdminAddress();
    }
  }, []);

  // Fetch admin address from contract
  const fetchAdminAddress = useCallback(async () => {
    if (!contractDeployed) return;
    
    try {
      const admin = await scamDetectorClient.getAdmin();
      setAdminAddress(admin);
    } catch (error) {
      console.error('Error fetching admin address:', error);
    }
  }, [contractDeployed, scamDetectorClient]);

  // Subscribe to contract events
  useEffect(() => {
    if (!contractDeployed) return;

    const unsubscribe = scamDetectorClient.subscribeToEvents((event) => {
      console.log('Contract event received:', event);
      
      try {
        // Handle ScamAlert events
        if (event.type.includes('ScamAlert')) {
          const alertData: AlertData = {
            id: `alert-${Date.now()}-${Math.random()}`,
            type: 'error',
            title: 'High Risk Transaction Detected',
            message: `Transaction with risk score ${event.parsedJson.risk_score} detected`,
            timestamp: parseInt(event.parsedJson.timestamp) || Date.now(),
            severity: getSeverityFromScore(event.parsedJson.risk_score),
            sender: event.parsedJson.sender,
            recipient: event.parsedJson.recipient,
            amount: event.parsedJson.amount,
            riskScore: event.parsedJson.risk_score,
            txDigest: event.parsedJson.tx_digest,
          };
          
          setAlerts(prev => [alertData, ...prev.slice(0, 99)]); // Keep last 100
        }
        
        // Handle SuspiciousPatternDetected events
        if (event.type.includes('SuspiciousPatternDetected')) {
          const patternData: PatternData = {
            id: `pattern-${Date.now()}-${Math.random()}`,
            walletAddress: event.parsedJson.wallet_address,
            patternType: event.parsedJson.pattern_type,
            patternName: getPatternName(event.parsedJson.pattern_type),
            riskLevel: event.parsedJson.risk_level,
            description: event.parsedJson.description,
            riskScore: event.parsedJson.risk_score,
            detectedAt: parseInt(event.parsedJson.detected_at) || Date.now(),
          };
          
          setPatterns(prev => [patternData, ...prev.slice(0, 99)]);
        }
        
        // Handle TransactionAnalyzed events
        if (event.type.includes('TransactionAnalyzed')) {
          const txData: TransactionData = {
            id: `tx-${Date.now()}-${Math.random()}`,
            sender: event.parsedJson.sender,
            recipient: event.parsedJson.recipient,
            amount: event.parsedJson.amount,
            transactionType: event.parsedJson.transaction_type,
            riskFactors: event.parsedJson.risk_factors || [],
            finalRiskScore: event.parsedJson.final_risk_score,
            timestamp: parseInt(event.parsedJson.timestamp) || Date.now(),
            riskLevel: getRiskLevel(event.parsedJson.final_risk_score),
          };
          
          setTransactions(prev => [txData, ...prev.slice(0, 99)]);
        }

        // Handle WalletMonitoringUpdate events
        if (event.type.includes('WalletMonitoringUpdate')) {
          const walletAddress = event.parsedJson.wallet_address;
          const isWatching = event.parsedJson.is_watching;
          
          setMonitoringWallets(prev => {
            const newSet = new Set(prev);
            if (isWatching) {
              newSet.add(walletAddress);
            } else {
              newSet.delete(walletAddress);
            }
            return newSet;
          });
        }
      } catch (error) {
        console.error('Error processing contract event:', error, event);
      }
    });

    return () => {
      if (unsubscribe instanceof Promise) {
        unsubscribe.then(unsub => unsub());
      } else {
        unsubscribe?.();
      }
    };
  }, [contractDeployed, scamDetectorClient]);

  // Check wallet risk
  const checkWalletRisk = useCallback(async (walletAddress: string): Promise<WalletRiskInfo> => {
    if (!contractDeployed) {
      return {
        riskScore: 0,
        isScammer: false,
        isWhitelisted: false,
        transactionCount: 0,
        riskLevel: 'low',
      };
    }

    setLoading(true);
    try {
      return await scamDetectorClient.getWalletRiskInfo(walletAddress);
    } catch (error) {
      console.error('Error checking wallet risk:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contractDeployed, scamDetectorClient]);

  // Analyze transaction (returns transaction object for signing)
  const analyzeTransaction = useCallback(async (
    sender: string,
    recipient: string,
    amount: string,
    txType?: number
  ) => {
    if (!contractDeployed) {
      throw new Error("Contract not deployed");
    }

    setLoading(true);
    try {
      return await scamDetectorClient.analyzeTransaction(sender, recipient, amount, txType);
    } catch (error) {
      console.error('Error analyzing transaction:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contractDeployed, scamDetectorClient]);

  // Add scammer addresses
  const addScammerAddresses = useCallback((addresses: string[]) => {
    if (!contractDeployed) {
      throw new Error("Contract not deployed");
    }
    return scamDetectorClient.addScammerAddresses(addresses);
  }, [contractDeployed, scamDetectorClient]);

  // Add whitelisted addresses
  const addWhitelistedAddresses = useCallback((addresses: string[]) => {
    if (!contractDeployed) {
      throw new Error("Contract not deployed");
    }
    return scamDetectorClient.addWhitelistedAddresses(addresses);
  }, [contractDeployed, scamDetectorClient]);

  // Start monitoring wallet
  const startMonitoring = useCallback((walletAddress: string) => {
    if (!contractDeployed) {
      throw new Error("Contract not deployed");
    }
    return scamDetectorClient.startWalletMonitoring(walletAddress);
  }, [contractDeployed, scamDetectorClient]);

  // Stop monitoring wallet
  const stopMonitoring = useCallback((walletAddress: string) => {
    if (!contractDeployed) {
      throw new Error("Contract not deployed");
    }
    return scamDetectorClient.stopWalletMonitoring(walletAddress);
  }, [contractDeployed, scamDetectorClient]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Dismiss specific alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  return {
    // Data
    alerts,
    patterns,
    transactions,
    monitoringWallets: Array.from(monitoringWallets),
    
    // State
    loading,
    contractDeployed,
    adminAddress,
    
    // Actions
    checkWalletRisk,
    analyzeTransaction,
    addScammerAddresses,
    addWhitelistedAddresses,
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    dismissAlert,
    fetchAdminAddress,
  };
}

// Helper functions
function getSeverityFromScore(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.HIGH) return 'high';
  if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

function getPatternName(patternType: number): string {
  switch (patternType) {
    case CONTRACT_CONFIG.PATTERN_TYPES.RAPID_TRANSACTIONS:
      return 'Rapid Transactions';
    case CONTRACT_CONFIG.PATTERN_TYPES.LARGE_TRANSFER:
      return 'Large Transfer';
    case CONTRACT_CONFIG.PATTERN_TYPES.UNUSUAL_CONTRACT:
      return 'Unusual Contract Activity';
    case CONTRACT_CONFIG.PATTERN_TYPES.FAILED_SPIKE:
      return 'Failed Transaction Spike';
    case CONTRACT_CONFIG.PATTERN_TYPES.ROUND_AMOUNTS:
      return 'Round Amount Pattern';
    case CONTRACT_CONFIG.PATTERN_TYPES.NEW_ADDRESS:
      return 'New Address Activity';
    case CONTRACT_CONFIG.PATTERN_TYPES.BLACKLISTED_ADDRESS:
      return 'Blacklisted Address';
    default:
      return 'Unknown Pattern';
  }
}
