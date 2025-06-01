import { useState } from 'react';
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Tabs, Badge, Text, Card } from "@radix-ui/themes";
import { SizeIcon, ActivityLogIcon, BarChartIcon, ExclamationTriangleIcon, GearIcon } from "@radix-ui/react-icons";
import { WalletStatus } from "./WalletStatus";
import { Dashboard } from "./components/dashboard/Dashboard";
import { WalletWatcher } from "./components/monitoring/WalletWatcher";
import { TransactionFilter } from "./components/transactions/TransactionFilter";
import { AlertList } from "./components/alerts/AlertList";
import { AdminPanel } from "./components/admin";
import { DetectorStatus } from "./components/admin/DetectorStatus";
import { AIRiskValidator } from "./components/ai/AIRiskValidator";
import { AIConfigurationPanel } from "./components/ai/AIConfigurationPanel";
import { useAlerts } from "./hooks/useAlerts";
import { useTransactionMonitoring } from "./hooks/useTransactionMonitoring";
import { useScamDetector } from "./hooks/useScamDetector";

function App() {
  const currentAccount = useCurrentAccount();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isWatching, setIsWatching] = useState(false);
  const { alerts, clearAllAlerts } = useAlerts();

  // Get wallet address if connected
  const walletAddress = currentAccount?.address || '';

  const { transactions } = useTransactionMonitoring(walletAddress, '24h');
  
  // Smart contract integration
  const {
    alerts: contractAlerts,
  } = useScamDetector();

  // Merge local and contract alerts
  const allAlerts = [...alerts, ...contractAlerts];

  const getTabBadgeCount = (tab: string) => {
    switch (tab) {
      case 'alerts':
        return allAlerts.length;
      case 'monitoring':
        return isWatching ? 1 : 0;
      case 'transactions':
        return transactions.length;
      default:
        return 0;
    }
  };

  return (
    <>
      {/* Header */}
      <Flex
        position="sticky"
        px="4"
        py="3"
        justify="between"
        align="center"
        style={{
          borderBottom: "1px solid var(--gray-a6)",
          backgroundColor: "var(--color-background)",
          backdropFilter: "blur(8px)",
          zIndex: 50
        }}
      >
        <Flex align="center" gap="3">
          <SizeIcon style={{ width: '24px', height: '24px', color: 'var(--blue-9)' }} />
          <Box>
            <Heading size="6" style={{ color: 'var(--gray-12)' }}>
              SUI Scammer Detector
            </Heading>
            <Text size="2" color="gray">
              Real-time blockchain security monitoring
            </Text>
          </Box>
        </Flex>

        <Flex align="center" gap="3">
          {/* Alert indicator */}
          {allAlerts.length > 0 && (
            <Flex align="center" gap="2" p="2" style={{ 
              backgroundColor: 'var(--red-3)', 
              borderRadius: '6px',
              border: '1px solid var(--red-6)'
            }}>
              <ExclamationTriangleIcon style={{ width: '16px', height: '16px', color: 'var(--red-9)' }} />
              <Text size="2" color="red" weight="medium">
                {allAlerts.length} alert{allAlerts.length !== 1 ? 's' : ''}
              </Text>
            </Flex>
          )}

          {/* Monitoring status */}
          {isWatching && walletAddress && (
            <Flex align="center" gap="2" p="2" style={{ 
              backgroundColor: 'var(--green-3)', 
              borderRadius: '6px',
              border: '1px solid var(--green-6)'
            }}>
              <Box 
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--green-9)',
                  animation: 'pulse 2s infinite'
                }}
              />
              <Text size="2" color="green" weight="medium">
                Monitoring Active
              </Text>
            </Flex>
          )}

          <ConnectButton />
        </Flex>
      </Flex>

      {/* Main Content */}
      <Container size="4" style={{ minHeight: 'calc(100vh - 80px)' }}>
        {!currentAccount ? (
          /* Not Connected State */
          <Flex 
            direction="column" 
            align="center" 
            justify="center" 
            gap="6"
            style={{ minHeight: '60vh', textAlign: 'center' }}
          >
            <SizeIcon style={{ width: '64px', height: '64px', color: 'var(--gray-8)' }} />
            <Box>
              <Heading size="8" mb="2">Welcome to SUI Scammer Detector</Heading>
              <Text size="4" color="gray" style={{ maxWidth: '600px' }}>
                Connect your wallet to start monitoring for suspicious transactions and protecting your assets from scams.
              </Text>
            </Box>
            <Box>
              <ConnectButton />
            </Box>
          </Flex>
        ) : (
          /* Connected State with Tabs */
          <Box pt="6">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List size="2" style={{ marginBottom: '24px' }}>
                <Tabs.Trigger value="dashboard">
                  <Flex align="center" gap="2">
                    <BarChartIcon style={{ width: '16px', height: '16px' }} />
                    Dashboard
                  </Flex>
                </Tabs.Trigger>
                
                <Tabs.Trigger value="monitoring">
                  <Flex align="center" gap="2">
                    <SizeIcon style={{ width: '16px', height: '16px' }} />
                    Monitoring
                    {getTabBadgeCount('monitoring') > 0 && (
                      <Badge color="green" size="1">
                        {getTabBadgeCount('monitoring')}
                      </Badge>
                    )}
                  </Flex>
                </Tabs.Trigger>
                
                <Tabs.Trigger value="transactions">
                  <Flex align="center" gap="2">
                    <ActivityLogIcon style={{ width: '16px', height: '16px' }} />
                    Transactions
                    {getTabBadgeCount('transactions') > 0 && (
                      <Badge color="blue" size="1">
                        {getTabBadgeCount('transactions')}
                      </Badge>
                    )}
                  </Flex>
                </Tabs.Trigger>
                
                <Tabs.Trigger value="alerts">
                  <Flex align="center" gap="2">
                    <ExclamationTriangleIcon style={{ width: '16px', height: '16px' }} />
                    Alerts
                    {getTabBadgeCount('alerts') > 0 && (
                      <Badge color="red" size="1">
                        {getTabBadgeCount('alerts')}
                      </Badge>
                    )}
                  </Flex>
                </Tabs.Trigger>
                
                <Tabs.Trigger value="admin">
                  <Flex align="center" gap="2">
                    <GearIcon style={{ width: '16px', height: '16px' }} />
                    Admin
                  </Flex>
                </Tabs.Trigger>

                <Tabs.Trigger value="status">
                  <Flex align="center" gap="2">
                    <SizeIcon style={{ width: '16px', height: '16px' }} />
                    AI Status
                  </Flex>
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="dashboard">
                <Flex direction="column" gap="6">
                  <Box>
                    <Heading size="6" mb="2">Security Dashboard</Heading>
                    <Text color="gray" size="3">
                      Overview of your wallet security and transaction patterns
                    </Text>
                  </Box>
                  
                  <WalletStatus />
                  
                  <Dashboard />
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="monitoring">
                <Flex direction="column" gap="6">
                  <Box>
                    <Heading size="6" mb="2">Real-time Monitoring</Heading>
                    <Text color="gray" size="3">
                      Monitor your wallet for suspicious activities and patterns
                    </Text>
                  </Box>
                  
                  <WalletWatcher 
                    walletAddress={walletAddress}
                    onWatchingChange={setIsWatching}
                  />
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="transactions">
                <Flex direction="column" gap="6">
                  <Box>
                    <Heading size="6" mb="2">Transaction Analysis</Heading>
                    <Text color="gray" size="3">
                      Filter and analyze your transactions for security insights
                    </Text>
                  </Box>
                  
                  <TransactionFilter 
                    filter={{}}
                    onChange={(filter) => {
                      console.log('Filter changed:', filter);
                    }}
                    onReset={() => {
                      console.log('Filter reset');
                    }}
                    transactionCount={transactions.length}
                  />
                  
                  {/* Transaction list would go here */}
                  <Box p="6" style={{ 
                    backgroundColor: 'var(--gray-2)', 
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <Text color="gray">
                      Transaction list component will be displayed here
                    </Text>
                  </Box>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="alerts">
                <Flex direction="column" gap="6">
                  <Box>
                    <Heading size="6" mb="2">Security Alerts</Heading>
                    <Text color="gray" size="3">
                      Review and manage security alerts for your wallet
                    </Text>
                  </Box>
                  
                  <AlertList 
                    alerts={allAlerts.map(alert => ({
                      ...alert,
                      timestamp: new Date(alert.timestamp)
                    }))}
                    onClearAll={clearAllAlerts}
                    onDismiss={(alertId) => {
                      console.log('Dismiss alert:', alertId);
                    }}
                    maxAlerts={10}
                    showTimestamps={true}
                  />
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="admin">
                <Flex direction="column" gap="6">
                  <AdminPanel />
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="status">
                <Flex direction="column" gap="6">
                  <Box>
                    <Heading size="6" mb="2">AI Risk Assessment Status</Heading>
                    <Text color="gray" size="3">
                      Monitor AI services and configuration for real-time risk assessment
                    </Text>
                  </Box>
                  
                  <DetectorStatus />
                  
                  <AIConfigurationPanel />
                  
                  {/* AI Demo Section for testing */}
                  {currentAccount && (
                    <Card>
                      <Flex p="4" direction="column" gap="4">
                        <Heading size="4">Test AI Risk Assessment</Heading>
                        <Text size="2" color="gray">
                          Test the AI risk validation with sample transaction data
                        </Text>
                        <AIRiskValidator
                          sender={currentAccount.address}
                          recipient="0x1234567890abcdef1234567890abcdef12345678"
                          amount="100"
                          enabled={true}
                        />
                      </Flex>
                    </Card>
                  )}
                </Flex>
              </Tabs.Content>
            </Tabs.Root>
          </Box>
        )}
      </Container>

      {/* Footer */}
      <Box 
        mt="8" 
        p="4" 
        style={{ 
          borderTop: '1px solid var(--gray-a6)',
          backgroundColor: 'var(--gray-1)',
          textAlign: 'center'
        }}
      >
        <Text size="2" color="gray">
          SUI Scammer Detector - Protecting your blockchain assets
        </Text>
      </Box>
    </>
  );
}

export default App;