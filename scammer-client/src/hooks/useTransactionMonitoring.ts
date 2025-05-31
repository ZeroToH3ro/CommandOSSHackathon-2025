import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '../types/transactions';

interface TransactionMonitoringResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: Error | null;
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  refetch: () => void;
}

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export function useTransactionMonitoring(
  walletAddress?: string,
  timeRange: string = '24h'
): TransactionMonitoringResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Calculate time range in milliseconds
  const getTimeRangeMs = (range: string) => {
    const now = Date.now();
    switch (range) {
      case '1h':
        return now - (60 * 60 * 1000);
      case '24h':
        return now - (24 * 60 * 60 * 1000);
      case '7d':
        return now - (7 * 24 * 60 * 60 * 1000);
      default:
        return now - (24 * 60 * 60 * 1000);
    }
  };

  // Query to fetch transactions from Sui
  const { data: suiTransactions, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', walletAddress, timeRange],
    queryFn: async () => {
      if (!walletAddress) return [];

      try {
        // Get transactions for the wallet
        const [sentTxs, receivedTxs] = await Promise.all([
          suiClient.queryTransactionBlocks({
            filter: { FromAddress: walletAddress },
            limit: 50,
            order: 'descending',
            options: {
              showInput: true,
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
              showBalanceChanges: true,
            },
          }),
          suiClient.queryTransactionBlocks({
            filter: { ToAddress: walletAddress },
            limit: 50,
            order: 'descending',
            options: {
              showInput: true,
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
              showBalanceChanges: true,
            },
          }),
        ]);

        // Process and normalize transactions
        const allTxs = [...sentTxs.data, ...receivedTxs.data];
        const uniqueTxs = allTxs.filter(
          (tx, index, self) => index === self.findIndex(t => t.digest === tx.digest)
        );

        const processedTransactions: Transaction[] = uniqueTxs.map(tx => {
          const balanceChanges = tx.balanceChanges || [];
          const timestamp = parseInt(tx.timestampMs || '0');
          
          // Determine transaction type and amount
          let type: Transaction['type'] = 'contract';
          let amount = 0;
          let token = 'SUI';
          
          // Find relevant balance change for this wallet
          const relevantChange = balanceChanges.find(change => 
            change.owner === walletAddress || 
            (typeof change.owner === 'object' && 'AddressOwner' in change.owner && 
             change.owner.AddressOwner === walletAddress)
          );

          if (relevantChange) {
            amount = Math.abs(parseInt(relevantChange.amount)) / 1e9; // Convert from MIST to SUI
            type = parseInt(relevantChange.amount) < 0 ? 'send' : 'receive';
            token = relevantChange.coinType?.split('::').pop() || 'SUI';
          }

          // Check for contract interactions
          if (tx.transaction?.data.transaction.kind === 'ProgrammableTransaction') {
            const programmableTx = tx.transaction.data.transaction;
            if (programmableTx.transactions.some(t => 'MoveCall' in t)) {
              type = 'contract';
            }
          }

          return {
            id: tx.digest,
            hash: tx.digest,
            type,
            amount,
            token,
            timestamp,
            status: tx.effects?.status?.status === 'success' ? 'success' : 'failed',
            from: tx.transaction?.data.sender || '',
            to: '', // We'll need to parse this from transaction data
            gasUsed: tx.effects?.gasUsed ? 
              (parseInt(tx.effects.gasUsed.computationCost) + 
               parseInt(tx.effects.gasUsed.storageCost)) / 1e9 : 0,
            riskScore: Math.floor(Math.random() * 100), // Placeholder - will be calculated by pattern detection
            suspicious: false, // Will be determined by pattern detection
          };
        });

        // Filter by time range
        const startTime = getTimeRangeMs(timeRange);
        return processedTransactions.filter(tx => tx.timestamp >= startTime);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update local state when query data changes
  useEffect(() => {
    if (suiTransactions) {
      setTransactions(suiTransactions);
    }
  }, [suiTransactions]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const successfulTxs = transactions.filter(tx => tx.status === 'success').length;
    const successRate = totalTransactions > 0 ? successfulTxs / totalTransactions : 0;

    return {
      totalTransactions,
      totalVolume,
      successRate,
    };
  }, [transactions]);

  return {
    transactions,
    isLoading,
    error,
    refetch,
    ...metrics,
  };
}