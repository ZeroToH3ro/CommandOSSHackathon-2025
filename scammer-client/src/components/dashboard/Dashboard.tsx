import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Box, Container, Grid, Heading, Text, Badge, Card, Flex, Button } from '@radix-ui/themes';
import { SizeIcon, TriangleUpIcon, TriangleDownIcon, LightningBoltIcon } from '@radix-ui/react-icons';
import { TransactionList } from '../transactions/TransactionList';
import { AlertBanner } from '../alerts/AlertBanner';
import { MetricsCard } from './MetricsCard';
import { TransactionChart } from './TransactionChart';
import { EnhancedTransactionAnalyzer } from '../ai/EnhancedTransactionAnalyzer';
import { useTransactionMonitoring } from '../../hooks/useTransactionMonitoring';
import { usePatternDetection } from '../../hooks/usePatternDetection';
import { useAlerts } from '../../hooks/useAlerts';

export function Dashboard() {
  const account = useCurrentAccount();
  const [timeRange, setTimeRange] = useState('24h');
  
  const { 
    transactions, 
    isLoading: transactionsLoading,
    totalTransactions,
    totalVolume,
    successRate 
  } = useTransactionMonitoring(account?.address, timeRange);
  
  const { 
    suspiciousPatterns, 
    riskScore,
    isAnalyzing 
  } = usePatternDetection(transactions);
  
  const { alerts, dismissAlert } = useAlerts();

  if (!account) {
    return (
      <Container className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <SizeIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <Heading size="6" className="mb-2">Connect Your Wallet</Heading>
          <Text color="gray">Connect your Sui wallet to start monitoring transactions</Text>
        </Card>
      </Container>
    );
  }

  const getRiskBadgeColor = (score: number) => {
    if (score >= 70) return 'red';
    if (score >= 40) return 'yellow';
    return 'green';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <Container size="4" className="py-6 space-y-6">
      {/* Header */}
      <Flex justify="between" align="center" className="mb-6">
        <Box>
          <Heading size="8" className="mb-2">Wallet Security Dashboard</Heading>
          <Text color="gray" size="3">
            Monitoring: {account.address.slice(0, 8)}...{account.address.slice(-6)}
          </Text>
        </Box>
        
        <Flex gap="2">
          <Button
            variant={timeRange === '1h' ? 'solid' : 'outline'}
            onClick={() => setTimeRange('1h')}
            size="2"
          >
            1H
          </Button>
          <Button
            variant={timeRange === '24h' ? 'solid' : 'outline'}
            onClick={() => setTimeRange('24h')}
            size="2"
          >
            24H
          </Button>
          <Button
            variant={timeRange === '7d' ? 'solid' : 'outline'}
            onClick={() => setTimeRange('7d')}
            size="2"
          >
            7D
          </Button>
        </Flex>
      </Flex>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box className="space-y-2">
          {alerts.map((alert: any) => (
            <AlertBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => dismissAlert(alert.id)}
            />
          ))}
        </Box>
      )}

      {/* Risk Score Card */}
      <Card className="p-6">
        <Flex justify="between" align="center">
          <Box>
            <Text size="2" color="gray" className="uppercase tracking-wide">
              Current Risk Score
            </Text>
            <Flex align="center" gap="3" className="mt-2">
              <Text size="8" weight="bold" className={`text-${getRiskBadgeColor(riskScore)}-600`}>
                {riskScore}
              </Text>
              <Badge color={getRiskBadgeColor(riskScore)} size="2">
                {getRiskLabel(riskScore)}
              </Badge>
            </Flex>
          </Box>
          <Box className="text-right">
            {isAnalyzing ? (
              <Text size="2" color="gray">Analyzing patterns...</Text>
            ) : (
              <Text size="2" color="gray">
                {suspiciousPatterns.length} suspicious patterns detected
              </Text>
            )}
          </Box>
        </Flex>
      </Card>

      {/* Metrics Grid */}
      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
        <MetricsCard
          title="Total Transactions"
          value={totalTransactions.toString()}
          trend={12.5}
          icon={<TriangleUpIcon />}
          loading={transactionsLoading}
        />
        <MetricsCard
          title="Total Volume"
          value={`${totalVolume.toFixed(2)} SUI`}
          trend={-3.2}
          icon={<TriangleDownIcon />}
          loading={transactionsLoading}
        />
        <MetricsCard
          title="Success Rate"
          value={`${(successRate * 100).toFixed(1)}%`}
          trend={2.1}
          icon={<SizeIcon />}
          loading={transactionsLoading}
        />
      </Grid>

      {/* Charts and Analysis */}
      <Grid columns={{ initial: '1', lg: '2' }} gap="6">
        {/* Transaction Chart */}
        <Card className="p-6">
          <Heading size="5" className="mb-4">Transaction Activity</Heading>
          <TransactionChart 
            transactions={transactions} 
            timeRange={timeRange}
            loading={transactionsLoading}
          />
        </Card>

        {/* Suspicious Patterns */}
        <Card className="p-6">
          <Heading size="5" className="mb-4">Detected Patterns</Heading>
          {suspiciousPatterns.length === 0 ? (
            <Flex align="center" justify="center" className="h-48">
              <Box className="text-center">
                <SizeIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <Text color="gray">No suspicious patterns detected</Text>
              </Box>
            </Flex>
          ) : (
            <Box className="space-y-3">
              {suspiciousPatterns.slice(0, 5).map((pattern: any, index: any) => (
                <Card key={index} className="p-4 border-l-4 border-l-red-500">
                  <Flex justify="between" align="start">
                    <Box>
                      <Text weight="bold" size="3">{pattern.type}</Text>
                      <Text size="2" color="gray" className="mt-1">
                        {pattern.description}
                      </Text>
                    </Box>
                    <Badge color="red" size="1">
                      Risk: {pattern.riskLevel}
                    </Badge>
                  </Flex>
                </Card>
              ))}
            </Box>
          )}
        </Card>
      </Grid>

      {/* Recent Transactions */}
      <Card className="p-6">
        <Flex justify="between" align="center" className="mb-4">
          <Heading size="5">Recent Transactions</Heading>
          <Button variant="outline" size="2">
            View All
          </Button>
        </Flex>
        <TransactionList 
          transactions={transactions.slice(0, 10)} 
          loading={transactionsLoading}
          showRiskIndicators={true}
        />
      </Card>

      {/* AI-Powered Insights */}
      {transactions.length > 0 && (
        <Card className="p-6">
          <Flex align="center" gap="2" className="mb-4">
            <LightningBoltIcon className="w-5 h-5 text-purple-600" />
            <Heading size="5">AI-Powered Risk Assessment</Heading>
            <Badge color="purple" variant="soft">Beta</Badge>
          </Flex>
          <Text size="2" color="gray" className="mb-4">
            Enhanced transaction analysis using multiple AI models for comprehensive risk assessment
          </Text>
          <EnhancedTransactionAnalyzer
            sender={account.address}
            recipient={transactions[0].to}
            amount={transactions[0].amount.toString()}
            onAnalysisComplete={(result) => {
              console.log('AI Analysis Complete:', result);
              // You could add this to state to display insights
            }}
          />
        </Card>
      )}
    </Container>
  );
}