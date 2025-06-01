import { useState, useEffect } from 'react';
import { Card, Flex, Text, Button, Heading, Box, Badge, Separator } from '@radix-ui/themes';
import { 
  ExclamationTriangleIcon, 
  CheckCircledIcon, 
  CrossCircledIcon,
  ClockIcon,
  GearIcon
} from '@radix-ui/react-icons';
import { aiService, AIRiskAssessment, TransactionContext } from '../../services/aiService';
import { useScamDetector } from '../../hooks/useScamDetector';

interface AIRiskValidatorProps {
  sender: string;
  recipient: string;
  amount: string;
  onRiskAssessment?: (assessment: AIRiskAssessment) => void;
  enabled?: boolean;
}

export function AIRiskValidator({ 
  sender, 
  recipient, 
  amount, 
  onRiskAssessment,
  enabled = true 
}: AIRiskValidatorProps) {
  const [assessment, setAssessment] = useState<AIRiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<'gpt' | 'gemini' | 'ollama'>('gpt');

  const { contractDeployed } = useScamDetector();

  useEffect(() => {
    checkAvailableModels();
  }, []);

  useEffect(() => {
    if (enabled && sender && recipient && amount && contractDeployed) {
      performRiskAssessment();
    }
  }, [sender, recipient, amount, enabled, contractDeployed, selectedModel]);

  const checkAvailableModels = async () => {
    try {
      const models = await aiService.getAvailableModels();
      setAvailableModels(models);
      
      // Set default model to first available
      if (models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(models[0] as any);
      }
    } catch (error) {
      console.error('Error checking available models:', error);
    }
  };

  const performRiskAssessment = async () => {
    if (!sender || !recipient || !amount) return;

    setLoading(true);
    setError(null);

    try {
      // Build transaction context (would be enhanced with real data)
      const context: TransactionContext = {
        sender,
        recipient,
        amount,
        timestamp: Date.now(),
        contractConfig: {
          // Would fetch from smart contract
          enabled: true,
          risk_weight: 30,
          confidence_threshold: 70
        },
        senderHistory: [],   // Would fetch from Sui network
        recipientHistory: [], // Would fetch from Sui network
        networkMetrics: {}   // Would fetch current network state
      };

      const result = await aiService.assessTransactionRisk(
        context,
        selectedModel,
        5000 // 5 second timeout
      );

      setAssessment(result);
      onRiskAssessment?.(result);
    } catch (error) {
      console.error('AI risk assessment failed:', error);
      setError(error instanceof Error ? error.message : 'Assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'red';
    if (score >= 60) return 'orange';
    if (score >= 40) return 'yellow';
    return 'green';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  };

  if (!enabled) {
    return (
      <Card>
        <Flex p="4" align="center" gap="3">
          <CrossCircledIcon style={{ width: '20px', height: '20px', color: 'var(--gray-9)' }} />
          <Text color="gray">AI Risk Assessment Disabled</Text>
        </Flex>
      </Card>
    );
  }

  if (availableModels.length === 0) {
    return (
      <Card>
        <Flex p="4" align="center" gap="3">
          <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--orange-9)' }} />
          <Box>
            <Text weight="medium" color="orange">No AI Models Available</Text>
            <Text size="2" color="gray">
              Configure API keys for OpenAI, Gemini, or Ollama to enable AI risk assessment
            </Text>
          </Box>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex p="4" direction="column" gap="4">
        <Flex justify="between" align="center">
          <Heading size="4">AI Risk Assessment</Heading>
          <Flex gap="2" align="center">
            <GearIcon style={{ width: '16px', height: '16px' }} />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gray-6)',
                backgroundColor: 'var(--gray-1)',
                fontSize: '12px'
              }}
            >
              {availableModels.map(model => (
                <option key={model} value={model}>
                  {model.toUpperCase()}
                </option>
              ))}
            </select>
          </Flex>
        </Flex>

        {loading && (
          <Flex align="center" gap="3" p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: '6px' }}>
            <ClockIcon style={{ width: '20px', height: '20px', color: 'var(--blue-9)' }} />
            <Box>
              <Text weight="medium">Analyzing Transaction...</Text>
              <Text size="2" color="gray">AI model processing risk factors</Text>
            </Box>
          </Flex>
        )}

        {error && (
          <Flex align="center" gap="3" p="3" style={{ backgroundColor: 'var(--red-2)', borderRadius: '6px' }}>
            <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--red-9)' }} />
            <Box>
              <Text weight="medium" color="red">Assessment Failed</Text>
              <Text size="2" color="gray">{error}</Text>
            </Box>
          </Flex>
        )}

        {assessment && (
          <Box>
            {/* Risk Score Header */}
            <Flex justify="between" align="center" mb="3">
              <Flex align="center" gap="3">
                {assessment.riskScore >= 60 ? (
                  <ExclamationTriangleIcon style={{ width: '24px', height: '24px', color: `var(--${getRiskColor(assessment.riskScore)}-9)` }} />
                ) : (
                  <CheckCircledIcon style={{ width: '24px', height: '24px', color: 'var(--green-9)' }} />
                )}
                <Box>
                  <Text size="5" weight="bold" color={getRiskColor(assessment.riskScore)}>
                    {assessment.riskScore}% Risk
                  </Text>
                  <Text size="2" color="gray">
                    {assessment.confidence}% confidence • {assessment.processingTime}ms
                  </Text>
                </Box>
              </Flex>
              <Badge 
                color={getRiskColor(assessment.riskScore)} 
                size="2"
                variant="solid"
              >
                {getRiskLevel(assessment.riskScore)}
              </Badge>
            </Flex>

            <Separator mb="3" />

            {/* AI Reasoning */}
            <Box mb="3">
              <Text weight="medium" mb="2">AI Analysis</Text>
              <Text size="2" style={{ 
                padding: '8px', 
                backgroundColor: 'var(--gray-2)', 
                borderRadius: '6px',
                border: '1px solid var(--gray-6)',
                display: 'block',
                lineHeight: '1.4'
              }}>
                {assessment.reasoning}
              </Text>
            </Box>

            {/* Detected Patterns */}
            {assessment.patterns.length > 0 && (
              <Box mb="3">
                <Text weight="medium" mb="2">Detected Patterns</Text>
                <Flex gap="2" wrap="wrap">
                  {assessment.patterns.map((pattern, index) => (
                    <Badge key={index} color="orange" variant="soft" size="1">
                      {pattern.replace('_', ' ')}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Recommendations */}
            {assessment.recommendations.length > 0 && (
              <Box>
                <Text weight="medium" mb="2">Recommendations</Text>
                <Box style={{ fontSize: '14px' }}>
                  {assessment.recommendations.map((rec, index) => (
                    <Text key={index} size="2" style={{ display: 'block', marginBottom: '4px' }}>
                      • {rec}
                    </Text>
                  ))}
                </Box>
              </Box>
            )}

            {/* Model Attribution */}
            <Flex justify="between" align="center" mt="3" pt="3" style={{ borderTop: '1px solid var(--gray-6)' }}>
              <Text size="1" color="gray">
                Powered by {assessment.model.toUpperCase()}
              </Text>
              <Button 
                size="1" 
                variant="ghost" 
                onClick={performRiskAssessment}
                disabled={loading}
              >
                Re-analyze
              </Button>
            </Flex>
          </Box>
        )}

        {/* Configuration Info */}
        <Box style={{ 
          padding: '8px', 
          backgroundColor: 'var(--blue-2)', 
          borderRadius: '6px',
          border: '1px solid var(--blue-6)'
        }}>
          <Text size="1" color="blue">
            💡 AI assessment is combined with rule-based analysis for final risk scoring
          </Text>
        </Box>
      </Flex>
    </Card>
  );
}
