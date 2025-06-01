import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG } from '../config/contract';

export interface ScamAlert {
  id: string;
  tx_digest: string;
  sender: string;
  recipient: string;
  amount: string;
  risk_score: number;
  severity: number;
  alert_type: number;
  message: string;
  timestamp: string;
}

export interface SuspiciousPattern {
  wallet_address: string;
  pattern_type: number;
  risk_level: number;
  description: string;
  transaction_ids: string[];
  risk_score: number;
  detected_at: string;
}

export interface TransactionAnalysis {
  sender: string;
  recipient: string;
  amount: string;
  transaction_type: number;
  risk_factors: number[];
  final_risk_score: number;
  timestamp: string;
}

export interface WalletMonitoringUpdate {
  wallet_address: string;
  is_watching: boolean;
  current_risk_score: number;
  patterns_detected: string;
  last_update: string;
}

export interface WalletRiskInfo {
  riskScore: number;
  isScammer: boolean;
  isWhitelisted: boolean;
  transactionCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class ScamDetectorClient {
  private suiClient: SuiClient;
  
  constructor(suiClient: SuiClient) {
    this.suiClient = suiClient;
  }

  // Analyze transaction
  async analyzeTransaction(
    sender: string,
    recipient: string,
    amount: string,
    txType: number = CONTRACT_CONFIG.TX_TYPES.SEND
  ): Promise<any> {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed. Please deploy the contract first.");
    }

    const tx = new Transaction();
    
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::analyze_transaction`,
      arguments: [
        tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
        tx.pure.address(sender),
        tx.pure.address(recipient),
        tx.pure.u64(amount),
        tx.pure.u8(txType),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  // Get admin address
  async getAdmin(): Promise<string> {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed. Please deploy the contract first.");
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::get_admin`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
        ],
      });

      const result = await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      // Parse the result to get address
      if (result.results?.[0]?.returnValues?.[0]) {
        const bytes = result.results[0].returnValues[0][0];
        // Convert bytes to hex address
        if (Array.isArray(bytes)) {
          const hex = '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
          return hex;
        }
      }
      throw new Error("Failed to get admin address");
    } catch (error) {
      console.error('Error getting admin address:', error);
      throw error;
    }
  }

  // Check wallet risk score
  async getWalletRiskScore(walletAddress: string): Promise<number> {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      return 0;
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::get_wallet_risk_score`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
          tx.pure.address(walletAddress),
        ],
      });

      const result = await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      // Parse the result - this may need adjustment based on actual response format
      if (result.results?.[0]?.returnValues?.[0]) {
        const bytes = result.results[0].returnValues[0][0];
        // Handle byte array conversion to number
        if (Array.isArray(bytes)) {
          // Convert byte array to number (assuming little-endian)
          let value = 0;
          for (let i = 0; i < Math.min(bytes.length, 8); i++) {
            value += bytes[i] * Math.pow(256, i);
          }
          return value;
        }
        return parseInt(String(bytes)) || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting wallet risk score:', error);
      return 0;
    }
  }

  // Check if address is known scammer
  async isKnownScammer(walletAddress: string): Promise<boolean> {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      return false;
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::is_known_scammer`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
          tx.pure.address(walletAddress),
        ],
      });

      const result = await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      if (result.results?.[0]?.returnValues?.[0]) {
        const bytes = result.results[0].returnValues[0][0];
        // Handle byte array conversion to boolean
        if (Array.isArray(bytes)) {
          return bytes.length > 0 && bytes[0] === 1;
        }
        return bytes === 1;
      }
      return false;
    } catch (error) {
      console.error('Error checking if known scammer:', error);
      return false;
    }
  }

  // Check if address is whitelisted
  async isWhitelisted(walletAddress: string): Promise<boolean> {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      return false;
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::is_whitelisted`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
          tx.pure.address(walletAddress),
        ],
      });

      const result = await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      if (result.results?.[0]?.returnValues?.[0]) {
        const bytes = result.results[0].returnValues[0][0];
        // Handle byte array conversion to boolean
        if (Array.isArray(bytes)) {
          return bytes.length > 0 && bytes[0] === 1;
        }
        return bytes === 1;
      }
      return false;
    } catch (error) {
      console.error('Error checking if whitelisted:', error);
      return false;
    }
  }

  // Get transaction count for address
  async getTransactionCount(walletAddress: string): Promise<number> {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      return 0;
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::get_transaction_count`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
          tx.pure.address(walletAddress),
        ],
      });

      const result = await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      if (result.results?.[0]?.returnValues?.[0]) {
        const bytes = result.results[0].returnValues[0][0];
        // Handle byte array conversion to number
        if (Array.isArray(bytes)) {
          // Convert byte array to number (assuming little-endian)
          let value = 0;
          for (let i = 0; i < Math.min(bytes.length, 8); i++) {
            value += bytes[i] * Math.pow(256, i);
          }
          return value;
        }
        return parseInt(String(bytes)) || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting transaction count:', error);
      return 0;
    }
  }

  // Get comprehensive wallet risk info
  async getWalletRiskInfo(walletAddress: string): Promise<WalletRiskInfo> {
    try {
      const [riskScore, isScammer, isWhitelisted, transactionCount] = await Promise.all([
        this.getWalletRiskScore(walletAddress),
        this.isKnownScammer(walletAddress),
        this.isWhitelisted(walletAddress),
        this.getTransactionCount(walletAddress),
      ]);

      return {
        riskScore,
        isScammer,
        isWhitelisted,
        transactionCount,
        riskLevel: this.getRiskLevel(riskScore),
      };
    } catch (error) {
      console.error('Error getting wallet risk info:', error);
      return {
        riskScore: 0,
        isScammer: false,
        isWhitelisted: false,
        transactionCount: 0,
        riskLevel: 'low',
      };
    }
  }

  // Add scammer addresses (admin only)
  addScammerAddresses(addresses: string[]): Transaction {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed");
    }

    const tx = new Transaction();
    
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::add_scammer_addresses`,
      arguments: [
        tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
        tx.pure.vector('address', addresses),
      ],
    });

    return tx;
  }

  // Add whitelisted addresses (admin only)
  addWhitelistedAddresses(addresses: string[]): Transaction {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed");
    }

    const tx = new Transaction();
    
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::add_whitelisted_addresses`,
      arguments: [
        tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
        tx.pure.vector('address', addresses),
      ],
    });

    return tx;
  }

  // Start wallet monitoring
  startWalletMonitoring(walletAddress: string): Transaction {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed");
    }

    const tx = new Transaction();
    
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::start_wallet_monitoring`,
      arguments: [
        tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
        tx.pure.address(walletAddress),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  // Stop wallet monitoring
  stopWalletMonitoring(walletAddress: string): Transaction {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed");
    }

    const tx = new Transaction();
    
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::stop_wallet_monitoring`,
      arguments: [
        tx.pure.address(walletAddress),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  // Subscribe to contract events
  subscribeToEvents(callback: (event: any) => void) {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      console.warn("Contract not deployed, cannot subscribe to events");
      return () => {};
    }

    return this.suiClient.subscribeEvent({
      filter: { 
        MoveModule: { 
          package: CONTRACT_CONFIG.PACKAGE_ID, 
          module: 'scammer' 
        } 
      },
      onMessage: callback,
    });
  }

  // Get AI configuration from smart contract
  async getAIConfig(): Promise<any> {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed. Please deploy the contract first.");
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::get_ai_config`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
        ],
      });

      const result = await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: "0x0000000000000000000000000000000000000000000000000000000000000000",
      });

      if (result.results?.[0]?.returnValues?.[0]) {
        const returnValue = result.results[0].returnValues[0];
        return this.parseAIConfig(returnValue);
      }

      throw new Error("Failed to get AI config from contract");
    } catch (error) {
      console.error("Error getting AI config:", error);
      throw error;
    }
  }

  // Get risk thresholds from smart contract
  async getRiskThresholds(): Promise<any> {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed. Please deploy the contract first.");
    }

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::get_risk_thresholds`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
        ],
      });

      const result = await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: "0x0000000000000000000000000000000000000000000000000000000000000000",
      });

      if (result.results?.[0]?.returnValues?.[0]) {
        const returnValue = result.results[0].returnValues[0];
        return this.parseRiskThresholds(returnValue);
      }

      throw new Error("Failed to get risk thresholds from contract");
    } catch (error) {
      console.error("Error getting risk thresholds:", error);
      throw error;
    }
  }

  // Update AI configuration (admin only)
  updateAIConfig(aiConfig: any): Transaction {
    if (!CONTRACT_CONFIG.PACKAGE_ID || CONTRACT_CONFIG.PACKAGE_ID === "0x0") {
      throw new Error("Contract not deployed. Please deploy the contract first.");
    }

    const tx = new Transaction();
    
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::scammer::update_ai_config`,
      arguments: [
        tx.object(CONTRACT_CONFIG.DETECTOR_STATE_ID),
        tx.pure.bool(aiConfig.enabled),
        tx.pure.u8(aiConfig.risk_weight),
        tx.pure.u8(aiConfig.confidence_threshold),
        tx.pure.u64(aiConfig.max_response_time_ms),
        tx.pure.bool(aiConfig.fallback_to_rule_based),
        tx.pure.vector('u8', aiConfig.supported_models),
      ],
    });

    return tx;
  }

  private parseAIConfig(_returnValue: any): any {
    // Parse the AI config from Move struct
    // This would need to be adapted based on the actual return format
    // For now, return default config
    return {
      enabled: true,
      risk_weight: 30,
      confidence_threshold: 70,
      max_response_time_ms: 5000,
      fallback_to_rule_based: true,
      supported_models: [1, 2, 4] // GPT, Gemini, Ollama
    };
  }

  private parseRiskThresholds(_returnValue: any): any {
    // Parse the risk thresholds from Move struct
    // For now, return default thresholds
    return {
      rapid_transaction_threshold: 300000,
      large_transfer_threshold: 1000000000000,
      failed_transaction_threshold: 3,
      contract_interaction_threshold: 70,
      round_amount_threshold: 5,
      unusual_time_threshold: 6,
    };
  }

  private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.CRITICAL) return 'critical';
    if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.HIGH) return 'high';
    if (riskScore >= CONTRACT_CONFIG.RISK_THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }
}
