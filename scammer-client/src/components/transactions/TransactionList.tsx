import { Box, Text, Badge, Card, Flex } from '@radix-ui/themes';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ExclamationTriangleIcon,
  CheckCircledIcon,
  ClockIcon 
} from '@radix-ui/react-icons';
import { Transaction } from '../../types/transactions';

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  showRiskIndicators?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({ 
  transactions, 
  loading = false, 
  showRiskIndicators = false,
  onTransactionClick 
}: TransactionListProps) {
  
  if (loading) {
    return (
      <Flex direction="column" gap="3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} style={{ padding: '16px' }}>
            <Box style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
              <Flex justify="between" align="center" style={{ marginBottom: '8px' }}>
                <Flex align="center" gap="3">
                  <Box style={{ width: '32px', height: '32px', backgroundColor: 'var(--gray-4)', borderRadius: '50%' }}></Box>
                  <Box>
                    <Box style={{ height: '16px', backgroundColor: 'var(--gray-4)', borderRadius: '4px', width: '96px', marginBottom: '4px' }}></Box>
                    <Box style={{ height: '12px', backgroundColor: 'var(--gray-4)', borderRadius: '4px', width: '64px' }}></Box>
                  </Box>
                </Flex>
                <Box style={{ textAlign: 'right' }}>
                  <Box style={{ height: '16px', backgroundColor: 'var(--gray-4)', borderRadius: '4px', width: '80px', marginBottom: '4px' }}></Box>
                  <Box style={{ height: '12px', backgroundColor: 'var(--gray-4)', borderRadius: '4px', width: '48px' }}></Box>
                </Box>
              </Flex>
            </Box>
          </Card>
        ))}
      </Flex>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card style={{ padding: '32px', textAlign: 'center' }}>
        <Text color="gray" size="3">No transactions found</Text>
      </Card>
    );
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send':
        return <ArrowUpIcon style={{ width: '20px', height: '20px', color: 'var(--red-9)' }} />;
      case 'receive':
        return <ArrowDownIcon style={{ width: '20px', height: '20px', color: 'var(--green-9)' }} />;
      case 'contract':
        return <Box style={{ width: '20px', height: '20px', backgroundColor: 'var(--blue-9)', borderRadius: '4px' }}></Box>;
      case 'approval':
        return <CheckCircledIcon style={{ width: '20px', height: '20px', color: 'var(--orange-9)' }} />;
      default:
        return <ClockIcon style={{ width: '20px', height: '20px', color: 'var(--gray-9)' }} />;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return <Badge color="green" size="1">Success</Badge>;
      case 'failed':
        return <Badge color="red" size="1">Failed</Badge>;
      case 'pending':
        return <Badge color="yellow" size="1">Pending</Badge>;
      default:
        return <Badge color="gray" size="1">Unknown</Badge>;
    }
  };

  const getRiskBadge = (riskScore?: number) => {
    if (!riskScore) return null;
    
    if (riskScore >= 70) {
      return <Badge color="red" size="1">High Risk</Badge>;
    } else if (riskScore >= 40) {
      return <Badge color="orange" size="1">Medium Risk</Badge>;
    } else {
      return <Badge color="green" size="1">Low Risk</Badge>;
    }
  };

  const formatAmount = (amount: number, token: string) => {
    if (amount === 0) return '0';
    
    if (amount < 0.001) {
      return `${amount.toExponential(2)} ${token}`;
    }
    
    return `${amount.toFixed(4)} ${token}`;
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Flex direction="column" gap="2">
      {transactions.map((transaction) => (
        <Card 
          key={transaction.id} 
          style={{
            padding: '16px',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s ease-in-out',
            borderLeft: transaction.suspicious ? '4px solid var(--red-9)' : undefined
          }}
          onClick={() => onTransactionClick?.(transaction)}
        >
          <Flex justify="between" align="center">
            {/* Left side - Transaction info */}
            <Flex align="center" gap="3" style={{ flex: 1 }}>
              <Box style={{ flexShrink: 0 }}>
                {getTransactionIcon(transaction.type)}
              </Box>
              
              <Box style={{ flex: 1 }}>
                <Flex align="center" gap="2" style={{ marginBottom: '4px' }}>
                  <Text weight="medium" size="3" style={{ textTransform: 'capitalize' }}>
                    {transaction.type}
                  </Text>
                  {getStatusBadge(transaction.status)}
                  {showRiskIndicators && getRiskBadge(transaction.riskScore)}
                  {transaction.suspicious && (
                    <ExclamationTriangleIcon style={{ width: '16px', height: '16px', color: 'var(--red-9)' }} />
                  )}
                </Flex>
                
                <Flex align="center" gap="2">
                  <Text size="2" color="gray">
                    {transaction.type === 'send' ? 'To:' : 'From:'} {
                      formatAddress(transaction.type === 'send' ? transaction.to : transaction.from)
                    }
                  </Text>
                  <Text size="2" color="gray">•</Text>
                  <Text size="2" color="gray">{formatTimestamp(transaction.timestamp)}</Text>
                </Flex>
              </Box>
            </Flex>

            {/* Right side - Amount and details */}
            <Box style={{ textAlign: 'right', flexShrink: 0 }}>
              <Text 
                weight="bold" 
                size="3" 
                style={{
                  color: transaction.type === 'send' ? 'var(--red-9)' : 'var(--green-9)'
                }}
              >
                {transaction.type === 'send' ? '-' : '+'}
                {formatAmount(transaction.amount, transaction.token)}
              </Text>
              
              <Flex justify="end" align="center" gap="2" style={{ marginTop: '4px' }}>
                {transaction.gasUsed && (
                  <Text size="1" color="gray">
                    Gas: {transaction.gasUsed.toFixed(6)}
                  </Text>
                )}
                {showRiskIndicators && transaction.riskScore && (
                  <Text size="1" color="gray">
                    Risk: {transaction.riskScore}
                  </Text>
                )}
              </Flex>
            </Box>
          </Flex>

          {/* Transaction hash */}
          <Box style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid var(--gray-6)' 
          }}>
            <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
              {transaction.hash}
            </Text>
          </Box>
        </Card>
      ))}
    </Flex>
  );
}
