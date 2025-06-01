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
      <Container style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px' 
      }}>
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <SizeIcon style={{ 
            width: '48px', 
            height: '48px', 
            margin: '0 auto 16px', 
            color: 'var(--gray-9)' 
          }} />
          <Heading size="6" style={{ marginBottom: '8px' }}>Connect Your Wallet</Heading>
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
    <Container size="4" style={{ padding: '24px 16px' }}>
      <Flex direction="column" gap="6">
        {/* Header */}
        <Flex justify="between" align="center">
          <Box>
            <Heading size="8" style={{ marginBottom: '8px' }}>Wallet Security Dashboard</Heading>
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
          <Flex direction="column" gap="2">
            {alerts.map((alert: any) => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                onDismiss={() => dismissAlert(alert.id)}
              />
            ))}
          </Flex>
        )}

        {/* Risk Score Card */}
        <Card style={{ padding: '24px' }}>
          <Flex justify="between" align="center">
            <Box>
              <Text size="2" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Current Risk Score
              </Text>
              <Flex align="center" gap="3">
                <Text size="8" weight="bold" color={getRiskBadgeColor(riskScore)}>
                  {riskScore}
                </Text>
                <Badge color={getRiskBadgeColor(riskScore)} size="2">
                  {getRiskLabel(riskScore)}
                </Badge>
              </Flex>
            </Box>
            <Box style={{ textAlign: 'right' }}>
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
          <Card style={{ padding: '24px' }}>
            <Heading size="5" style={{ marginBottom: '16px' }}>Transaction Activity</Heading>
            <TransactionChart 
              transactions={transactions} 
              timeRange={timeRange}
              loading={transactionsLoading}
            />
          </Card>

          {/* Suspicious Patterns */}
          <Card style={{ padding: '24px' }}>
            <Heading size="5" style={{ marginBottom: '16px' }}>Detected Patterns</Heading>
            {suspiciousPatterns.length === 0 ? (
              <Flex align="center" justify="center" style={{ height: '192px' }}>
                <Box style={{ textAlign: 'center' }}>
                  <SizeIcon style={{ width: '32px', height: '32px', margin: '0 auto 8px', color: 'var(--green-9)' }} />
                  <Text color="gray">No suspicious patterns detected</Text>
                </Box>
              </Flex>
            ) : (
              <Flex direction="column" gap="3">
                {suspiciousPatterns.slice(0, 5).map((pattern: any, index: any) => (
                  <Card key={index} style={{ 
                    padding: '16px', 
                    borderLeft: '4px solid var(--red-9)',
                    backgroundColor: 'var(--red-2)'
                  }}>
                    <Flex justify="between" align="start">
                      <Box>
                        <Text weight="bold" size="3">{pattern.type}</Text>
                        <Text size="2" color="gray" style={{ marginTop: '4px' }}>
                          {pattern.description}
                        </Text>
                      </Box>
                      <Badge color="red" size="1">
                        Risk: {pattern.riskLevel}
                      </Badge>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            )}
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Card style={{ padding: '24px' }}>
          <Flex justify="between" align="center" style={{ marginBottom: '16px' }}>
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
          <Card style={{ padding: '24px' }}>
            <Flex align="center" gap="2" style={{ marginBottom: '16px' }}>
              <LightningBoltIcon style={{ width: '20px', height: '20px', color: 'var(--purple-9)' }} />
              <Heading size="5">AI-Powered Risk Assessment</Heading>
              <Badge color="purple" variant="soft">Beta</Badge>
            </Flex>
            <Text size="2" color="gray" style={{ marginBottom: '16px' }}>
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
      </Flex>
    </Container>
  );
}