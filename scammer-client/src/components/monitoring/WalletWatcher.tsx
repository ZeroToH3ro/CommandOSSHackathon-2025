import React, { useState, useEffect } from 'react';
import { Card, Flex, Text, Badge, Button, Box } from '@radix-ui/themes';
import { 
  ExclamationTriangleIcon, 
  EyeOpenIcon, 
  EyeClosedIcon, 
  SizeIcon, 
  ClockIcon, 
  UpdateIcon // Replace TrendingUpIcon with UpdateIcon
} from '@radix-ui/react-icons';
import { useTransactionMonitoring } from '../../hooks/useTransactionMonitoring';
import { usePatternDetection } from '../../hooks/usePatternDetection';
import { useAlerts } from '../../hooks/useAlerts';
import { PatternDetector } from './PatternDetector';
import { TransactionMonitor } from './TransactionMonitor';

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
  const [monitoringInterval] = useState(30000); // 30 seconds - removed setMonitoringInterval

  const { 
    transactions, 
    isLoading, 
    error,
    refetch // Use refetch instead of refreshTransactions
  } = useTransactionMonitoring(walletAddress, '24h'); // Pass timeRange string instead of boolean

  const { 
    suspiciousPatterns, // Use suspiciousPatterns instead of patterns
    riskScore
  } = usePatternDetection(transactions);

  const { alerts, addAlert, clearAllAlerts } = useAlerts(); // Use clearAllAlerts instead of clearAlerts

  // Auto-refresh transactions when watching
  useEffect(() => {
    if (!isWatching) return;

    const interval = setInterval(() => {
      refetch();
    }, monitoringInterval);

    return () => clearInterval(interval);
  }, [isWatching, monitoringInterval, refetch]);

  // Generate alerts based on patterns
  useEffect(() => {
    suspiciousPatterns.forEach((pattern) => {
      if (pattern.riskLevel === 'high') {
        addAlert({
          type: 'error', // Use 'error' instead of 'security'
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

  const handleStartWatching = () => {
    setIsWatching(true);
    setWatchStartTime(new Date());
    clearAllAlerts();
    onWatchingChange?.(true);
  };

  const handleStopWatching = () => {
    setIsWatching(false);
    setWatchStartTime(null);
    onWatchingChange?.(false);
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
                <Button onClick={handleStopWatching} variant="outline" size="2">
                  <EyeClosedIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Stop Watching
                </Button>
              ) : (
                <Button onClick={handleStartWatching} size="2">
                  <EyeOpenIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Start Watching
                </Button>
              )}
            </Flex>
          </Flex>

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