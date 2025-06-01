import React, { useState, useEffect } from 'react';
import { Card, Flex, Text, Badge, Button, Box } from '@radix-ui/themes';
import { 
  ExclamationTriangleIcon, 
  EyeOpenIcon, 
  EyeClosedIcon, 
  SizeIcon, 
  ClockIcon, 
  UpdateIcon,
  LightningBoltIcon
} from '@radix-ui/react-icons';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { useTransactionMonitoring } from '../../hooks/useTransactionMonitoring';
import { usePatternDetection } from '../../hooks/usePatternDetection';
import { useAlerts } from '../../hooks/useAlerts';
import { useScamDetector } from '../../hooks/useScamDetector';
import { PatternDetector } from './PatternDetector';
import { TransactionMonitor } from './TransactionMonitor';
import { TransactionStatus } from '../wallet/TransactionStatus';
import { AIRiskValidator } from '../ai/AIRiskValidator';
import { aiService } from '../../services/aiService';

interface WalletWatcherProps {
  walletAddress: string;
  onWatchingChange?: (isWatching: boolean) => void;
}

export const WalletWatcher: React.FC<WalletWatcherProps> = ({
  walletAddress,
  onWatchingChange
}) => {
  const [isWatching, setIsWatching] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<Date | null>(null);
  const [monitoringInterval] = useState(30000); // 30 seconds
  const [txStatus, setTxStatus] = useState<string>('');
  const [aiMonitoringEnabled, setAiMonitoringEnabled] = useState(true);
  const [lastAiAssessment, setLastAiAssessment] = useState<any>(null);
  const [aiAssessmentCount, setAiAssessmentCount] = useState(0);

  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const { 
    transactions, 
    isLoading, 
    error,
    refetch 
  } = useTransactionMonitoring(walletAddress, '24h');

  const { 
    suspiciousPatterns,
    riskScore
  } = usePatternDetection(transactions);

  const { alerts, addAlert, clearAllAlerts } = useAlerts();
  
  // Smart contract integration
  const {
    contractDeployed,
    adminAddress,
    startMonitoring,
    stopMonitoring,
  } = useScamDetector();

  // Check if current user is admin
  const isAdmin = currentAccount?.address === adminAddress;

  // Auto-refresh transactions when watching
  useEffect(() => {
    if (!isWatching) return;

    const interval = setInterval(async () => {
      await refetch();
      
      // Use aiService here
      if (aiMonitoringEnabled && transactions.length > 0) {
        const latestTx = transactions[0];
        await aiService.validateTransaction(latestTx);
      }
    }, monitoringInterval);

    return () => clearInterval(interval);
  }, [isWatching, monitoringInterval, aiMonitoringEnabled, transactions]);

  // Generate alerts based on patterns
  useEffect(() => {
    suspiciousPatterns.forEach((pattern) => {
      if (pattern.riskLevel === 'high') {
        addAlert({
          type: 'error',
          severity: 'high',
          title: 'High Risk Pattern Detected',
          message: `${pattern.description} - Wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`,
          autoClose: false
        });
      } else if (pattern.riskLevel === 'medium') {
        addAlert({
          type: 'warning',
          severity: 'medium',
          title: 'Suspicious Activity Detected',
          message: `${pattern.description} - Wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`,
          autoClose: true,
          duration: 10000
        });
      }
    });
  }, [suspiciousPatterns, addAlert, walletAddress]);

  useEffect(() => {
    const performAiAssessment = async () => {
      if (aiMonitoringEnabled && transactions.length > 0) {
        try {
          const latestTransaction = transactions[0];
          const context = {
            sender: latestTransaction.from,
            recipient: latestTransaction.to,
            amount: latestTransaction.amount.toString(),
            timestamp: latestTransaction.timestamp,
            contractConfig: {},
            senderHistory: [],
            recipientHistory: [],
            networkMetrics: {}
          };
          const assessment = await aiService.assessTransactionRisk(context);
          setLastAiAssessment(assessment);
          setAiAssessmentCount(prev => prev + 1);
        } catch (error) {
          console.error('AI assessment failed:', error);
        }
      }
    };

    performAiAssessment();
  }, [transactions, aiMonitoringEnabled]);

  const handleStartWatching = async () => {
    try {
      setIsWatching(true);
      setWatchStartTime(new Date());
      clearAllAlerts();
      
      // Start contract monitoring if deployed and wallet connected
      if (contractDeployed && currentAccount) {
        if (!isAdmin) {
          setTxStatus('⚠️ Admin wallet required for blockchain monitoring, using local monitoring only');
          setTimeout(() => setTxStatus(''), 5000);
        } else {
          setTxStatus('Starting blockchain monitoring...');
          
          const txb = startMonitoring(walletAddress);
          
          signAndExecuteTransaction(
            {
              transaction: txb,
              account: currentAccount,
            },
            {
              onSuccess: (result) => {
                console.log('Monitoring started successfully:', result);
                setTxStatus(`✅ Blockchain monitoring active: ${result.digest.slice(0, 8)}...`);
                setTimeout(() => setTxStatus(''), 5000);
              },
              onError: (error) => {
                console.error('Error starting blockchain monitoring:', error);
                const errorMessage = error.message?.includes('EUnauthorized') 
                  ? 'Unauthorized: Admin wallet required for blockchain monitoring'
                  : 'Blockchain monitoring failed, using local monitoring only';
                setTxStatus(`⚠️ ${errorMessage}`);
                setTimeout(() => setTxStatus(''), 5000);
              },
            }
          );
        }
      }
      
      onWatchingChange?.(true);
    } catch (error: any) {
      console.error('Error starting monitoring:', error);
      setIsWatching(false);
      addAlert({
        type: 'error',
        severity: 'medium',
        title: 'Monitoring Error',
        message: 'Failed to start wallet monitoring. Please try again.',
        autoClose: true,
        duration: 5000
      });
    }
  };

  const handleStopWatching = async () => {
    try {
      setIsWatching(false);
      setWatchStartTime(null);
      
      // Stop contract monitoring if deployed and wallet connected
      if (contractDeployed && currentAccount) {
        if (!isAdmin) {
          setTxStatus('⚠️ Local monitoring stopped, admin wallet required for blockchain control');
          setTimeout(() => setTxStatus(''), 5000);
        } else {
          setTxStatus('Stopping blockchain monitoring...');
          
          const txb = stopMonitoring(walletAddress);
          
          signAndExecuteTransaction(
            {
              transaction: txb,
              account: currentAccount,
            },
            {
              onSuccess: (result) => {
                console.log('Monitoring stopped successfully:', result);
                setTxStatus(`✅ Blockchain monitoring stopped: ${result.digest.slice(0, 8)}...`);
                setTimeout(() => setTxStatus(''), 5000);
              },
              onError: (error) => {
                console.error('Error stopping blockchain monitoring:', error);
                const errorMessage = error.message?.includes('EUnauthorized') 
                  ? 'Unauthorized: Admin wallet required to stop blockchain monitoring'
                  : 'Local monitoring stopped, blockchain monitoring may still be active';
                setTxStatus(`⚠️ ${errorMessage}`);
                setTimeout(() => setTxStatus(''), 5000);
              },
            }
          );
        }
      }
      
      onWatchingChange?.(false);
    } catch (error: any) {
      console.error('Error stopping monitoring:', error);
      addAlert({
        type: 'warning',
        severity: 'low',
        title: 'Stop Monitoring Warning',
        message: 'There was an issue stopping contract monitoring, but local monitoring has been stopped.',
        autoClose: true,
        duration: 5000
      });
    }
  };

  const getRiskLevelColor = (score: number): 'red' | 'orange' | 'yellow' | 'green' => {
    if (score >= 80) return 'red';
    if (score >= 50) return 'orange';
    if (score >= 30) return 'yellow';
    return 'green';
  };

  const getRiskLevelText = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 30) return 'Medium';
    return 'Low';
  };

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Flex direction="column" gap="6">
      {/* Wallet Status Card */}
      <Card>
        <Flex p="4" direction="column" gap="4">
          <Flex justify="between" align="center">
            <Box>
              <Flex align="center" gap="2" mb="1">
                <SizeIcon style={{ width: '20px', height: '20px' }} />
                <Text size="5" weight="bold">Wallet Monitor</Text>
              </Flex>
              <Text size="2" color="gray">
                Monitoring wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
              </Text>
            </Box>
            <Flex align="center" gap="2">
              {isWatching ? (
                <Button 
                  onClick={handleStopWatching} 
                  variant="outline" 
                  size="2"
                  disabled={!currentAccount}
                >
                  <EyeClosedIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Stop Watching
                </Button>
              ) : (
                <Button 
                  onClick={handleStartWatching} 
                  size="2"
                  disabled={!currentAccount}
                >
                  <EyeOpenIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Start Watching
                </Button>
              )}
              {!currentAccount ? (
                <Text size="1" color="gray">
                  Connect wallet for monitoring
                </Text>
              ) : !isAdmin ? (
                <Text size="1" color="orange">
                  Admin wallet required for blockchain monitoring
                </Text>
              ) : (
                <Text size="1" color="green">
                  Blockchain monitoring available
                </Text>
              )}
            </Flex>
          </Flex>

          {/* Transaction Status */}
          {txStatus && (
            <TransactionStatus 
              status={txStatus} 
              onClear={() => setTxStatus('')}
            />
          )}

          <Flex gap="4" wrap="wrap">
            <Box style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
              <Text size="6" weight="bold" color={isWatching ? 'green' : 'gray'}>
                {isWatching ? 'Active' : 'Inactive'}
              </Text>
              <Text size="2" color="gray">Status</Text>
            </Box>
            <Box style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
              <Text size="6" weight="bold">
                {watchStartTime ? formatDuration(watchStartTime) : '--'}
              </Text>
              <Text size="2" color="gray">Duration</Text>
            </Box>
            <Box style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
              <Text size="6" weight="bold" color={getRiskLevelColor(riskScore)}>
                {getRiskLevelText(riskScore)}
              </Text>
              <Text size="2" color="gray">Risk Level</Text>
            </Box>
            <Box style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
              <Text size="6" weight="bold" color="blue">
                {transactions.length}
              </Text>
              <Text size="2" color="gray">Transactions</Text>
            </Box>
          </Flex>
          
          {isWatching && (
            <Box 
              mt="4" 
              p="3" 
              style={{ 
                backgroundColor: 'var(--blue-3)', 
                borderRadius: '8px', 
                border: '1px solid var(--blue-6)' 
              }}
            >
              <Flex align="center" gap="2">
                <ClockIcon style={{ width: '16px', height: '16px', color: 'var(--blue-9)' }} />
                <Text size="2" color="blue">
                  Monitoring every {monitoringInterval / 1000} seconds
                </Text>
              </Flex>
            </Box>
          )}
        </Flex>
      </Card>

      {/* Risk Assessment */}
      {riskScore > 0 && (
        <Card>
          <Flex p="4" direction="column" gap="4">
            <Flex align="center" gap="2">
              <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />
              <Text size="5" weight="bold">Risk Assessment</Text>
            </Flex>

            <Flex direction="column" gap="4">
              <Flex justify="between" align="center">
                <Text>Overall Risk Score</Text>
                <Flex align="center" gap="2">
                  <Box 
                    style={{ 
                      width: '128px', 
                      height: '8px', 
                      backgroundColor: 'var(--gray-4)', 
                      borderRadius: '4px',
                      position: 'relative'
                    }}
                  >
                    <Box
                      style={{
                        height: '8px',
                        borderRadius: '4px',
                        width: `${riskScore}%`,
                        backgroundColor: `var(--${getRiskLevelColor(riskScore)}-9)`,
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </Box>
                  <Text weight="bold" color={getRiskLevelColor(riskScore)}>
                    {riskScore.toFixed(1)}%
                  </Text>
                </Flex>
              </Flex>
              
              {suspiciousPatterns.length > 0 && (
                <Box>
                  <Text weight="medium" mb="2">Detected Patterns</Text>
                  <Flex direction="column" gap="2">
                    {suspiciousPatterns.map((pattern, index) => (
                      <Flex 
                        key={index} 
                        justify="between" 
                        align="center" 
                        p="2" 
                        style={{ 
                          backgroundColor: 'var(--gray-2)', 
                          borderRadius: '6px' 
                        }}
                      >
                        <Text size="2">{pattern.description}</Text>
                        <Badge 
                          color={
                            pattern.riskLevel === 'critical' ? 'red' :
                            pattern.riskLevel === 'high' ? 'red' :
                            pattern.riskLevel === 'medium' ? 'orange' : 'gray'
                          }
                        >
                          {pattern.riskLevel}
                        </Badge>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              )}
            </Flex>
          </Flex>
        </Card>
      )}

      {/* AI-Powered Risk Assessment */}
      {isWatching && walletAddress && aiMonitoringEnabled && (
        <Card>
          <Flex p="4" direction="column" gap="4">
            <Flex align="center" gap="2">
              <LightningBoltIcon style={{ width: '20px', height: '20px', color: 'var(--purple-9)' }} />
              <Text size="5" weight="bold">AI Risk Assessment</Text>
              <Badge color="purple" variant="soft">
                {aiAssessmentCount} assessments
              </Badge>
            </Flex>

            <Text size="2" color="gray">
              Real-time AI analysis of transaction patterns and risk factors
            </Text>

            <AIRiskValidator
              sender={walletAddress}
              recipient={transactions.length > 0 ? transactions[0].to : "0x0000000000000000000000000000000000000000000000000000000000000000"}
              amount={transactions.length > 0 ? transactions[0].amount.toString() : "0"}
              enabled={aiMonitoringEnabled}
              onRiskAssessment={(assessment) => {
                setLastAiAssessment(assessment);
                setAiAssessmentCount(prev => prev + 1);
                
                // Generate alert based on AI assessment
                if (assessment.riskScore > 80) {
                  addAlert({
                    type: 'error',
                    title: 'High AI Risk Detection',
                    message: `AI detected high risk: ${assessment.reasoning}`,
                    severity: 'high',
                    autoClose: false,
                  });
                } else if (assessment.riskScore > 60) {
                  addAlert({
                    type: 'warning',
                    title: 'Medium AI Risk Detection',
                    message: `AI flagged potential risk: ${assessment.reasoning}`,
                    severity: 'medium',
                    autoClose: true,
                    duration: 10000,
                  });
                }
              }}
            />

            {lastAiAssessment && (
              <Box 
                p="3" 
                style={{ 
                  backgroundColor: 'var(--purple-2)', 
                  borderRadius: '8px', 
                  border: '1px solid var(--purple-6)' 
                }}
              >
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">Latest AI Assessment</Text>
                    <Badge color="purple" variant="soft">
                      {lastAiAssessment.model.toUpperCase()}
                    </Badge>
                  </Flex>
                  <Text size="2" color="gray">
                    Risk Score: {lastAiAssessment.riskScore}% | 
                    Confidence: {lastAiAssessment.confidence}%
                  </Text>
                  <Text size="2">
                    {lastAiAssessment.reasoning}
                  </Text>
                </Flex>
              </Box>
            )}

            <Flex justify="between" align="center">
              <Text size="2" color="gray">
                AI monitoring powered by multiple models
              </Text>
              <Button
                variant="soft"
                size="1"
                onClick={() => setAiMonitoringEnabled(!aiMonitoringEnabled)}
              >
                {aiMonitoringEnabled ? 'Disable AI' : 'Enable AI'}
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Monitoring Components */}
      {isWatching && (
        <>
          <PatternDetector 
            transactions={transactions}
            onPatternDetected={(pattern) => {
              console.log('Pattern detected:', pattern);
            }}
          />
          
          <TransactionMonitor 
            transactions={transactions}
            refreshInterval={monitoringInterval}
          />
        </>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card>
          <Flex p="4" direction="column" gap="4">
            <Flex justify="between" align="center">
              <Text size="5" weight="bold">Recent Alerts</Text>
              <Button variant="outline" size="2" onClick={clearAllAlerts}>
                Clear All
              </Button>
            </Flex>

            <Flex direction="column" gap="3">
              {alerts.slice(0, 5).map((alert) => (
                <Box 
                  key={alert.id} 
                  p="3" 
                  style={{ 
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: `var(--${
                      alert.severity === 'high' || alert.severity === 'critical' ? 'red' :
                      alert.severity === 'medium' ? 'orange' : 'blue'
                    }-6)`,
                    backgroundColor: `var(--${
                      alert.severity === 'high' || alert.severity === 'critical' ? 'red' :
                      alert.severity === 'medium' ? 'orange' : 'blue'
                    }-2)`
                  }}
                >
                  <Flex justify="between" align="start">
                    <Box style={{ flex: 1 }}>
                      <Text weight="medium">{alert.title}</Text>
                      <Text size="2" color="gray" style={{ marginTop: '4px' }}>
                        {alert.message}
                      </Text>
                      <Text size="1" color="gray" style={{ marginTop: '8px' }}>
                        {alert.timestamp.toLocaleString()}
                      </Text>
                    </Box>
                    <Badge 
                      color={
                        alert.severity === 'high' || alert.severity === 'critical' ? 'red' :
                        alert.severity === 'medium' ? 'orange' : 'blue'
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </Flex>
                </Box>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <Flex p="6" align="center" gap="2">
            <ExclamationTriangleIcon style={{ width: '16px', height: '16px', color: 'var(--red-9)' }} />
            <Text color="red">Error: {typeof error === 'string' ? error : error.message}</Text>
          </Flex>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <Flex p="6" align="center" gap="2">
            <UpdateIcon 
              style={{ 
                width: '16px', 
                height: '16px', 
                color: 'var(--blue-9)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} 
            />
            <Text color="blue">Loading transaction data...</Text>
          </Flex>
        </Card>
      )}
    </Flex>
  );
};