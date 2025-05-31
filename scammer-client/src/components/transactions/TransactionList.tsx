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
      <Box className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <Box className="animate-pulse">
              <Flex justify="between" align="center" className="mb-2">
                <Box className="flex items-center space-x-3">
                  <Box className="w-8 h-8 bg-gray-200 rounded-full"></Box>
                  <Box>
                    <Box className="h-4 bg-gray-200 rounded w-24 mb-1"></Box>
                    <Box className="h-3 bg-gray-200 rounded w-16"></Box>
                  </Box>
                </Box>
                <Box className="text-right">
                  <Box className="h-4 bg-gray-200 rounded w-20 mb-1"></Box>
                  <Box className="h-3 bg-gray-200 rounded w-12"></Box>
                </Box>
              </Flex>
            </Box>
          </Card>
        ))}
      </Box>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Text color="gray" size="3">No transactions found</Text>
      </Card>
    );
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send':
        return <ArrowUpIcon className="w-5 h-5 text-red-500" />;
      case 'receive':
        return <ArrowDownIcon className="w-5 h-5 text-green-500" />;
      case 'contract':
        return <Box className="w-5 h-5 bg-blue-500 rounded"></Box>;
      case 'approval':
        return <CheckCircledIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
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
    <Box className="space-y-2">
      {transactions.map((transaction) => (
        <Card 
          key={transaction.id} 
          className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
            transaction.suspicious ? 'border-l-4 border-l-red-500' : ''
          }`}
          onClick={() => onTransactionClick?.(transaction)}
        >
          <Flex justify="between" align="center">
            {/* Left side - Transaction info */}
            <Flex align="center" gap="3" className="flex-1">
              <Box className="flex-shrink-0">
                {getTransactionIcon(transaction.type)}
              </Box>
              
              <Box className="flex-1">
                <Flex align="center" gap="2" className="mb-1">
                  <Text weight="medium" size="3" className="capitalize">
                    {transaction.type}
                  </Text>
                  {getStatusBadge(transaction.status)}
                  {showRiskIndicators && getRiskBadge(transaction.riskScore)}
                  {transaction.suspicious && (
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                  )}
                </Flex>
                
                <Flex align="center" gap="2" className="text-sm text-gray-500">
                  <Text size="2">
                    {transaction.type === 'send' ? 'To:' : 'From:'} {
                      formatAddress(transaction.type === 'send' ? transaction.to : transaction.from)
                    }
                  </Text>
                  <Text size="2">•</Text>
                  <Text size="2">{formatTimestamp(transaction.timestamp)}</Text>
                </Flex>
              </Box>
            </Flex>

            {/* Right side - Amount and details */}
            <Box className="text-right flex-shrink-0">
              <Text 
                weight="bold" 
                size="3" 
                className={
                  transaction.type === 'send' ? 'text-red-600' : 'text-green-600'
                }
              >
                {transaction.type === 'send' ? '-' : '+'}
                {formatAmount(transaction.amount, transaction.token)}
              </Text>
              
              <Flex justify="end" align="center" gap="2" className="mt-1">
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

          {/* Transaction hash (optional, shown on hover or click) */}
          <Box className="mt-2 pt-2 border-t border-gray-100">
            <Text size="1" color="gray" className="font-mono">
              {transaction.hash}
            </Text>
          </Box>
        </Card>
      ))}
    </Box>
  );
}
