import React from 'react';
import { Card, Flex, Text, Badge, Button, Heading, Container, Box, Separator } from '@radix-ui/themes';
import { Transaction } from '../../types/transactions';

interface TransactionDetailsProps {
  transaction: Transaction;
  onClose?: () => void;
  showRiskAnalysis?: boolean;
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transaction,
  onClose,
  showRiskAnalysis = true
}) => {
  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed':
      case 'success':
        return 'green';
      case 'pending':
        return 'orange';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getRiskLevelColor = (level: 'low' | 'medium' | 'high' | undefined) => {
    switch (level) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateRiskFactors = () => {
    const factors = [];
    
    if (transaction.amount > 1000) {
      factors.push('Large transaction amount');
    }
    
    if (transaction.type === 'approval' && transaction.approvalDetails?.spender) {
      factors.push('Token approval granted');
    }
    
    if (transaction.status === 'failed') {
      factors.push('Transaction failed');
    }
    
    if (transaction.gasUsed && transaction.gasUsed > 100000) {
      factors.push('High gas usage');
    }
    
    return factors;
  };

  const riskFactors = calculateRiskFactors();

  return (
    <Container>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Card>
          <Flex p="4" direction="column" gap="3">
            <Flex justify="between" align="center">
              <Flex direction="column">
                <Heading size="4" style={{ textTransform: 'capitalize' }}>
                  {transaction.type} Transaction
                </Heading>
                <Text size="2" color="gray">
                  {formatTimestamp(transaction.timestamp)}
                </Text>
              </Flex>
              {onClose && (
                <Button variant="outline" size="2" onClick={onClose}>
                  Close
                </Button>
              )}
            </Flex>
            
            <Flex gap="6" justify="center">
              <Flex direction="column" align="center">
                <Text size="5" weight="bold" color="blue">
                  {formatAmount(transaction.amount)} SUI
                </Text>
                <Text size="1" color="gray">Amount</Text>
              </Flex>
              <Flex direction="column" align="center">
                <Badge color={getStatusColor(transaction.status)}>
                  {transaction.status}
                </Badge>
                <Text size="1" color="gray">Status</Text>
              </Flex>
              <Flex direction="column" align="center">
                <Text size="3" weight="medium">
                  {transaction.gasUsed?.toLocaleString() || 'N/A'}
                </Text>
                <Text size="1" color="gray">Gas Used</Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* Transaction Details */}
        <Card>
          <Flex p="4" direction="column" gap="3">
            <Heading size="3">Transaction Details</Heading>
            <Separator />
            
            <Flex direction="column" gap="3">
              <Flex justify="between">
                <Text weight="medium" color="gray">Transaction Hash</Text>
                <Text style={{ fontFamily: 'monospace' }} size="2">
                  {formatAddress(transaction.hash)}
                </Text>
              </Flex>
              
              <Flex justify="between">
                <Text weight="medium" color="gray">Block Number</Text>
                <Text>#{transaction.blockNumber}</Text>
              </Flex>
              
              <Flex justify="between">
                <Text weight="medium" color="gray">From</Text>
                <Text style={{ fontFamily: 'monospace' }} size="2">
                  {formatAddress(transaction.from)}
                </Text>
              </Flex>
              
              <Flex justify="between">
                <Text weight="medium" color="gray">To</Text>
                <Text style={{ fontFamily: 'monospace' }} size="2">
                  {formatAddress(transaction.to)}
                </Text>
              </Flex>
              
              {transaction.gasPrice && (
                <Flex justify="between">
                  <Text weight="medium" color="gray">Gas Price</Text>
                  <Text>{transaction.gasPrice.toLocaleString()} MIST</Text>
                </Flex>
              )}
              
              {transaction.fee && (
                <Flex justify="between">
                  <Text weight="medium" color="gray">Network Fee</Text>
                  <Text>{formatAmount(transaction.fee)} SUI</Text>
                </Flex>
              )}
            </Flex>

            {/* Approval Details */}
            {transaction.type === 'approval' && transaction.approvalDetails && (
              <Box>
                <Separator my="3" />
                <Heading size="3" mb="3">Approval Details</Heading>
                <Flex direction="column" gap="2">
                  <Flex justify="between">
                    <Text weight="medium" color="gray">Token</Text>
                    <Text>{transaction.approvalDetails.token}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text weight="medium" color="gray">Spender</Text>
                    <Text style={{ fontFamily: 'monospace' }} size="2">
                      {formatAddress(transaction.approvalDetails.spender)}
                    </Text>
                  </Flex>
                  <Flex justify="between">
                    <Text weight="medium" color="gray">Amount Approved</Text>
                    <Text>
                      {transaction.approvalDetails.amount === 'unlimited' 
                        ? 'Unlimited' 
                        : formatAmount(Number(transaction.approvalDetails.amount))
                      }
                    </Text>
                  </Flex>
                </Flex>
              </Box>
            )}

            {/* Contract Details */}
            {transaction.type === 'contract' && transaction.contractDetails && (
              <Box>
                <Separator my="3" />
                <Heading size="3" mb="3">Contract Interaction</Heading>
                <Flex direction="column" gap="2">
                  <Flex justify="between">
                    <Text weight="medium" color="gray">Contract Address</Text>
                    <Text style={{ fontFamily: 'monospace' }} size="2">
                      {formatAddress(transaction.contractDetails.address)}
                    </Text>
                  </Flex>
                  <Flex justify="between">
                    <Text weight="medium" color="gray">Function</Text>
                    <Text>{transaction.contractDetails.function}</Text>
                  </Flex>
                </Flex>
              </Box>
            )}
          </Flex>
        </Card>

        {/* Risk Analysis */}
        {showRiskAnalysis && transaction.riskLevel && (
          <Card>
            <Flex p="4" direction="column" gap="3">
              <Heading size="3">Risk Analysis</Heading>
              <Separator />
              
              <Flex justify="between" align="center">
                <Text weight="medium">Risk Level</Text>
                <Badge color={getRiskLevelColor(transaction.riskLevel)}>
                  {transaction.riskLevel}
                </Badge>
              </Flex>
              
              {riskFactors.length > 0 && (
                <Box>
                  <Text weight="medium" mb="2">Risk Factors</Text>
                  <Flex direction="column" gap="1">
                    {riskFactors.map((factor, index) => (
                      <Text key={index} size="2" color="gray">
                        • {factor}
                      </Text>
                    ))}
                  </Flex>
                </Box>
              )}
              
              {riskFactors.length === 0 && (
                <Flex align="center" gap="2">
                  <Text size="2" color="green">
                    ✓ No risk factors detected
                  </Text>
                </Flex>
              )}
            </Flex>
          </Card>
        )}

        {/* Raw Data */}
        <Card>
          <Flex p="4" direction="column" gap="3">
            <Heading size="3">Raw Transaction Data</Heading>
            <Separator />
            <Box>
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--gray-11)' }}>
                  View Raw JSON
                </summary>
                <Box mt="2" p="3" style={{ 
                  backgroundColor: 'var(--gray-2)', 
                  borderRadius: 'var(--radius-2)',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  <pre>{JSON.stringify(transaction, null, 2)}</pre>
                </Box>
              </details>
            </Box>
          </Flex>
        </Card>
      </Flex>
    </Container>
  );
};