import { useState, useEffect, useMemo } from 'react';
import { Transaction } from '../types/transactions';

interface SuspiciousPattern {
  type: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  transactions: string[]; // Transaction IDs
  detected: number; // Timestamp
  severity: number; // 1-100
}

interface PatternDetectionResult {
  suspiciousPatterns: SuspiciousPattern[];
  riskScore: number;
  isAnalyzing: boolean;
  lastAnalysis: number;
}

export function usePatternDetection(transactions: Transaction[]): PatternDetectionResult {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(0);

  // Analyze transactions for suspicious patterns
  const analysis = useMemo(() => {
    if (transactions.length === 0) {
      return {
        suspiciousPatterns: [],
        riskScore: 0,
      };
    }

    const patterns: SuspiciousPattern[] = [];
    let totalRiskScore = 0;

    // Pattern 1: Rapid consecutive transactions
    const rapidTransactions = detectRapidTransactions(transactions);
    if (rapidTransactions.length > 0) {
      patterns.push({
        type: 'Rapid Transactions',
        description: `${rapidTransactions.length} transactions within 5 minutes`,
        riskLevel: rapidTransactions.length > 10 ? 'critical' : 'high',
        transactions: rapidTransactions.map(tx => tx.id),
        detected: Date.now(),
        severity: Math.min(rapidTransactions.length * 10, 100),
      });
      totalRiskScore += Math.min(rapidTransactions.length * 5, 30);
    }

    // Pattern 2: Large amount transfers
    const largeTransfers = detectLargeTransfers(transactions);
    if (largeTransfers.length > 0) {
      patterns.push({
        type: 'Large Value Transfers',
        description: `${largeTransfers.length} transactions over 1000 SUI`,
        riskLevel: 'high',
        transactions: largeTransfers.map(tx => tx.id),
        detected: Date.now(),
        severity: 70,
      });
      totalRiskScore += 25;
    }

    // Pattern 3: Failed transaction spikes
    const failedSpike = detectFailedTransactionSpike(transactions);
    if (failedSpike.length > 3) {
      patterns.push({
        type: 'Failed Transaction Spike',
        description: `${failedSpike.length} failed transactions detected`,
        riskLevel: 'medium',
        transactions: failedSpike.map(tx => tx.id),
        detected: Date.now(),
        severity: 50,
      });
      totalRiskScore += 15;
    }

    // Pattern 4: Unusual contract interactions
    const unusualContracts = detectUnusualContractInteractions(transactions);
    if (unusualContracts.length > 0) {
      patterns.push({
        type: 'Unusual Contract Activity',
        description: `Multiple interactions with unknown contracts`,
        riskLevel: 'medium',
        transactions: unusualContracts.map(tx => tx.id),
        detected: Date.now(),
        severity: 40,
      });
      totalRiskScore += 20;
    }

    // Pattern 5: Round amount patterns (potential bot activity)
    const roundAmounts = detectRoundAmountPattern(transactions);
    if (roundAmounts.length > 5) {
      patterns.push({
        type: 'Automated Transaction Pattern',
        description: `${roundAmounts.length} transactions with round amounts`,
        riskLevel: 'low',
        transactions: roundAmounts.map(tx => tx.id),
        detected: Date.now(),
        severity: 25,
      });
      totalRiskScore += 10;
    }

    return {
      suspiciousPatterns: patterns,
      riskScore: Math.min(totalRiskScore, 100),
    };
  }, [transactions]);

  // Simulate analysis delay
  useEffect(() => {
    if (transactions.length > 0) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        setIsAnalyzing(false);
        setLastAnalysis(Date.now());
      }, 2000); // 2 second analysis delay

      return () => clearTimeout(timer);
    }
  }, [transactions]);

  return {
    ...analysis,
    isAnalyzing,
    lastAnalysis,
  };
}

// Pattern detection helper functions
function detectRapidTransactions(transactions: Transaction[]): Transaction[] {
  const sortedTxs = [...transactions].sort((a, b) => b.timestamp - a.timestamp);
  const rapidTxs: Transaction[] = [];
  const fiveMinutes = 5 * 60 * 1000;

  for (let i = 0; i < sortedTxs.length - 1; i++) {
    const current = sortedTxs[i];
    const next = sortedTxs[i + 1];
    
    if (current.timestamp - next.timestamp < fiveMinutes) {
      if (!rapidTxs.includes(current)) rapidTxs.push(current);
      if (!rapidTxs.includes(next)) rapidTxs.push(next);
    }
  }

  return rapidTxs;
}

function detectLargeTransfers(transactions: Transaction[]): Transaction[] {
  return transactions.filter(tx => 
    tx.amount > 1000 && (tx.type === 'send' || tx.type === 'receive')
  );
}

function detectFailedTransactionSpike(transactions: Transaction[]): Transaction[] {
  return transactions.filter(tx => tx.status === 'failed');
}

function detectUnusualContractInteractions(transactions: Transaction[]): Transaction[] {
  const contractTxs = transactions.filter(tx => tx.type === 'contract');
  // Simple heuristic: if more than 30% of transactions are contract interactions
  return contractTxs.length > transactions.length * 0.3 ? contractTxs : [];
}

function detectRoundAmountPattern(transactions: Transaction[]): Transaction[] {
  return transactions.filter(tx => {
    const amount = tx.amount;
    return amount > 0 && amount % 1 === 0 && amount % 10 === 0; // Round numbers divisible by 10
  });
}