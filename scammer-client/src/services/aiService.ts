import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  model: 'gpt' | 'gemini' | 'ollama';
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
  private openaiClient?: OpenAI;
  private geminiClient?: GoogleGenerativeAI;
  private ollamaClient?: OllamaClient;

  constructor() {
    // Initialize clients asynchronously
    this.initializeClients().catch(error => {
      console.warn('Failed to initialize AI clients:', error);
    });
  }

  // Validate a transaction using AI assessment
  async validateTransaction(transaction: Transaction): Promise<AIRiskAssessment> {
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
  }

  // Analyze a transaction for patterns and risks
  async analyzeTransaction(transactionData: any): Promise<AIRiskAssessment> {
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
  }

  private async initializeClients() {
    // Initialize OpenAI if API key is available
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (openaiKey) {
      this.openaiClient = new OpenAI({
        apiKey: openaiKey,
        dangerouslyAllowBrowser: true
      });
    }

    // Initialize Gemini if API key is available
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
    }

    // Initialize Ollama with browser-safe approach
    const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
    try {
      // Create a simple HTTP client for Ollama instead of using the library
      this.ollamaClient = {
        generate: async (options: any) => {
          const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
          });
          return response.json();
        },
        list: async () => {
          const response = await fetch(`${ollamaUrl}/api/tags`);
          return response.json();
        }
      };
    } catch (error) {
      console.warn('Ollama client initialization failed:', error);
    }
  }

  async assessTransactionRisk(
    context: TransactionContext,
    preferredModel: 'gpt' | 'gemini' | 'ollama' = 'gpt',
    timeoutMs: number = 5000
  ): Promise<AIRiskAssessment> {
    const startTime = Date.now();

    try {
      switch (preferredModel) {
        case 'gpt':
          if (!this.openaiClient) throw new Error('OpenAI not configured');
          return await this.assessWithGPT(context, timeoutMs);
        case 'gemini':
          if (!this.geminiClient) throw new Error('Gemini not configured');
          return await this.assessWithGemini(context, timeoutMs);
        case 'ollama':
          if (!this.ollamaClient) throw new Error('Ollama not configured');
          return await this.assessWithOllama(context, timeoutMs);
        default:
          throw new Error(`Unsupported model: ${preferredModel}`);
      }
    } catch (error) {
      console.error(`AI assessment failed with ${preferredModel}:`, error);
      
      // Try fallback to next available model
      const fallbackModels = ['gpt', 'gemini', 'ollama'].filter(m => m !== preferredModel);
      for (const fallback of fallbackModels) {
        try {
          const result = await this.assessTransactionRisk(context, fallback as any, timeoutMs);
          return result;
        } catch (fallbackError) {
          console.warn(`Fallback to ${fallback} also failed:`, fallbackError);
        }
      }

      // If all models fail, return a basic assessment
      const processingTime = Date.now() - startTime;
      return {
        riskScore: 50, // Neutral risk when AI fails
        confidence: 20,
        reasoning: 'AI assessment failed, using fallback scoring',
        patterns: ['ai_failure'],
        recommendations: ['Manual review recommended'],
        model: preferredModel,
        processingTime
      };
    }
  }

  private async assessWithGPT(context: TransactionContext, timeoutMs: number): Promise<AIRiskAssessment> {
    const startTime = Date.now();
    
    const prompt = this.buildAssessmentPrompt(context);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.openaiClient!.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert blockchain transaction analyst specializing in scam detection. Analyze transactions and provide risk assessments with numerical scores and detailed reasoning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const result = this.parseAIResponse(response.choices[0].message.content || '');
      return {
        ...result,
        model: 'gpt',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async assessWithGemini(context: TransactionContext, timeoutMs: number): Promise<AIRiskAssessment> {
    const startTime = Date.now();
    
    const model = this.geminiClient!.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = this.buildAssessmentPrompt(context);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await model.generateContent(prompt);
      clearTimeout(timeoutId);
      
      const response = await result.response;
      const text = response.text();
      
      const parsed = this.parseAIResponse(text);
      return {
        ...parsed,
        model: 'gemini',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async assessWithOllama(context: TransactionContext, timeoutMs: number): Promise<AIRiskAssessment> {
    const startTime = Date.now();
    
    const prompt = this.buildAssessmentPrompt(context);

    try {
      const response = await Promise.race([
        this.ollamaClient!.generate({
          model: 'llama2', // or 'mistral', 'codellama', etc.
          prompt,
          stream: false
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ollama timeout')), timeoutMs)
        )
      ]) as any;

      const parsed = this.parseAIResponse(response.response);
      return {
        ...parsed,
        model: 'ollama',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
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
      reasoning: response.substring(0, 500) + '...',
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
    
    if (this.openaiClient) {
      try {
        await this.openaiClient.models.list();
        available.push('gpt');
      } catch (error) {
        console.warn('OpenAI not available:', error);
      }
    }

    if (this.geminiClient) {
      available.push('gemini');
    }

    if (this.ollamaClient) {
      try {
        await this.ollamaClient.list();
        available.push('ollama');
      } catch (error) {
        console.warn('Ollama not available:', error);
      }
    }

    return available;
  }
}

export const aiService = new AIService();
