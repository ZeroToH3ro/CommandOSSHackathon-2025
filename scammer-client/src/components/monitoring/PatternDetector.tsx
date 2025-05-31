import { useEffect, useState, useCallback } from 'react';
import { Box, Card, Text, Badge, Flex, Button, Progress } from '@radix-ui/themes';
import { ExclamationTriangleIcon, SizeIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { Transaction, SuspiciousActivity } from '../../types/transactions';
import { useAlerts } from '../../hooks/useAlerts';

interface PatternDetectorProps {
  transactions: Transaction[];
  onPatternDetected?: (pattern: SuspiciousActivity) => void;
  autoAnalyze?: boolean;
  showDetails?: boolean;
}

interface DetectionResult {
  patterns: SuspiciousActivity[];
  riskScore: number;
  analysisTime: number;
}

export function PatternDetector({ 
  transactions, 
  onPatternDetected,
  autoAnalyze = true,
  showDetails = false 
}: PatternDetectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const { addAlert } = useAlerts();

  // Pattern detection algorithms
  const detectRapidTransactions = useCallback((txs: Transaction[]): SuspiciousActivity[] => {
    const patterns: SuspiciousActivity[] = [];
    const sortedTxs = [...txs].sort((a, b) => b.timestamp - a.timestamp);
    const fiveMinutes = 5 * 60 * 1000;
    
    let rapidSequences: Transaction[][] = [];
    let currentSequence: Transaction[] = [];
    
    for (let i = 0; i < sortedTxs.length - 1; i++) {
      const current = sortedTxs[i];
      const next = sortedTxs[i + 1];
      
      if (current.timestamp - next.timestamp < fiveMinutes) {
        if (currentSequence.length === 0) {
          currentSequence.push(current);
        }
        currentSequence.push(next);
      } else {
        if (currentSequence.length >= 3) {
          rapidSequences.push([...currentSequence]);
        }
        currentSequence = [];
      }
    }
    
    if (currentSequence.length >= 3) {
      rapidSequences.push(currentSequence);
    }
    
    rapidSequences.forEach((sequence, index) => {
      const severity = sequence.length > 10 ? 'critical' : sequence.length > 5 ? 'high' : 'medium';
      patterns.push({
        id: `rapid_${Date.now()}_${index}`,
        type: 'rapid_transactions',
        severity,
        description: `${sequence.length} transactions within 5 minutes`,
        transactionIds: sequence.map(tx => tx.id),
        detectedAt: Date.now(),
        riskScore: Math.min(sequence.length * 10, 100),
        metadata: {
          sequenceLength: sequence.length,
          timeSpan: sequence[0].timestamp - sequence[sequence.length - 1].timestamp,
          averageAmount: sequence.reduce((sum, tx) => sum + tx.amount, 0) / sequence.length
        }
      });
    });
    
    return patterns;
  }, []);

  const detectLargeTransfers = useCallback((txs: Transaction[]): SuspiciousActivity[] => {
    const patterns: SuspiciousActivity[] = [];
    const largeThreshold = 1000; // 1000 SUI
    
    const largeTxs = txs.filter(tx => 
      tx.amount > largeThreshold && (tx.type === 'send' || tx.type === 'receive')
    );
    
    if (largeTxs.length > 0) {
      const totalAmount = largeTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const avgAmount = totalAmount / largeTxs.length;
      
      patterns.push({
        id: `large_transfer_${Date.now()}`,
        type: 'large_transfer',
        severity: avgAmount > 10000 ? 'critical' : avgAmount > 5000 ? 'high' : 'medium',
        description: `${largeTxs.length} large transactions totaling ${totalAmount.toFixed(2)} SUI`,
        transactionIds: largeTxs.map(tx => tx.id),
        detectedAt: Date.now(),
        riskScore: Math.min(Math.floor(avgAmount / 100), 100),
        metadata: {
          totalAmount,
          averageAmount: avgAmount,
          largestTransaction: Math.max(...largeTxs.map(tx => tx.amount))
        }
      });
    }
    
    return patterns;
  }, []);

  const detectUnusualContractActivity = useCallback((txs: Transaction[]): SuspiciousActivity[] => {
    const patterns: SuspiciousActivity[] = [];
    const contractTxs = txs.filter(tx => tx.type === 'contract');
    const contractPercentage = (contractTxs.length / txs.length) * 100;
    
    if (contractPercentage > 70) { // More than 70% contract interactions
      patterns.push({
        id: `unusual_contract_${Date.now()}`,
        type: 'unusual_contract',
        severity: contractPercentage > 90 ? 'high' : 'medium',
        description: `${contractPercentage.toFixed(1)}% of transactions are contract interactions`,
        transactionIds: contractTxs.map(tx => tx.id),
        detectedAt: Date.now(),
        riskScore: Math.floor(contractPercentage),
        metadata: {
          contractPercentage,
          totalContracts: contractTxs.length,
          uniqueContracts: new Set(contractTxs.map(tx => tx.to)).size
        }
      });
    }
    
    return patterns;
  }, []);

  const detectFailedTransactionSpike = useCallback((txs: Transaction[]): SuspiciousActivity[] => {
    const patterns: SuspiciousActivity[] = [];
    const failedTxs = txs.filter(tx => tx.status === 'failed');
    const failureRate = (failedTxs.length / txs.length) * 100;
    
    if (failedTxs.length > 3 && failureRate > 20) {
      patterns.push({
        id: `failed_spike_${Date.now()}`,
        type: 'failed_spike',
        severity: failureRate > 50 ? 'high' : 'medium',
        description: `${failedTxs.length} failed transactions (${failureRate.toFixed(1)}% failure rate)`,
        transactionIds: failedTxs.map(tx => tx.id),
        detectedAt: Date.now(),
        riskScore: Math.floor(failureRate),
        metadata: {
          failureRate,
          totalFailed: failedTxs.length,
          commonFailureReasons: ['Gas limit exceeded', 'Insufficient balance', 'Contract error']
        }
      });
    }
    
    return patterns;
  }, []);

  const detectRoundAmountPattern = useCallback((txs: Transaction[]): SuspiciousActivity[] => {
    const patterns: SuspiciousActivity[] = [];
    const roundAmountTxs = txs.filter(tx => {
      const amount = tx.amount;
      return amount > 0 && amount % 1 === 0 && amount % 10 === 0;
    });
    
    if (roundAmountTxs.length > 5 && (roundAmountTxs.length / txs.length) > 0.3) {
      patterns.push({
        id: `round_amounts_${Date.now()}`,
        type: 'round_amounts',
        severity: 'low',
        description: `${roundAmountTxs.length} transactions with round amounts (potential bot activity)`,
        transactionIds: roundAmountTxs.map(tx => tx.id),
        detectedAt: Date.now(),
        riskScore: 25,
        metadata: {
          roundAmountCount: roundAmountTxs.length,
          percentage: (roundAmountTxs.length / txs.length) * 100,
          commonAmounts: [...new Set(roundAmountTxs.map(tx => tx.amount))].slice(0, 5)
        }
      });
    }
    
    return patterns;
  }, []);

  // Main analysis function
  const analyzePatterns = useCallback(async () => {
    if (transactions.length === 0) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      const startTime = Date.now();
      const allPatterns: SuspiciousActivity[] = [];
      
      // Run each detection algorithm with progress updates
      setAnalysisProgress(20);
      const rapidPatterns = detectRapidTransactions(transactions);
      allPatterns.push(...rapidPatterns);
      
      setAnalysisProgress(40);
      const largeTransferPatterns = detectLargeTransfers(transactions);
      allPatterns.push(...largeTransferPatterns);
      
      setAnalysisProgress(60);
      const contractPatterns = detectUnusualContractActivity(transactions);
      allPatterns.push(...contractPatterns);
      
      setAnalysisProgress(80);
      const failedPatterns = detectFailedTransactionSpike(transactions);
      allPatterns.push(...failedPatterns);
      
      const roundAmountPatterns = detectRoundAmountPattern(transactions);
      allPatterns.push(...roundAmountPatterns);
      
      setAnalysisProgress(100);
      
      // Calculate overall risk score
      const riskScore = Math.min(
        allPatterns.reduce((sum, pattern) => sum + pattern.riskScore, 0) / Math.max(allPatterns.length, 1),
        100
      );
      
      const analysisTime = Date.now() - startTime;
      
      const result: DetectionResult = {
        patterns: allPatterns,
        riskScore,
        analysisTime
      };
      
      setDetectionResult(result);
      
      // Notify about detected patterns
      allPatterns.forEach(pattern => {
        onPatternDetected?.(pattern);
        
        // Create alerts for high-risk patterns
        if (pattern.severity === 'high' || pattern.severity === 'critical') {
          addAlert({
            type: 'warning',
            title: `Suspicious Pattern Detected`,
            message: pattern.description,
            severity: pattern.severity,
            autoClose: false
          });
        }
      });
      
    } catch (error) {
      console.error('Pattern analysis failed:', error);
      addAlert({
        type: 'error',
        title: 'Analysis Error',
        message: 'Failed to analyze transaction patterns',
        severity: 'medium'
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  }, [transactions, detectRapidTransactions, detectLargeTransfers, detectUnusualContractActivity, detectFailedTransactionSpike, detectRoundAmountPattern, onPatternDetected, addAlert]);

  // Auto-analyze when transactions change
  useEffect(() => {
    if (autoAnalyze && transactions.length > 0) {
      const timer = setTimeout(() => {
        analyzePatterns();
      }, 1000); // Debounce analysis
      
      return () => clearTimeout(timer);
    }
  }, [transactions, autoAnalyze, analyzePatterns]);

  const getSeverityColor = (severity: SuspiciousActivity['severity']) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getSeverityIcon = (severity: SuspiciousActivity['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'medium':
        return <InfoCircledIcon className="w-4 h-4" />;
      default:
        return <SizeIcon className="w-4 h-4" />;
    }
  };

  if (!showDetails && !isAnalyzing && !detectionResult) {
    return null;
  }

  return (
    <Box className="space-y-4">
      {/* Analysis Status */}
      <Card className="p-4">
        <Flex justify="between" align="center" className="mb-3">
          <Text weight="bold" size="4">Pattern Detection</Text>
          <Button 
            variant="outline" 
            size="2" 
            onClick={analyzePatterns}
            disabled={isAnalyzing || transactions.length === 0}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Patterns'}
          </Button>
        </Flex>
        
        {isAnalyzing && (
          <Box className="space-y-2">
            <Progress value={analysisProgress} className="w-full" />
            <Text size="2" color="gray">
              Analyzing {transactions.length} transactions...
            </Text>
          </Box>
        )}
        
        {detectionResult && !isAnalyzing && (
          <Flex justify="between" align="center">
            <Box>
              <Text size="2" color="gray">
                {detectionResult.patterns.length} patterns detected
              </Text>
              <Text size="1" color="gray">
                Analysis completed in {detectionResult.analysisTime}ms
              </Text>
            </Box>
            <Badge 
              color={detectionResult.riskScore > 70 ? 'red' : detectionResult.riskScore > 40 ? 'yellow' : 'green'}
              size="2"
            >
              Risk: {detectionResult.riskScore.toFixed(0)}
            </Badge>
          </Flex>
        )}
      </Card>
      
      {/* Detected Patterns */}
      {detectionResult && detectionResult.patterns.length > 0 && (
        <Box className="space-y-3">
          <Text weight="bold" size="3">Detected Patterns</Text>
          {detectionResult.patterns.map((pattern) => (
            <Card key={pattern.id} className="p-4 border-l-4" style={{ borderLeftColor: `var(--${getSeverityColor(pattern.severity)}-9)` }}>
              <Flex justify="between" align="start" className="mb-2">
                <Flex align="center" gap="2">
                  {getSeverityIcon(pattern.severity)}
                  <Text weight="bold" size="3">{pattern.type.replace(/_/g, ' ').toUpperCase()}</Text>
                </Flex>
                <Badge color={getSeverityColor(pattern.severity)} size="1">
                  {pattern.severity.toUpperCase()}
                </Badge>
              </Flex>
              
              <Text size="2" className="mb-2">{pattern.description}</Text>
              
              <Flex justify="between" align="center" className="text-sm">
                <Text size="1" color="gray">
                  {pattern.transactionIds.length} transactions affected
                </Text>
                <Text size="1" color="gray">
                  Risk Score: {pattern.riskScore}
                </Text>
              </Flex>
              
              {showDetails && pattern.metadata && (
                <Box className="mt-3 p-2 bg-gray-50 rounded">
                  <Text size="1" weight="bold" className="mb-1">Details:</Text>
                  <pre className="text-xs">
                    {JSON.stringify(pattern.metadata, null, 2)}
                  </pre>
                </Box>
              )}
            </Card>
          ))}
        </Box>
      )}
      
      {/* No Patterns Detected */}
      {detectionResult && detectionResult.patterns.length === 0 && (
        <Card className="p-6 text-center">
          <SizeIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <Text color="green" weight="bold">No Suspicious Patterns Detected</Text>
          <Text size="2" color="gray" className="mt-1">
            Your wallet activity appears normal
          </Text>
        </Card>
      )}
    </Box>
  );
}