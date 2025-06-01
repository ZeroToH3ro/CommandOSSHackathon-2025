import { useState, useEffect } from 'react';
import { Card, Flex, Text, Button, Heading, Box, TextField, Badge, Switch, Separator } from '@radix-ui/themes';
import { GearIcon, ReloadIcon, CheckCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { useScamDetector } from '../../hooks/useScamDetector';
import { aiService } from '../../services/aiService';
import { TransactionStatus } from '../wallet/TransactionStatus';

interface AIConfiguration {
  enabled: boolean;
  risk_weight: number;
  confidence_threshold: number;
  max_response_time_ms: number;
  fallback_to_rule_based: boolean;
  supported_models: number[];
}

export function AIConfigurationPanel() {
  const [config, setConfig] = useState<AIConfiguration>({
    enabled: true,
    risk_weight: 30,
    confidence_threshold: 70,
    max_response_time_ms: 5000,
    fallback_to_rule_based: true,
    supported_models: [1, 2, 4] // GPT, Gemini, Ollama
  });
  
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string>('');
  const [configLoading, setConfigLoading] = useState(true);

  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { getAIConfig, updateAIConfig, contractDeployed } = useScamDetector();

  useEffect(() => {
    loadConfiguration();
    checkAvailableModels();
  }, []);

  const loadConfiguration = async () => {
    setConfigLoading(true);
    try {
      const contractConfig = await getAIConfig();
      if (contractConfig) {
        setConfig(contractConfig);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const checkAvailableModels = async () => {
    try {
      const models = await aiService.getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to check available models:', error);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!currentAccount) return;

    setLoading(true);
    setTxStatus('Preparing AI configuration update...');

    try {
      const txb = updateAIConfig(config);
      
      setTxStatus('Please sign the transaction in your wallet...');
      
      signAndExecuteTransaction(
        {
          transaction: txb,
          account: currentAccount,
        },
        {
          onSuccess: (result) => {
            setTxStatus(`✅ AI configuration updated: ${result.digest}`);
            setTimeout(() => setTxStatus(''), 5000);
          },
          onError: (error) => {
            console.error('Error updating AI config:', error);
            setTxStatus(`❌ Update failed: ${error.message}`);
            setTimeout(() => setTxStatus(''), 5000);
          },
        }
      );
    } catch (error) {
      console.error('Error preparing AI config transaction:', error);
      setTxStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setTxStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getModelBadgeColor = (model: string) => {
    return availableModels.includes(model) ? 'green' : 'gray';
  };

  if (!contractDeployed) {
    return (
      <Card>
        <Flex p="4" align="center" gap="3">
          <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--orange-9)' }} />
          <Text color="gray">Contract must be deployed to configure AI settings</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex p="4" direction="column" gap="4">
        <Flex justify="between" align="center">
          <Flex align="center" gap="3">
            <GearIcon style={{ width: '20px', height: '20px' }} />
            <Heading size="4">AI Risk Assessment Configuration</Heading>
          </Flex>
          <Button 
            onClick={checkAvailableModels}
            variant="ghost"
            size="1"
          >
            <ReloadIcon />
            Refresh
          </Button>
        </Flex>

        {/* Transaction Status */}
        {txStatus && (
          <TransactionStatus 
            status={txStatus} 
            onClear={() => setTxStatus('')}
          />
        )}

        {configLoading ? (
          <Flex align="center" justify="center" p="6">
            <Text color="gray">Loading configuration...</Text>
          </Flex>
        ) : (
          <>
            {/* AI Models Status */}
            <Box>
              <Text weight="medium" mb="2">Available AI Models</Text>
              <Flex gap="2" wrap="wrap" mb="2">
                <Badge color={getModelBadgeColor('gpt')} variant={availableModels.includes('gpt') ? 'solid' : 'soft'}>
                  {availableModels.includes('gpt') ? '✓' : '✗'} GPT-4
                </Badge>
                <Badge color={getModelBadgeColor('gemini')} variant={availableModels.includes('gemini') ? 'solid' : 'soft'}>
                  {availableModels.includes('gemini') ? '✓' : '✗'} Gemini Pro
                </Badge>
                <Badge color={getModelBadgeColor('ollama')} variant={availableModels.includes('ollama') ? 'solid' : 'soft'}>
                  {availableModels.includes('ollama') ? '✓' : '✗'} Ollama (Local)
                </Badge>
              </Flex>
              <Text size="2" color="gray">
                {availableModels.length > 0 
                  ? `${availableModels.length} model(s) configured and ready`
                  : 'No AI models available - configure API keys in .env.local'
                }
              </Text>
            </Box>

            <Separator />

            {/* Configuration Settings */}
            <Box>
              <Text weight="medium" mb="3">AI Assessment Settings</Text>
              
              <Flex direction="column" gap="4">
                {/* Enable/Disable AI */}
                <Flex justify="between" align="center">
                  <Box>
                    <Text size="2" weight="medium">Enable AI Risk Assessment</Text>
                    <Text size="1" color="gray">Use AI models to enhance transaction risk analysis</Text>
                  </Box>
                  <Switch 
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                </Flex>

                {config.enabled && (
                  <>
                    {/* Risk Weight */}
                    <Box>
                      <Text size="2" weight="medium" mb="1">AI Risk Weight: {config.risk_weight}%</Text>
                      <Text size="1" color="gray" mb="2">
                        Weight given to AI assessment (vs rule-based analysis)
                      </Text>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        value={config.risk_weight}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          risk_weight: parseInt(e.target.value) 
                        }))}
                        style={{
                          width: '100%',
                          height: '6px',
                          borderRadius: '3px',
                          background: '#ddd',
                          outline: 'none',
                        }}
                      />
                      <Flex justify="between" mt="1">
                        <Text size="1" color="gray">10% (Rule-based focus)</Text>
                        <Text size="1" color="gray">80% (AI focus)</Text>
                      </Flex>
                    </Box>

                    {/* Confidence Threshold */}
                    <Box>
                      <Text size="2" weight="medium" mb="1">Confidence Threshold: {config.confidence_threshold}%</Text>
                      <Text size="1" color="gray" mb="2">
                        Minimum AI confidence required to use assessment
                      </Text>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        value={config.confidence_threshold}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          confidence_threshold: parseInt(e.target.value) 
                        }))}
                        style={{
                          width: '100%',
                          height: '6px',
                          borderRadius: '3px',
                          background: '#ddd',
                          outline: 'none',
                        }}
                      />
                      <Flex justify="between" mt="1">
                        <Text size="1" color="gray">50% (Permissive)</Text>
                        <Text size="1" color="gray">95% (Strict)</Text>
                      </Flex>
                    </Box>

                    {/* Response Timeout */}
                    <Box>
                      <Text size="2" weight="medium" mb="1">Response Timeout</Text>
                      <TextField.Root
                        type="number"
                        value={config.max_response_time_ms}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          max_response_time_ms: parseInt(e.target.value) || 5000 
                        }))}
                        placeholder="5000"
                      />
                      <Text size="1" color="gray" mt="1">
                        Maximum time to wait for AI response (milliseconds)
                      </Text>
                    </Box>

                    {/* Fallback Setting */}
                    <Flex justify="between" align="center">
                      <Box>
                        <Text size="2" weight="medium">Fallback to Rule-based Analysis</Text>
                        <Text size="1" color="gray">Use traditional analysis when AI fails</Text>
                      </Box>
                      <Switch 
                        checked={config.fallback_to_rule_based}
                        onCheckedChange={(checked) => setConfig(prev => ({ 
                          ...prev, 
                          fallback_to_rule_based: checked 
                        }))}
                      />
                    </Flex>
                  </>
                )}
              </Flex>
            </Box>

            <Separator />

            {/* Save Button */}
            <Flex justify="between" align="center">
              <Text size="2" color="gray">
                Changes will be stored on-chain and require admin privileges
              </Text>
              <Button 
                onClick={handleSaveConfiguration}
                disabled={loading || !currentAccount || availableModels.length === 0}
                size="2"
              >
                {loading ? <ReloadIcon className="animate-spin" /> : <CheckCircledIcon />}
                Save Configuration
              </Button>
            </Flex>

            {/* Environment Setup Help */}
            {availableModels.length === 0 && (
              <Box style={{ 
                padding: '12px', 
                backgroundColor: 'var(--yellow-2)', 
                borderRadius: '8px',
                border: '1px solid var(--yellow-6)'
              }}>
                <Text size="2" weight="medium" color="yellow" mb="2">⚠️ Setup Required</Text>
                <Text size="2" style={{ display: 'block', marginBottom: '8px' }}>
                  To enable AI risk assessment, configure API keys in your <code>.env.local</code> file:
                </Text>
                <Box style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '12px',
                  backgroundColor: 'var(--gray-1)',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--gray-6)'
                }}>
                  <Text>VITE_OPENAI_API_KEY=your_key_here</Text><br/>
                  <Text>VITE_GEMINI_API_KEY=your_key_here</Text><br/>
                  <Text>VITE_OLLAMA_URL=http://localhost:11434</Text>
                </Box>
              </Box>
            )}
          </>
        )}
      </Flex>
    </Card>
  );
}
