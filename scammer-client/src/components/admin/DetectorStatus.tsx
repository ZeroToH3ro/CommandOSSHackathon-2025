import { useState } from 'react';
import { Card, Flex, Text, Badge, Button, Box, Heading } from '@radix-ui/themes';
import { CheckCircledIcon, CrossCircledIcon, ReloadIcon } from '@radix-ui/react-icons';
import { useScamDetector } from '../../hooks/useScamDetector';
import { CONTRACT_CONFIG } from '../../config/contract';

export function DetectorStatus() {
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [checking, setChecking] = useState(false);
  
  const {
    contractDeployed,
    adminAddress,
    loading,
    alerts,
    patterns,
    transactions,
  } = useScamDetector();

  const checkDetectorHealth = async () => {
    setChecking(true);
    try {
      // Simulate health check - in real implementation, this would call contract
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastCheck(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  const getContractStatus = () => {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      return { status: 'not-deployed', message: 'Contract not deployed' };
    }
    if (!CONTRACT_CONFIG.DETECTOR_STATE_ID || CONTRACT_CONFIG.DETECTOR_STATE_ID === "0x0") {
      return { status: 'incomplete', message: 'Detector state not initialized' };
    }
    if (contractDeployed) {
      return { status: 'active', message: 'Detector AI is active and monitoring' };
    }
    return { status: 'inactive', message: 'Detector AI is deployed but inactive' };
  };

  const contractStatus = getContractStatus();

  return (
    <Card>
      <Flex p="6" direction="column" gap="4">
        <Flex justify="between" align="center">
          <Heading size="5">Detector AI Status</Heading>
          <Button 
            onClick={checkDetectorHealth} 
            disabled={checking}
            variant="outline"
            size="2"
          >
            {checking ? (
              <ReloadIcon style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
            ) : (
              <ReloadIcon style={{ width: '16px', height: '16px' }} />
            )}
            Check Health
          </Button>
        </Flex>

        {/* Overall Status */}
        <Flex align="center" gap="3" p="4" style={{ 
          backgroundColor: contractStatus.status === 'active' ? 'var(--green-2)' : 'var(--orange-2)',
          borderRadius: '8px',
          border: `1px solid var(--${contractStatus.status === 'active' ? 'green' : 'orange'}-6)`
        }}>
          {contractStatus.status === 'active' ? (
            <CheckCircledIcon style={{ width: '24px', height: '24px', color: 'var(--green-9)' }} />
          ) : (
            <CrossCircledIcon style={{ width: '24px', height: '24px', color: 'var(--orange-9)' }} />
          )}
          <Box>
            <Text weight="medium" size="4">{contractStatus.message}</Text>
            <Text size="2" color="gray">
              Last checked: {lastCheck.toLocaleTimeString()}
            </Text>
          </Box>
        </Flex>

        {/* Component Status */}
        <Box>
          <Text weight="medium" mb="3">Component Status</Text>
          <Flex direction="column" gap="3">
            
            {/* Smart Contract */}
            <Flex justify="between" align="center" p="3" style={{ 
              backgroundColor: 'var(--gray-2)', 
              borderRadius: '6px' 
            }}>
              <Flex align="center" gap="2">
                <Text size="3">Smart Contract</Text>
                <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
                  {CONTRACT_CONFIG.PACKAGE_ID.slice(0, 8)}...
                </Text>
              </Flex>
              <Badge color={contractDeployed ? 'green' : 'gray'}>
                {contractDeployed ? 'Active' : 'Inactive'}
              </Badge>
            </Flex>

            {/* Pattern Detection */}
            <Flex justify="between" align="center" p="3" style={{ 
              backgroundColor: 'var(--gray-2)', 
              borderRadius: '6px' 
            }}>
              <Text size="3">Pattern Detection AI</Text>
              <Badge color={patterns.length > 0 ? 'green' : 'gray'}>
                {patterns.length} patterns detected
              </Badge>
            </Flex>

            {/* Risk Analysis */}
            <Flex justify="between" align="center" p="3" style={{ 
              backgroundColor: 'var(--gray-2)', 
              borderRadius: '6px' 
            }}>
              <Text size="3">Risk Analysis Engine</Text>
              <Badge color={alerts.length > 0 ? 'orange' : 'green'}>
                {alerts.length} active alerts
              </Badge>
            </Flex>

            {/* Transaction Monitor */}
            <Flex justify="between" align="center" p="3" style={{ 
              backgroundColor: 'var(--gray-2)', 
              borderRadius: '6px' 
            }}>
              <Text size="3">Transaction Monitor</Text>
              <Badge color={transactions.length > 0 ? 'green' : 'gray'}>
                {transactions.length} transactions analyzed
              </Badge>
            </Flex>

          </Flex>
        </Box>

        {/* Configuration Details */}
        <Box>
          <Text weight="medium" mb="3">Configuration</Text>
          <Flex direction="column" gap="2">
            
            {/* Admin Address */}
            {adminAddress && (
              <Flex justify="between" align="center">
                <Text size="2" color="gray">Admin Address:</Text>
                <Text size="2" style={{ fontFamily: 'monospace' }}>
                  {adminAddress.slice(0, 8)}...{adminAddress.slice(-6)}
                </Text>
              </Flex>
            )}
            
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Network:</Text>
              <Badge variant="outline">{CONTRACT_CONFIG.NETWORK}</Badge>
            </Flex>
            
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Package ID:</Text>
              <Text size="2" style={{ fontFamily: 'monospace' }}>
                {CONTRACT_CONFIG.PACKAGE_ID === "0x0" ? 'Not set' : 
                 `${CONTRACT_CONFIG.PACKAGE_ID.slice(0, 10)}...${CONTRACT_CONFIG.PACKAGE_ID.slice(-8)}`}
              </Text>
            </Flex>
            
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Detector State:</Text>
              <Text size="2" style={{ fontFamily: 'monospace' }}>
                {CONTRACT_CONFIG.DETECTOR_STATE_ID === "0x0" ? 'Not set' : 
                 `${CONTRACT_CONFIG.DETECTOR_STATE_ID.slice(0, 10)}...${CONTRACT_CONFIG.DETECTOR_STATE_ID.slice(-8)}`}
              </Text>
            </Flex>
            
            <Flex justify="between" align="center">
              <Text size="2" color="gray">Loading:</Text>
              <Badge color={loading ? 'blue' : 'gray'}>
                {loading ? 'Processing' : 'Idle'}
              </Badge>
            </Flex>

          </Flex>
        </Box>

        {/* AI Capabilities */}
        <Box>
          <Text weight="medium" mb="3">AI Capabilities</Text>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <CheckCircledIcon style={{ width: '16px', height: '16px', color: 'var(--green-9)' }} />
              <Text size="2">Real-time transaction analysis</Text>
            </Flex>
            <Flex align="center" gap="2">
              <CheckCircledIcon style={{ width: '16px', height: '16px', color: 'var(--green-9)' }} />
              <Text size="2">Suspicious pattern detection</Text>
            </Flex>
            <Flex align="center" gap="2">
              <CheckCircledIcon style={{ width: '16px', height: '16px', color: 'var(--green-9)' }} />
              <Text size="2">Risk score calculation</Text>
            </Flex>
            <Flex align="center" gap="2">
              <CheckCircledIcon style={{ width: '16px', height: '16px', color: 'var(--green-9)' }} />
              <Text size="2">Automated alert generation</Text>
            </Flex>
            <Flex align="center" gap="2">
              <CheckCircledIcon style={{ width: '16px', height: '16px', color: 'var(--green-9)' }} />
              <Text size="2">Blacklist/whitelist management</Text>
            </Flex>
          </Flex>
        </Box>

      </Flex>
    </Card>
  );
}
