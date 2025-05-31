import React, { useState, useEffect } from 'react';
import { Card, Flex, Text, Badge, Button, Box } from '@radix-ui/themes';
import { 
  ActivityLogIcon, 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CheckCircledIcon,
  UpdateIcon
} from '@radix-ui/react-icons';
import { Transaction } from '../../types/transactions';

interface TransactionMonitorProps {
  transactions: Transaction[];
  refreshInterval?: number;
  onNewTransaction?: (transaction: Transaction) => void;
}

export const TransactionMonitor: React.FC<TransactionMonitorProps> = ({
  transactions,
  refreshInterval = 30000,
  onNewTransaction
}) => {
  const [lastTransactionCount, setLastTransactionCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Monitor for new transactions
  useEffect(() => {
    if (transactions.length > lastTransactionCount) {
      const newTransactions = transactions.slice(lastTransactionCount);
      newTransactions.forEach(tx => {
        onNewTransaction?.(tx);
      });
      setLastTransactionCount(transactions.length);
      setLastUpdate(new Date());
    }
  }, [transactions, lastTransactionCount, onNewTransaction]);

  // Update monitoring status
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getRecentTransactions = () => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return transactions.filter(tx => tx.timestamp >= fiveMinutesAgo);
  };

  const getSuspiciousTransactions = () => {
    return transactions.filter(tx => tx.suspicious || (tx.riskScore && tx.riskScore > 70));
  };

  const getFailedTransactions = () => {
    return transactions.filter(tx => tx.status === 'failed');
  };

  const recentTransactions = getRecentTransactions();
  const suspiciousTransactions = getSuspiciousTransactions();
  const failedTransactions = getFailedTransactions();

  return (
    <Card>
      <Flex p="4" direction="column" gap="4">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <ActivityLogIcon style={{ width: '20px', height: '20px' }} />
            <Text size="5" weight="bold">Transaction Monitor</Text>
          </Flex>
          <Flex align="center" gap="2">
            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box 
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isMonitoring ? 'var(--green-9)' : 'var(--gray-6)',
                  animation: isMonitoring ? 'pulse 2s infinite' : 'none'
                }}
              />
              <Text size="2" color="gray">
                {isMonitoring ? 'Monitoring' : 'Paused'}
              </Text>
            </Box>
            <Button 
              variant="ghost" 
              size="1"
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? 'Pause' : 'Resume'}
            </Button>
          </Flex>
        </Flex>

        {/* Stats Grid */}
        <Flex gap="4" wrap="wrap">
          <Box style={{ flex: 1, minWidth: '200px' }}>
            <Card variant="surface">
              <Flex p="3" direction="column" align="center">
                <Text size="6" weight="bold" color="blue">
                  {transactions.length}
                </Text>
                <Text size="2" color="gray">Total Transactions</Text>
              </Flex>
            </Card>
          </Box>

          <Box style={{ flex: 1, minWidth: '200px' }}>
            <Card variant="surface">
              <Flex p="3" direction="column" align="center">
                <Text size="6" weight="bold" color="green">
                  {recentTransactions.length}
                </Text>
                <Text size="2" color="gray">Recent (5 min)</Text>
              </Flex>
            </Card>
          </Box>

          <Box style={{ flex: 1, minWidth: '200px' }}>
            <Card variant="surface">
              <Flex p="3" direction="column" align="center">
                <Text size="6" weight="bold" color="orange">
                  {suspiciousTransactions.length}
                </Text>
                <Text size="2" color="gray">Suspicious</Text>
              </Flex>
            </Card>
          </Box>

          <Box style={{ flex: 1, minWidth: '200px' }}>
            <Card variant="surface">
              <Flex p="3" direction="column" align="center">
                <Text size="6" weight="bold" color="red">
                  {failedTransactions.length}
                </Text>
                <Text size="2" color="gray">Failed</Text>
              </Flex>
            </Card>
          </Box>
        </Flex>

        {/* Recent Activity */}
        <Box>
          <Text weight="medium" mb="3">Recent Activity</Text>
          {recentTransactions.length > 0 ? (
            <Flex direction="column" gap="2">
              {recentTransactions.slice(0, 5).map((tx) => (
                <Flex 
                  key={tx.id} 
                  justify="between" 
                  align="center" 
                  p="3"
                  style={{ 
                    backgroundColor: tx.suspicious ? 'var(--red-2)' : 'var(--gray-2)', 
                    borderRadius: '6px',
                    border: tx.suspicious ? '1px solid var(--red-6)' : '1px solid var(--gray-4)'
                  }}
                >
                  <Flex align="center" gap="3">
                    {tx.status === 'success' ? (
                      <CheckCircledIcon style={{ width: '16px', height: '16px', color: 'var(--green-9)' }} />
                    ) : tx.status === 'failed' ? (
                      <ExclamationTriangleIcon style={{ width: '16px', height: '16px', color: 'var(--red-9)' }} />
                    ) : (
                      <UpdateIcon style={{ width: '16px', height: '16px', color: 'var(--orange-9)' }} />
                    )}
                    
                    <Box>
                      <Text size="2" weight="medium">
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} • {tx.amount.toFixed(4)} {tx.token}
                      </Text>
                      <Text size="1" color="gray">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </Text>
                    </Box>
                  </Flex>

                  <Flex align="center" gap="2">
                    {tx.suspicious && (
                      <Badge color="red" size="1">Suspicious</Badge>
                    )}
                    <Badge 
                      color={
                        tx.status === 'success' ? 'green' :
                        tx.status === 'failed' ? 'red' : 'orange'
                      }
                      size="1"
                    >
                      {tx.status}
                    </Badge>
                  </Flex>
                </Flex>
              ))}
            </Flex>
          ) : (
            <Flex align="center" justify="center" p="6" style={{ backgroundColor: 'var(--gray-2)', borderRadius: '8px' }}>
              <Text size="2" color="gray">No recent transactions</Text>
            </Flex>
          )}
        </Box>

        {/* Last Update */}
        <Flex justify="center" align="center" gap="2" pt="2">
          <ClockIcon style={{ width: '12px', height: '12px', color: 'var(--gray-9)' }} />
          <Text size="1" color="gray">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};