import { useState } from 'react';
import { Card, Flex, Text, Button, Heading, Box, TextField, Badge, Separator } from '@radix-ui/themes';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon, CheckCircledIcon, GearIcon } from '@radix-ui/react-icons';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { useScamDetector } from '../../hooks/useScamDetector';
import { TransactionStatus } from '../wallet/TransactionStatus';
import { EnhancedTransactionAnalyzer } from '../ai/EnhancedTransactionAnalyzer';

export function AdminPanel() {
  const [scammerAddress, setScammerAddress] = useState('');
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [bulkAddresses, setBulkAddresses] = useState('');
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string>('');

  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const {
    contractDeployed,
    adminAddress,
    addScammerAddresses,
    addWhitelistedAddresses,
    alerts,
    patterns
  } = useScamDetector();
  const isAdmin = currentAccount?.address === "0x99e6bb8f13c462ea8e6d95a47867aa160e3e776b47580de70d361d0cd5d8a2a6";
  const isWalletConnected = !!currentAccount;
  const canUseAdminFunctions = isWalletConnected && isAdmin && contractDeployed;
  const handleAddScammer = async () => {
    if (!scammerAddress.trim() || !currentAccount) return;
    
    setLoading(true);
    setTxStatus('Preparing transaction...');
    
    try {
      const txb = addScammerAddresses([scammerAddress.trim()]);
      
      setTxStatus('Please sign the transaction in your wallet...');
      
      signAndExecuteTransaction(
        {
          transaction: txb,
          account: currentAccount,
        },
        {
          onSuccess: (result) => {
            setTxStatus(`✅ Transaction successful: ${result.digest}`);
            setScammerAddress('');
            
            setTimeout(() => setTxStatus(''), 5000);
          },
          onError: (error) => {
            console.error('Error executing transaction:', error);
            setTxStatus(`❌ Transaction failed: ${error.message}`);
            
            setTimeout(() => setTxStatus(''), 5000);
          },
        }
      );
    } catch (error) {
      console.error('Error preparing transaction:', error);
      setTxStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setTxStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWhitelist = async () => {
    if (!whitelistAddress.trim() || !currentAccount) return;
    
    setLoading(true);
    setTxStatus('Preparing transaction...');
    
    try {
      const txb = addWhitelistedAddresses([whitelistAddress.trim()]);
      
      setTxStatus('Please sign the transaction in your wallet...');
      
      signAndExecuteTransaction(
        {
          transaction: txb,
          account: currentAccount,
        },
        {
          onSuccess: (result) => {
            console.log('Whitelist address added successfully:', result);
            setTxStatus(`✅ Transaction successful: ${result.digest}`);
            setWhitelistAddress('');
            
            setTimeout(() => setTxStatus(''), 5000);
          },
          onError: (error) => {
            console.error('Error executing transaction:', error);
            setTxStatus(`❌ Transaction failed: ${error.message}`);
            
            setTimeout(() => setTxStatus(''), 5000);
          },
        }
      );
    } catch (error) {
      console.error('Error preparing transaction:', error);
      setTxStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setTxStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async (type: 'scammer' | 'whitelist') => {
    if (!currentAccount) return;
    
    const addresses = bulkAddresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
    
    if (addresses.length === 0) return;
    
    setLoading(true);
    setTxStatus(`Preparing bulk ${type} transaction for ${addresses.length} addresses...`);
    
    try {
      const txb = type === 'scammer' 
        ? addScammerAddresses(addresses)
        : addWhitelistedAddresses(addresses);
      
      setTxStatus('Please sign the transaction in your wallet...');
      
      signAndExecuteTransaction(
        {
          transaction: txb,
          account: currentAccount,
        },
        {
          onSuccess: (result) => {
            console.log(`Bulk ${type} addresses added successfully:`, result);
            setTxStatus(`✅ Bulk operation successful: ${result.digest}`);
            setBulkAddresses('');
            
            setTimeout(() => setTxStatus(''), 5000);
          },
          onError: (error) => {
            console.error('Error executing bulk transaction:', error);
            setTxStatus(`❌ Bulk transaction failed: ${error.message}`);
            
            setTimeout(() => setTxStatus(''), 5000);
          },
        }
      );
    } catch (error) {
      console.error(`Error bulk adding ${type}s:`, error);
      setTxStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setTxStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (!contractDeployed) {
    return (
      <Card>
        <Flex p="6" direction="column" align="center" gap="4">
          <ExclamationTriangleIcon style={{ width: '48px', height: '48px', color: 'var(--orange-9)' }} />
          <Box style={{ textAlign: 'center' }}>
            <Heading size="5" mb="2">Contract Not Deployed</Heading>
            <Text color="gray">
              The scam detector contract needs to be deployed before you can use the admin panel.
            </Text>
          </Box>
        </Flex>
      </Card>
    );
  }

  if (!currentAccount) {
    return (
      <Card>
        <Flex p="6" direction="column" align="center" gap="4">
          <ExclamationTriangleIcon style={{ width: '48px', height: '48px', color: 'var(--orange-9)' }} />
          <Box style={{ textAlign: 'center' }}>
            <Heading size="5" mb="2">Wallet Not Connected</Heading>
            <Text color="gray">
              Please connect your wallet to use admin functions.
            </Text>
          </Box>
        </Flex>
      </Card>
    );
  }

  return (
    <Box>
      <Flex direction="column" gap="6">
        {/* Header */}
        <Box>
          <Heading size="6" mb="2">Admin Panel</Heading>
          <Text color="gray" size="3">
            Manage scammer blacklists and whitelisted addresses
          </Text>
        </Box>

        {/* Admin Authorization Status */}
        <Card>
          <Flex p="4" direction="column" gap="3">
            <Flex align="center" gap="3">
              {isAdmin ? (
                <CheckCircledIcon style={{ width: '20px', height: '20px', color: 'var(--green-9)' }} />
              ) : (
                <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--orange-9)' }} />
              )}
              <Box>
                <Text weight="medium">
                  {isAdmin ? 'Admin Access Granted' : 'Admin Access Required'}
                </Text>
                <Text size="2" color="gray">
                  {isAdmin 
                    ? 'You have admin privileges for this contract'
                    : 'Connect with the admin wallet to use admin functions'
                  }
                </Text>
              </Box>
              <Badge color={isAdmin ? 'green' : 'orange'} variant="soft">
                {isAdmin ? 'Authorized' : 'Unauthorized'}
              </Badge>
            </Flex>
            
            {adminAddress && (
              <Box>
                <Text size="2" color="gray">
                  <strong>Admin Address:</strong> {adminAddress}
                </Text>
                {currentAccount?.address && (
                  <Text size="2" color="gray">
                    <strong>Current Wallet:</strong> {currentAccount.address}
                  </Text>
                )}
              </Box>
            )}
          </Flex>
        </Card>

        {/* Contract Status */}
        <Card>
          <Flex p="4" align="center" gap="3">
            <CheckCircledIcon style={{ width: '20px', height: '20px', color: 'var(--green-9)' }} />
            <Box>
              <Text weight="medium">Contract Deployed</Text>
              <Text size="2" color="gray">Smart contract is active and monitoring</Text>
            </Box>
          </Flex>
        </Card>

        {/* Transaction Status */}
        {txStatus && (
          <TransactionStatus 
            status={txStatus} 
            onClear={() => setTxStatus('')}
          />
        )}

        {/* Quick Stats */}
        <Flex gap="4">
          <Card style={{ flex: 1 }}>
            <Flex p="4" direction="column" align="center">
              <Text size="6" weight="bold" color="red">{alerts.length}</Text>
              <Text size="2" color="gray">Active Alerts</Text>
            </Flex>
          </Card>
          <Card style={{ flex: 1 }}>
            <Flex p="4" direction="column" align="center">
              <Text size="6" weight="bold" color="orange">{patterns.length}</Text>
              <Text size="2" color="gray">Detected Patterns</Text>
            </Flex>
          </Card>
        </Flex>

        {/* Add Single Addresses */}
        <Card>
          <Flex p="4" direction="column" gap="4">
            <Heading size="4">Add Addresses</Heading>
            
            {/* Add Scammer */}
            <Box>
              <Text weight="medium" mb="2">Add Scammer Address</Text>
              <Flex gap="2">
                <TextField.Root
                  placeholder="0x1234..."
                  value={scammerAddress}
                  onChange={(e) => setScammerAddress(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button 
                  onClick={handleAddScammer}
                  disabled={!scammerAddress.trim() || loading || !canUseAdminFunctions}
                  color="red"
                >
                  <PlusIcon />
                  Add Scammer
                </Button>
              </Flex>
            </Box>

            <Separator />

            {/* Add Whitelist */}
            <Box>
              <Text weight="medium" mb="2">Add Whitelisted Address</Text>
              <Flex gap="2">
                <TextField.Root
                  placeholder="0x1234..."
                  value={whitelistAddress}
                  onChange={(e) => setWhitelistAddress(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={handleAddToWhitelist}
                  disabled={!whitelistAddress.trim() || loading || !canUseAdminFunctions}
                  color="green"
                >
                  <PlusIcon />
                  Add to Whitelist
                </Button>
              </Flex>
            </Box>
          </Flex>
        </Card>

        {/* Bulk Operations */}
        <Card>
          <Flex p="4" direction="column" gap="4">
            <Heading size="4">Bulk Operations</Heading>
            
            <Box>
              <Text weight="medium" mb="2">Bulk Add Addresses</Text>
              <Text size="2" color="gray" mb="2">
                Enter one address per line
              </Text>
              <textarea
                value={bulkAddresses}
                onChange={(e) => setBulkAddresses(e.target.value)}
                placeholder="0x1234...&#10;0x5678...&#10;0x9abc..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--gray-6)',
                  backgroundColor: 'var(--gray-1)',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              
              <Flex gap="2" mt="2">
                <Button 
                  onClick={() => handleBulkAdd('scammer')}
                  disabled={!bulkAddresses.trim() || loading || !canUseAdminFunctions}
                  color="red"
                  variant="outline"
                >
                  <TrashIcon />
                  Bulk Add Scammers
                </Button>
                <Button 
                  onClick={() => handleBulkAdd('whitelist')}
                  disabled={!bulkAddresses.trim() || loading || !canUseAdminFunctions}
                  color="green"
                  variant="outline"
                >
                  <CheckCircledIcon />
                  Bulk Add to Whitelist
                </Button>
              </Flex>
            </Box>
          </Flex>
        </Card>

        {/* Recent Activity */}
        <Card>
          <Flex p="4" direction="column" gap="3">
            <Heading size="4">Recent Alerts</Heading>
            {alerts.length > 0 ? (
              <Flex direction="column" gap="2">
                {alerts.slice(0, 5).map((alert) => (
                  <Flex 
                    key={alert.id}
                    justify="between" 
                    align="center" 
                    p="3"
                    style={{ 
                      backgroundColor: 'var(--red-2)', 
                      borderRadius: '6px',
                      border: '1px solid var(--red-6)'
                    }}
                  >
                    <Box>
                      <Text size="2" weight="medium">{alert.title}</Text>
                      <Text size="1" color="gray">{alert.message}</Text>
                    </Box>
                    <Badge color="red" size="1">
                      {alert.severity}
                    </Badge>
                  </Flex>
                ))}
              </Flex>
            ) : (
              <Flex align="center" justify="center" p="6" style={{ backgroundColor: 'var(--gray-2)', borderRadius: '8px' }}>
                <Text size="2" color="gray">No recent alerts</Text>
              </Flex>
            )}
          </Flex>
        </Card>

        {/* AI Transaction Analyzer */}
        <Card>
          <Flex p="4" direction="column" gap="4">
            <Flex justify="between" align="center">
              <Heading size="4">Transaction Analyzer</Heading>
              <Button 
                onClick={() => {}}
                color="blue"
                variant="outline"
                size="2"
                disabled={!currentAccount}
              >
                <GearIcon />
                Configure
              </Button>
            </Flex>
            
            <Text color="gray" size="3">
              Get insights on recent transactions and detect potential scams
            </Text>
          </Flex>
        </Card>

        {/* AI Configuration */}
        <Card>
          <Flex p="4" direction="column" gap="4">
            <Heading size="4">AI Risk Assessment Configuration</Heading>
            
            <Box>
              <Text weight="medium" mb="2">AI Models Available</Text>
              <Flex gap="2" wrap="wrap">
                <Badge color="green" variant="soft">GPT-4</Badge>
                <Badge color="blue" variant="soft">Gemini Pro</Badge>
                <Badge color="orange" variant="soft">Ollama (Local)</Badge>
              </Flex>
              <Text size="2" color="gray" mt="2">
                Configure API keys in .env.local to enable AI risk assessment
              </Text>
            </Box>

            <Separator />

            <Box>
              <Text weight="medium" mb="2">Current Configuration</Text>
              <Flex direction="column" gap="2" style={{ fontSize: '14px' }}>
                <Flex justify="between">
                  <Text size="2">AI Assessment:</Text>
                  <Badge color="green" variant="soft">Enabled</Badge>
                </Flex>
                <Flex justify="between">
                  <Text size="2">Risk Weight:</Text>
                  <Text size="2">30% (AI + 70% Rules)</Text>
                </Flex>
                <Flex justify="between">
                  <Text size="2">Confidence Threshold:</Text>
                  <Text size="2">70%</Text>
                </Flex>
                <Flex justify="between">
                  <Text size="2">Response Timeout:</Text>
                  <Text size="2">5 seconds</Text>
                </Flex>
              </Flex>
            </Box>
          </Flex>
        </Card>

        {/* Enhanced Transaction Analysis Demo */}
        {canUseAdminFunctions && (
          <Card>
            <Flex p="4" direction="column" gap="4">
              <Flex align="center" gap="3">
                <GearIcon style={{ width: '20px', height: '20px' }} />
                <Heading size="4">Test AI Risk Assessment</Heading>
              </Flex>
              
              <EnhancedTransactionAnalyzer
                sender="0x1234567890abcdef1234567890abcdef12345678"
                recipient="0xabcdef1234567890abcdef1234567890abcdef12"
                amount="1000"
              />
            </Flex>
          </Card>
        )}
      </Flex>
    </Box>
  );
}
