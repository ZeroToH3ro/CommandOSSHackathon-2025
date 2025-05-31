import { useState } from 'react';
import { Card, Flex, Text, Button, Heading, Box, TextField, Badge, Separator } from '@radix-ui/themes';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { useScamDetector } from '../../hooks/useScamDetector';

export function AdminPanel() {
  const [scammerAddress, setScammerAddress] = useState('');
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [bulkAddresses, setBulkAddresses] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    contractDeployed,
    addScammerAddresses,
    addWhitelistedAddresses,
    alerts,
    patterns
  } = useScamDetector();

  const handleAddScammer = async () => {
    if (!scammerAddress.trim()) return;
    
    setLoading(true);
    try {
      const tx = addScammerAddresses([scammerAddress.trim()]);
      console.log('Add scammer transaction prepared:', tx);
      // In a real app, you would sign and execute this transaction
      setScammerAddress('');
    } catch (error) {
      console.error('Error adding scammer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWhitelist = async () => {
    if (!whitelistAddress.trim()) return;
    
    setLoading(true);
    try {
      const tx = addWhitelistedAddresses([whitelistAddress.trim()]);
      console.log('Add whitelist transaction prepared:', tx);
      // In a real app, you would sign and execute this transaction
      setWhitelistAddress('');
    } catch (error) {
      console.error('Error adding to whitelist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async (type: 'scammer' | 'whitelist') => {
    const addresses = bulkAddresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
    
    if (addresses.length === 0) return;
    
    setLoading(true);
    try {
      const tx = type === 'scammer' 
        ? addScammerAddresses(addresses)
        : addWhitelistedAddresses(addresses);
      console.log(`Bulk ${type} transaction prepared:`, tx);
      setBulkAddresses('');
    } catch (error) {
      console.error(`Error bulk adding ${type}s:`, error);
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
                  disabled={!scammerAddress.trim() || loading}
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
                  disabled={!whitelistAddress.trim() || loading}
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
                  disabled={!bulkAddresses.trim() || loading}
                  color="red"
                  variant="outline"
                >
                  <TrashIcon />
                  Bulk Add Scammers
                </Button>
                <Button 
                  onClick={() => handleBulkAdd('whitelist')}
                  disabled={!bulkAddresses.trim() || loading}
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
      </Flex>
    </Box>
  );
}
