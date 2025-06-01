import { useState, useEffect } from 'react';
import { Card, Flex, Text, Button, Heading, Box, Badge } from '@radix-ui/themes';
import { 
  ExclamationTriangleIcon, 
  CheckCircledIcon,
  MagnifyingGlassIcon,
  LightningBoltIcon
} from '@radix-ui/react-icons';
import { aiService, AIRiskAssessment, TransactionContext } from '../../services/aiService';
import { SuiTransactionService } from '../../services/suiTransactionService';
import { useScamDetector } from '../../hooks/useScamDetector';
import { useSuiClient } from '@mysten/dapp-kit';
import { AIRiskValidator } from './AIRiskValidator';

interface EnhancedTransactionAnalyzerProps {
  sender: string;
  recipient: string;
  amount: string;
  onAnalysisComplete?: (result: CombinedRiskAnalysis) => void;
}

interface CombinedRiskAnalysis {
  aiAssessment: AIRiskAssessment | null;
  ruleBasedScore: number;
  finalRiskScore: number;
  recommendation: 'allow' | 'warn' | 'block';
  reasoning: string;
  patterns: string[];
  timestamp: number;
}

export function EnhancedTransactionAnalyzer({ 
  sender, 
  recipient, 
  amount, 
  onAnalysisComplete 
}: EnhancedTransactionAnalyzerProps) {
  const [analysis, setAnalysis] = useState<CombinedRiskAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { contractDeployed } = useScamDetector();
  const suiClient = useSuiClient();
  const transactionService = new SuiTransactionService(suiClient);

  useEffect(() => {
    if (sender && recipient && amount && contractDeployed) {
      performEnhancedAnalysis();
    }
  }, [sender, recipient, amount, contractDeployed]);

  const performEnhancedAnalysis = async () => {
    if (!sender || !recipient || !amount) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Gather comprehensive data
      const [
        senderData,
        recipientData,
        networkMetrics,
        senderPatterns,
        recipientPatterns
      ] = await Promise.all([
        transactionService.getComprehensiveHistory(sender, 20),
        transactionService.getComprehensiveHistory(recipient, 20),
        transactionService.getNetworkMetrics(),
        transactionService.analyzeTransactionPatterns(sender),
        transactionService.analyzeTransactionPatterns(recipient)
      ]);

      // 2. Calculate rule-based risk score
      const ruleBasedScore = calculateRuleBasedRisk({
        sender,
        recipient,
        amount,
        senderData,
        recipientData,
        senderPatterns,
        recipientPatterns
      });

      // 3. Prepare context for AI assessment
      const aiContext: TransactionContext = {
        sender,
        recipient,
        amount,
        timestamp: Date.now(),
        contractConfig: {
          enabled: true,
          risk_weight: 30,
          confidence_threshold: 70
        },
        senderHistory: senderData.sent.slice(0, 10),
        recipientHistory: recipientData.received.slice(0, 10),
        networkMetrics
      };

      // 4. Get AI assessment
      let aiAssessment: AIRiskAssessment | null = null;
      try {
        aiAssessment = await aiService.assessTransactionRisk(aiContext, 'gpt', 5000);
      } catch (aiError) {
        console.warn('AI assessment failed, using rule-based only:', aiError);
      }

      // 5. Combine AI and rule-based scores
      const finalResult = combineRiskScores(ruleBasedScore, aiAssessment);

      setAnalysis(finalResult);
      onAnalysisComplete?.(finalResult);

    } catch (error) {
      console.error('Enhanced analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const calculateRuleBasedRisk = (data: any): number => {
    let riskScore = 0;
    const patterns: string[] = [];

    // Amount-based risk
    const amountNum = parseFloat(data.amount);
    if (amountNum > 1000) {
      riskScore += 25;
      patterns.push('large_amount');
    }

    // Pattern-based risk
    if (data.senderPatterns.rapidTransactions) {
      riskScore += 20;
      patterns.push('rapid_transactions');
    }

    if (data.senderPatterns.highFailureRate) {
      riskScore += 15;
      patterns.push('high_failure_rate');
    }

    if (data.senderPatterns.newAddress) {
      riskScore += 10;
      patterns.push('new_address');
    }

    if (data.senderPatterns.unusualTiming) {
      riskScore += 10;
      patterns.push('unusual_timing');
    }

    if (data.recipientPatterns.suspiciousAmounts) {
      riskScore += 15;
      patterns.push('suspicious_amounts');
    }

    // Transaction history analysis
    if (data.senderData.metrics.successRate < 70) {
      riskScore += 10;
      patterns.push('low_success_rate');
    }

    if (data.senderData.metrics.programmableTransactionRatio > 80) {
      riskScore += 5;
      patterns.push('high_contract_interaction');
    }

    return Math.min(100, riskScore);
  };

  const combineRiskScores = (
    ruleBasedScore: number, 
    aiAssessment: AIRiskAssessment | null
  ): CombinedRiskAnalysis => {
    let finalScore = ruleBasedScore;
    let reasoning = `Rule-based analysis: ${ruleBasedScore}% risk`;

    if (aiAssessment && aiAssessment.confidence >= 70) {
      // Weight AI assessment based on confidence
      const aiWeight = 0.4; // 40% weight for AI, 60% for rules
      finalScore = Math.round(
        (ruleBasedScore * (1 - aiWeight)) + (aiAssessment.riskScore * aiWeight)
      );
      reasoning = `Combined analysis: ${ruleBasedScore}% (rules) + ${aiAssessment.riskScore}% (AI) = ${finalScore}%`;
    }

    // Determine recommendation
    let recommendation: 'allow' | 'warn' | 'block';
    if (finalScore >= 80) {
      recommendation = 'block';
    } else if (finalScore >= 50) {
      recommendation = 'warn';
    } else {
      recommendation = 'allow';
    }

    // Combine patterns
    const allPatterns = [
      ...(aiAssessment?.patterns || []),
      // Add rule-based patterns based on score
    ];

    return {
      aiAssessment,
      ruleBasedScore,
      finalRiskScore: finalScore,
      recommendation,
      reasoning,
      patterns: [...new Set(allPatterns)], // Remove duplicates
      timestamp: Date.now()
    };
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'block': return 'red';
      case 'warn': return 'orange';
      case 'allow': return 'green';
      default: return 'gray';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'block':
        return <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--red-9)' }} />;
      case 'warn':
        return <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--orange-9)' }} />;
      case 'allow':
        return <CheckCircledIcon style={{ width: '20px', height: '20px', color: 'var(--green-9)' }} />;
      default:
        return <MagnifyingGlassIcon style={{ width: '20px', height: '20px', color: 'var(--gray-9)' }} />;
    }
  };

  return (
    <Box>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Card>
          <Flex p="4" justify="between" align="center">
            <Heading size="5">Enhanced Transaction Analysis</Heading>
            <Button 
              onClick={performEnhancedAnalysis}
              disabled={loading}
              size="2"
            >
              <LightningBoltIcon />
              {loading ? 'Analyzing...' : 'Re-analyze'}
            </Button>
          </Flex>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <Flex p="6" direction="column" align="center" gap="4">
              <LightningBoltIcon style={{ width: '48px', height: '48px', color: 'var(--blue-9)' }} />
              <Box style={{ textAlign: 'center' }}>
                <Heading size="4" mb="2">Analyzing Transaction</Heading>
                <Text color="gray">
                  Gathering transaction history, network data, and AI insights...
                </Text>
              </Box>
            </Flex>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <Flex p="4" align="center" gap="3" style={{ backgroundColor: 'var(--red-2)' }}>
              <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--red-9)' }} />
              <Box>
                <Text weight="medium" color="red">Analysis Failed</Text>
                <Text size="2" color="gray">{error}</Text>
              </Box>
            </Flex>
          </Card>
        )}

        {/* Combined Analysis Results */}
        {analysis && (
          <Card>
            <Flex p="4" direction="column" gap="4">
              <Flex justify="between" align="center">
                <Flex align="center" gap="3">
                  {getRecommendationIcon(analysis.recommendation)}
                  <Box>
                    <Text size="6" weight="bold" color={getRecommendationColor(analysis.recommendation)}>
                      {analysis.finalRiskScore}% Risk
                    </Text>
                    <Text size="2" color="gray">
                      Combined Rule-based + AI Analysis
                    </Text>
                  </Box>
                </Flex>
                <Badge 
                  color={getRecommendationColor(analysis.recommendation)}
                  size="3"
                  variant="solid"
                >
                  {analysis.recommendation.toUpperCase()}
                </Badge>
              </Flex>

              {/* Score Breakdown */}
              <Box style={{ 
                padding: '12px', 
                backgroundColor: 'var(--gray-2)', 
                borderRadius: '8px',
                border: '1px solid var(--gray-6)'
              }}>
                <Text weight="medium" mb="2">Score Breakdown</Text>
                <Flex direction="column" gap="2">
                  <Flex justify="between">
                    <Text size="2">Rule-based Analysis:</Text>
                    <Text size="2" weight="medium">{analysis.ruleBasedScore}%</Text>
                  </Flex>
                  {analysis.aiAssessment && (
                    <Flex justify="between">
                      <Text size="2">AI Assessment ({analysis.aiAssessment.model}):</Text>
                      <Text size="2" weight="medium">
                        {analysis.aiAssessment.riskScore}% 
                        <Text color="gray" ml="1">({analysis.aiAssessment.confidence}% confidence)</Text>
                      </Text>
                    </Flex>
                  )}
                  <Box style={{ borderTop: '1px solid var(--gray-6)', paddingTop: '8px' }}>
                    <Flex justify="between">
                      <Text size="2" weight="bold">Final Score:</Text>
                      <Text size="2" weight="bold" color={getRecommendationColor(analysis.recommendation)}>
                        {analysis.finalRiskScore}%
                      </Text>
                    </Flex>
                  </Box>
                </Flex>
              </Box>

              {/* Reasoning */}
              <Box>
                <Text weight="medium" mb="2">Analysis Reasoning</Text>
                <Text size="2" style={{ 
                  padding: '8px', 
                  backgroundColor: 'var(--gray-1)', 
                  borderRadius: '6px',
                  border: '1px solid var(--gray-6)',
                  display: 'block'
                }}>
                  {analysis.reasoning}
                </Text>
              </Box>

              {/* Detected Patterns */}
              {analysis.patterns.length > 0 && (
                <Box>
                  <Text weight="medium" mb="2">Detected Risk Patterns</Text>
                  <Flex gap="2" wrap="wrap">
                    {analysis.patterns.map((pattern, index) => (
                      <Badge key={index} color="orange" variant="soft" size="1">
                        {pattern.replace('_', ' ')}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
            </Flex>
          </Card>
        )}

        {/* AI Component */}
        <AIRiskValidator
          sender={sender}
          recipient={recipient}
          amount={amount}
          enabled={contractDeployed}
        />
      </Flex>
    </Box>
  );
}
