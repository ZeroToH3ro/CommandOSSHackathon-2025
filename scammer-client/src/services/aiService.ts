import { Transaction } from '../types';

// Define a simple interface for Ollama to avoid import issues
interface OllamaClient {
  generate: (options: any) => Promise<any>;
  list: () => Promise<any>;
}

export interface AIRiskAssessment {
  riskScore: number;         // 0-100
  confidence: number;        // 0-100
  reasoning: string;
  patterns: string[];
  recommendations: string[];
  model: 'ollama';
  processingTime: number;
}

export interface TransactionContext {
  sender: string;
  recipient: string;
  amount: string;
  timestamp: number;
  contractConfig: any;
  senderHistory: any[];
  recipientHistory: any[];
  networkMetrics: any;
}

export class AIService {
  private ollamaClient?: OllamaClient;
  private requestQueue: Promise<any>[] = [];
  private maxConcurrentRequests = 2;
  private assessmentCache = new Map<string, { result: AIRiskAssessment; timestamp: number }>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize clients asynchronously
    this.initializeClients().catch(error => {
      console.warn('Failed to initialize AI clients:', error);
    });
  }

  // Validate a transaction using AI assessment
  async validateTransaction(transaction: Transaction): Promise<AIRiskAssessment> {
    return this.queueRequest(async () => {
      const context: TransactionContext = {
        sender: transaction.from,
        recipient: transaction.to,
        amount: transaction.amount.toString(),
        timestamp: transaction.timestamp,
        contractConfig: {},
        senderHistory: [],
        recipientHistory: [],
        networkMetrics: {}
      };

      return await this.assessTransactionRisk(context);
    });
  }

  // Analyze a transaction for patterns and risks
  async analyzeTransaction(transactionData: any): Promise<AIRiskAssessment> {
    return this.queueRequest(async () => {
      const context: TransactionContext = {
        sender: transactionData.sender || '',
        recipient: transactionData.recipient || '',
        amount: transactionData.amount || '0',
        timestamp: transactionData.timestamp || Date.now(),
        contractConfig: transactionData.contractConfig || {},
        senderHistory: transactionData.senderHistory || [],
        recipientHistory: transactionData.recipientHistory || [],
        networkMetrics: transactionData.networkMetrics || {}
      };

      return await this.assessTransactionRisk(context);
    });
  }

  private async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    // Simple rate limiting - wait if too many concurrent requests
    while (this.requestQueue.length >= this.maxConcurrentRequests) {
      await Promise.race(this.requestQueue);
    }

    const requestPromise = request().finally(() => {
      // Remove this request from the queue when it completes
      const index = this.requestQueue.indexOf(requestPromise);
      if (index > -1) {
        this.requestQueue.splice(index, 1);
      }
    });

    this.requestQueue.push(requestPromise);
    return requestPromise;
  }

  private async initializeClients() {
    // Initialize Ollama with browser-safe approach
    const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
    try {
      // Create a simple HTTP client for Ollama instead of using the library
      this.ollamaClient = {
        generate: async (options: any) => {
          try {
            const response = await fetch(`${ollamaUrl}/api/generate`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(options)
            });
            
            if (!response.ok) {
              throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
          } catch (error) {
            console.error('Ollama generate request failed:', error);
            throw new Error(`Failed to connect to Ollama at ${ollamaUrl}: ${error}`);
          }
        },
        list: async () => {
          try {
            const response = await fetch(`${ollamaUrl}/api/tags`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
              throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }
            
            return response.json();
          } catch (error) {
            console.error('Ollama list request failed:', error);
            throw new Error(`Failed to connect to Ollama at ${ollamaUrl}: ${error}`);
          }
        }
      };
      
      // Test the connection
      console.log('Testing Ollama connection...');
      await this.ollamaClient.list();
      console.log('Ollama client initialized successfully');
    } catch (error) {
      console.warn('Ollama client initialization failed:', error);
      this.ollamaClient = undefined;
    }
  }

  async assessTransactionRisk(
    context: TransactionContext,
    timeoutMs: number = 100000
  ): Promise<AIRiskAssessment> {
    const startTime = Date.now();

    // Create cache key based on context
    const cacheKey = this.createCacheKey(context);
    const cached = this.assessmentCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      console.log('Returning cached AI assessment');
      return {
        ...cached.result,
        processingTime: Date.now() - startTime
      };
    }

    try {
      let result: AIRiskAssessment;
      console.log(`Ollama client: ${this.ollamaClient}`);
      if (!this.ollamaClient) {
        throw new Error('Ollama not configured');
      }
      
      result = await this.assessWithOllama(context, timeoutMs);

      // Cache the result
      this.assessmentCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      return result;
    } catch (error: any) {
      console.error(`AI assessment failed with Ollama:`, error);
      
      // If Ollama fails, return a basic assessment
      const processingTime = Date.now() - startTime;
      return this.createFallbackAssessment('ollama', processingTime, error);
    }
  }

  private createCacheKey(context: TransactionContext): string {
    // Create a simple cache key based on transaction details
    return `${context.sender}-${context.recipient}-${context.amount}-${Math.floor(context.timestamp / 60000)}`; // Round to minute
  }

  private createFallbackAssessment(_model: string, processingTime: number, error: any): AIRiskAssessment {
    // Determine risk score based on error type
    let riskScore = 50; // Default neutral
    let reasoning = 'AI assessment failed, using fallback scoring';
    
    if (error?.message?.includes('timeout')) {
      riskScore = 60; // Slightly higher risk for timeouts
      reasoning = 'Assessment timed out - using moderate risk assessment';
    }

    return {
      riskScore,
      confidence: 20,
      reasoning,
      patterns: ['ai_failure'],
      recommendations: ['Manual review recommended due to AI service unavailability'],
      model: 'ollama',
      processingTime
    };
  }

  private async assessWithOllama(context: TransactionContext, timeoutMs: number): Promise<AIRiskAssessment> {
    const startTime = Date.now();
    
    const prompt = this.buildAssessmentPrompt(context);

    try {
      // Get available models first
      const modelsResponse = await this.ollamaClient!.list();
      const availableModels = modelsResponse?.models || [];
      
      if (availableModels.length === 0) {
        throw new Error('No Ollama models available. Please pull a model first (e.g., ollama pull llama2)');
      }

      const preferredModels = ['llama2', 'mistral', 'codellama', 'llama3'];
      let selectedModel = availableModels[0].name;
      
      for (const preferred of preferredModels) {
        if (availableModels.some((m: any) => m.name.includes(preferred))) {
          selectedModel = availableModels.find((m: any) => m.name.includes(preferred)).name;
          break;
        }
      }

      console.log(`Using Ollama model: ${selectedModel}`);

      // Increase timeout and add abort controller for better control
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: selectedModel,
            prompt,
            stream: false,
            options: {
              temperature: 0.3,
              num_predict: 1000,  // Reduced from 5000 for faster response
              top_p: 0.9,
              top_k: 40
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // Check if response exists and has the expected structure
        if (!result || (!result.response && !result.content)) {
          throw new Error('Invalid response from Ollama API');
        }

        const responseText = result.response || result.content || '';
        const parsed = this.parseAIResponse(responseText);
        return {
          ...parsed,
          model: 'ollama',
          processingTime: Date.now() - startTime
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error(`Ollama response timed out after ${timeoutMs}ms. Try using a smaller model or increase timeout.`);
        }
        throw error;
      }
    } catch (error) {
      console.error('Ollama assessment error:', error);
      throw error;
    }
  }

  private buildAssessmentPrompt(context: TransactionContext): string {
    return `
Analyze this blockchain transaction for scam risk:

TRANSACTION DETAILS:
- Sender: ${context.sender}
- Recipient: ${context.recipient}  
- Amount: ${context.amount} SUI
- Timestamp: ${new Date(context.timestamp).toISOString()}

SENDER HISTORY (last 10 transactions):
${JSON.stringify(context.senderHistory, null, 2)}

RECIPIENT HISTORY (last 10 transactions):
${JSON.stringify(context.recipientHistory, null, 2)}

SMART CONTRACT CONFIGURATION:
${JSON.stringify(context.contractConfig, null, 2)}

NETWORK METRICS:
${JSON.stringify(context.networkMetrics, null, 2)}

Please provide a risk assessment in the following JSON format:
{
  "riskScore": <number 0-100>,
  "confidence": <number 0-100>,
  "reasoning": "<detailed explanation>",
  "patterns": ["<pattern1>", "<pattern2>"],
  "recommendations": ["<rec1>", "<rec2>"]
}

Consider these risk factors:
1. Transaction amount relative to sender's history
2. Recipient address reputation and transaction patterns
3. Time-based patterns (rapid transactions, unusual timing)
4. Network congestion and gas price manipulation
5. Contract interaction patterns
6. Address age and transaction volume
7. Round number amounts or specific values
8. Cross-chain bridge interactions
9. DEX/DeFi protocol interactions
10. Known scammer address patterns

Provide specific, actionable insights based on the data.
`;
  }

  private parseAIResponse(response: string): Omit<AIRiskAssessment, 'model' | 'processingTime'> {
    // Handle null, undefined, or empty responses
    if (!response || typeof response !== 'string') {
      console.warn('Invalid AI response received:', response);
      return {
        riskScore: 50,
        confidence: 20,
        reasoning: 'Invalid response from AI model',
        patterns: ['invalid_response'],
        recommendations: ['Manual review recommended due to invalid AI response']
      };
    }

    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          riskScore: Math.min(100, Math.max(0, parsed.riskScore || 50)),
          confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
          reasoning: parsed.reasoning || 'No reasoning provided',
          patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        };
      }
    } catch (error) {
      console.warn('Failed to parse AI response as JSON:', error);
    }

    // Fallback parsing for non-JSON responses
    const riskScore = this.extractNumberFromText(response, ['risk', 'score']) || 50;
    const confidence = this.extractNumberFromText(response, ['confidence']) || 60;
    
    return {
      riskScore: Math.min(100, Math.max(0, riskScore)),
      confidence: Math.min(100, Math.max(0, confidence)),
      reasoning: response.length > 500 ? response.substring(0, 500) + '...' : response,
      patterns: this.extractPatternsFromText(response),
      recommendations: this.extractRecommendationsFromText(response)
    };
  }

  private extractNumberFromText(text: string, keywords: string[]): number | null {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[^\\d]*([\\d.]+)`, 'i');
      const match = text.match(regex);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  private extractPatternsFromText(text: string): string[] {
    const commonPatterns = [
      'rapid_transactions', 'large_transfer', 'unusual_timing',
      'round_amounts', 'new_address', 'high_frequency',
      'suspicious_contract', 'bridge_interaction'
    ];
    
    return commonPatterns.filter(pattern => 
      text.toLowerCase().includes(pattern.replace('_', ' '))
    );
  }

  private extractRecommendationsFromText(text: string): string[] {
    const recommendations = [];
    if (text.toLowerCase().includes('block') || text.toLowerCase().includes('reject')) {
      recommendations.push('Consider blocking this transaction');
    }
    if (text.toLowerCase().includes('monitor') || text.toLowerCase().includes('watch')) {
      recommendations.push('Increase monitoring for these addresses');
    }
    if (text.toLowerCase().includes('investigate') || text.toLowerCase().includes('review')) {
      recommendations.push('Manual investigation recommended');
    }
    return recommendations;
  }

  // Check which AI models are available
  async getAvailableModels(): Promise<string[]> {
    const available = [];
    
    if (this.ollamaClient) {
      try {
        const result = await this.ollamaClient.list();
        // Check if models are actually available
        if (result && result.models && result.models.length > 0) {
          available.push('ollama');
        }
      } catch (error) {
        console.warn('Ollama not available:', error);
        // Remove the client if it's not working
        this.ollamaClient = undefined;
      }
    }

    return available;
  }

  // Check Ollama connection status
  async checkOllamaStatus(): Promise<{connected: boolean, models: string[], error?: string}> {
    const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
    
    try {
      if (!this.ollamaClient) {
        return {
          connected: false,
          models: [],
          error: 'Ollama client not initialized'
        };
      }

      const result = await this.ollamaClient.list();
      const models = result?.models?.map((m: any) => m.name) || [];
      
      return {
        connected: true,
        models,
        error: models.length === 0 ? 'No models available. Please pull a model first (e.g., ollama pull llama2)' : undefined
      };
    } catch (error) {
      return {
        connected: false,
        models: [],
        error: `Cannot connect to Ollama at ${ollamaUrl}. Please ensure Ollama is running.`
      };
    }
  }
}

export const aiService = new AIService();
