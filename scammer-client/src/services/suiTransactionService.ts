import { SuiClient } from '@mysten/sui/client';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';

export interface TransactionData {
  digest: string;
  sender: string;
  timestamp: number;
  gasUsed: string;
  status: 'success' | 'failure';
  type: 'payment' | 'programmable' | 'system';
  amount?: string;
  recipient?: string;
  gasBudget: string;
  gasPrice: string;
  effects?: any;
}

export interface AddressMetrics {
  totalTransactions: number;
  totalVolume: string;
  averageGasUsed: string;
  successRate: number;
  firstTransactionTime?: number;
  lastTransactionTime?: number;
  uniqueRecipients: number;
  programmableTransactionRatio: number;
  averageTimeBetweenTx: number;
}

export class SuiTransactionService {
  private suiClient: SuiClient;

  constructor(suiClient: SuiClient) {
    this.suiClient = suiClient;
  }

  /**
   * Fetch last N transactions for a given address
   */
  async getAddressTransactionHistory(
    address: string, 
    limit: number = 10
  ): Promise<TransactionData[]> {
    if (!this.isValidSuiAddress(address)) {
      console.error('Invalid Sui address format:', address);
      return [];
    }

    // Try multiple query strategies in order of preference
    const strategies = [
      // Strategy 1: Use the newer filter format
      async () => {
        const response = await this.suiClient.queryTransactionBlocks({
          filter: {
            FromAddress: address,
          },
          limit,
          order: 'descending',
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
        return response.data.map(tx => this.parseTransactionData(tx));
      },
      
      // Strategy 2: Use InputObject filter (for transactions that use objects owned by the address)
      async () => {
        const response = await this.suiClient.queryTransactionBlocks({
          filter: {
            InputObject: address,
          },
          limit,
          order: 'descending',
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
        return response.data.map(tx => this.parseTransactionData(tx));
      },
      
      // Strategy 3: Use ChangedObject filter
      async () => {
        const response = await this.suiClient.queryTransactionBlocks({
          filter: {
            ChangedObject: address,
          },
          limit,
          order: 'descending',
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
        return response.data.map(tx => this.parseTransactionData(tx));
      },
      
      // Strategy 4: General query and filter client-side
      async () => {
        return await this.getTransactionsByGeneralQuery(address, limit, 'sent');
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Trying transaction query strategy ${i + 1} for address:`, address);
        const transactions = await strategies[i]();
        
        if (transactions && transactions.length > 0) {
          console.log(`Strategy ${i + 1} succeeded, found ${transactions.length} transactions`);
          return transactions;
        }
      } catch (error) {
        console.log(`Strategy ${i + 1} failed:`, error instanceof Error ? error.message : error);
        continue;
      }
    }

    console.log('All strategies failed, returning empty array');
    return [];
  }

  /**
   * Get transactions where address is recipient
   */
  async getIncomingTransactions(
    address: string,
    limit: number = 10
  ): Promise<TransactionData[]> {
    if (!this.isValidSuiAddress(address)) {
      console.error('Invalid Sui address format:', address);
      return [];
    }

    // Try multiple query strategies in order of preference
    const strategies = [
      // Strategy 1: Use ToAddress filter
      async () => {
        const response = await this.suiClient.queryTransactionBlocks({
          filter: {
            ToAddress: address,
          },
          limit,
          order: 'descending',
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
        return response.data.map(tx => this.parseTransactionData(tx));
      },
      
      // Strategy 2: Use ChangedObject filter
      async () => {
        const response = await this.suiClient.queryTransactionBlocks({
          filter: {
            ChangedObject: address,
          },
          limit,
          order: 'descending',
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });
        return response.data.map(tx => this.parseTransactionData(tx));
      },
      
      // Strategy 3: General query and filter client-side
      async () => {
        return await this.getTransactionsByGeneralQuery(address, limit, 'received');
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Trying incoming transaction query strategy ${i + 1} for address:`, address);
        const transactions = await strategies[i]();
        
        if (transactions && transactions.length > 0) {
          console.log(`Strategy ${i + 1} succeeded, found ${transactions.length} incoming transactions`);
          return transactions;
        }
      } catch (error) {
        console.log(`Incoming strategy ${i + 1} failed:`, error instanceof Error ? error.message : error);
        continue;
      }
    }

    console.log('All incoming transaction strategies failed, returning empty array');
    return [];
  }

  /**
   * Get comprehensive transaction history (both sent and received)
   * Uses fallback methods if specific filters don't work
   */
  async getComprehensiveHistory(
    address: string,
    limit: number = 20
  ): Promise<{
    sent: TransactionData[];
    received: TransactionData[];
    metrics: AddressMetrics;
  }> {
    let sent: TransactionData[] = [];
    let received: TransactionData[] = [];

    try {
      // Try to get both sent and received transactions
      const [sentResult, receivedResult] = await Promise.allSettled([
        this.getAddressTransactionHistory(address, limit),
        this.getIncomingTransactions(address, limit)
      ]);

      if (sentResult.status === 'fulfilled') {
        sent = sentResult.value;
      } else {
        console.log('Failed to get sent transactions:', sentResult.reason);
      }

      if (receivedResult.status === 'fulfilled') {
        received = receivedResult.value;
      } else {
        console.log('Failed to get received transactions:', receivedResult.reason);
      }

      if (sent.length === 0 && received.length === 0) {
        try {
          const generalResponse = await this.suiClient.queryTransactionBlocks({
            limit: Math.min(limit, 50),
            order: 'descending',
            options: {
              showInput: true,
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
            },
          });

          // Filter transactions that involve our address
          const relevantTxs = generalResponse.data
            .map(tx => this.parseTransactionData(tx))
            .filter(tx => 
              tx.sender === address || 
              tx.recipient === address
            );

          sent = relevantTxs.filter(tx => tx.sender === address);
          received = relevantTxs.filter(tx => tx.recipient === address);
        } catch (error) {
          console.log('General query also failed:', error);
        }
      }
    } catch (error) {
      console.error('Error in getComprehensiveHistory:', error);
    }

    const allTransactions = [...sent, ...received]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    const metrics = this.calculateAddressMetrics(allTransactions);

    return {
      sent,
      received,
      metrics
    };
  }

  /**
   * Parse Sui transaction data into our format
   */
  private parseTransactionData(tx: SuiTransactionBlockResponse): TransactionData {
    const digest = tx.digest || '';
    const timestampMs = tx.timestampMs ? parseInt(tx.timestampMs) : Date.now();
    
    // Extract sender with fallback
    const sender = tx.transaction?.data?.sender || '';
    
    // Determine transaction type and extract relevant data
    const txData = tx.transaction?.data;
    let type: 'payment' | 'programmable' | 'system' = 'system';
    let amount: string | undefined;
    let recipient: string | undefined;

    if (txData?.transaction?.kind === 'ProgrammableTransaction') {
      type = 'programmable';
      
      // Try to extract payment information from programmable transaction
      const commands = txData.transaction.transactions || [];
      for (const command of commands) {
        if (command && typeof command === 'object') {
          if ('TransferObjects' in command) {
            // This is a transfer
            type = 'payment';
            // Try to extract recipient from the command
            try {
              const transferCommand = command as any;
              if (transferCommand.TransferObjects && transferCommand.TransferObjects.length > 1) {
                // The last element is usually the recipient
                const recipientInput = transferCommand.TransferObjects[transferCommand.TransferObjects.length - 1];
                if (recipientInput && typeof recipientInput === 'object' && 'Input' in recipientInput) {
                  // This is an input reference, we'd need to resolve it from the inputs
                  // For now, we'll try to extract from effects
                }
              }
            } catch (error) {
              console.log('Error extracting transfer details:', error);
            }
            break;
          } else if ('SplitCoins' in command || 'MergeCoins' in command) {
            // These are also payment-related operations
            type = 'payment';
          }
        }
      }
      
      // Try to extract recipient from transaction effects
      try {
        if (tx.effects?.created || tx.effects?.mutated) {
          const changes = [...(tx.effects.created || []), ...(tx.effects.mutated || [])];
          for (const change of changes) {
            if (change.owner && typeof change.owner === 'object' && 'AddressOwner' in change.owner) {
              // This object was created/modified for a specific address
              const ownerAddress = change.owner.AddressOwner;
              if (ownerAddress && ownerAddress !== sender) {
                recipient = ownerAddress;
                break;
              }
            }
          }
        }
      } catch (error) {
        console.log('Error extracting recipient from effects:', error);
      }
    }

    // Extract gas information with better error handling
    let gasUsed = '0';
    try {
      const gasData = tx.effects?.gasUsed;
      if (gasData) {
        const computationCost = parseInt(gasData.computationCost || '0');
        const storageCost = parseInt(gasData.storageCost || '0');
        const storageRebate = parseInt(gasData.storageRebate || '0');
        gasUsed = (computationCost + storageCost - storageRebate).toString();
      }
    } catch (error) {
      console.log('Error parsing gas data:', error);
      gasUsed = '0';
    }

    const gasBudget = txData?.gasData?.budget || '0';
    const gasPrice = txData?.gasData?.price || '0';

    // Determine status with fallback
    let status: 'success' | 'failure' = 'failure';
    try {
      status = tx.effects?.status?.status === 'success' ? 'success' : 'failure';
    } catch (error) {
      console.log('Error parsing transaction status:', error);
    }

    return {
      digest,
      sender,
      timestamp: timestampMs,
      gasUsed,
      status,
      type,
      amount,
      recipient,
      gasBudget,
      gasPrice,
      effects: tx.effects
    };
  }

  /**
   * Calculate metrics for an address based on transaction history
   */
  private calculateAddressMetrics(transactions: TransactionData[]): AddressMetrics {
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalVolume: '0',
        averageGasUsed: '0',
        successRate: 0,
        uniqueRecipients: 0,
        programmableTransactionRatio: 0,
        averageTimeBetweenTx: 0
      };
    }

    const successfulTxs = transactions.filter(tx => tx.status === 'success');
    const successRate = (successfulTxs.length / transactions.length) * 100;

    const totalGasUsed = transactions.reduce((sum, tx) => sum + parseInt(tx.gasUsed || '0'), 0);
    const averageGasUsed = Math.floor(totalGasUsed / transactions.length).toString();

    const uniqueRecipients = new Set(
      transactions
        .map(tx => tx.recipient)
        .filter(recipient => recipient)
    ).size;

    const programmableTxs = transactions.filter(tx => tx.type === 'programmable');
    const programmableTransactionRatio = (programmableTxs.length / transactions.length) * 100;

    // Calculate average time between transactions
    const sortedTxs = transactions.sort((a, b) => a.timestamp - b.timestamp);
    let totalTimeDiff = 0;
    for (let i = 1; i < sortedTxs.length; i++) {
      totalTimeDiff += sortedTxs[i].timestamp - sortedTxs[i - 1].timestamp;
    }
    const averageTimeBetweenTx = sortedTxs.length > 1 ? 
      Math.floor(totalTimeDiff / (sortedTxs.length - 1)) : 0;

    return {
      totalTransactions: transactions.length,
      totalVolume: '0', // Would need to parse actual amounts from transaction data
      averageGasUsed,
      successRate,
      firstTransactionTime: sortedTxs[0]?.timestamp,
      lastTransactionTime: sortedTxs[sortedTxs.length - 1]?.timestamp,
      uniqueRecipients,
      programmableTransactionRatio,
      averageTimeBetweenTx
    };
  }

  /**
   * Get current network metrics that might affect risk assessment
   */
  async getNetworkMetrics(): Promise<any> {
    try {
      const [
        latestCheckpoint,
        referenceGasPrice,
        totalTxCount
      ] = await Promise.all([
        this.suiClient.getLatestCheckpointSequenceNumber(),
        this.suiClient.getReferenceGasPrice(),
        this.suiClient.getTotalTransactionBlocks()
      ]);

      return {
        latestCheckpoint,
        referenceGasPrice: referenceGasPrice.toString(),
        totalTxCount: totalTxCount.toString(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching network metrics:', error);
      return {
        latestCheckpoint: '0',
        referenceGasPrice: '1000',
        totalTxCount: '0',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check if an address is a smart contract
   */
  async isSmartContract(address: string): Promise<boolean> {
    try {
      const object = await this.suiClient.getObject({ id: address });
      return object.data?.type !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get address creation time (approximate)
   */
  async getAddressAge(address: string): Promise<number | null> {
    if (!this.isValidSuiAddress(address)) {
      console.error('Invalid Sui address format:', address);
      return null;
    }

    try {
      // Try multiple approaches to get the first transaction
      let firstTxTimestamp: number | null = null;

      // Method 1: Try getting transactions from this address
      try {
        const sentResponse = await this.suiClient.queryTransactionBlocks({
          filter: {
            FromAddress: address,
          },
          limit: 1,
          order: 'ascending',
          options: {
            showInput: true,
          },
        });

        if (sentResponse.data.length > 0) {
          const firstTx = sentResponse.data[0];
          if (firstTx.timestampMs) {
            firstTxTimestamp = parseInt(firstTx.timestampMs);
          }
        }
      } catch (error) {
        console.log('FromAddress query failed, trying alternative method');
      }

      // Method 2: Try getting transactions to this address if first method failed
      if (!firstTxTimestamp) {
        try {
          const receivedResponse = await this.suiClient.queryTransactionBlocks({
            filter: {
              ToAddress: address,
            },
            limit: 1,
            order: 'ascending',
            options: {
              showInput: true,
            },
          });

          if (receivedResponse.data.length > 0) {
            const firstTx = receivedResponse.data[0];
            if (firstTx.timestampMs) {
              firstTxTimestamp = parseInt(firstTx.timestampMs);
            }
          }
        } catch (error) {
          console.log('ToAddress query also failed');
        }
      }

      return firstTxTimestamp;
    } catch (error) {
      console.error('Error getting address age:', error);
      return null;
    }
  }

  /**
   * Analyze transaction patterns for risk assessment
   */
  async analyzeTransactionPatterns(address: string): Promise<{
    rapidTransactions: boolean;
    unusualTiming: boolean;
    highFailureRate: boolean;
    suspiciousAmounts: boolean;
    newAddress: boolean;
  }> {
    const history = await this.getComprehensiveHistory(address, 50);
    const allTxs = [...history.sent, ...history.received];
    
    // Check for rapid transactions (more than 5 in 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentTxs = allTxs.filter(tx => tx.timestamp > fiveMinutesAgo);
    const rapidTransactions = recentTxs.length > 5;

    // Check for unusual timing (transactions between 2-6 AM)
    const unusualTiming = allTxs.some(tx => {
      const hour = new Date(tx.timestamp).getHours();
      return hour >= 2 && hour <= 6;
    });

    // Check failure rate
    const highFailureRate = history.metrics.successRate < 70;

    // Check for suspicious round amounts
    const suspiciousAmounts = allTxs.some(tx => {
      if (!tx.amount) return false;
      const amount = parseFloat(tx.amount);
      return amount > 0 && amount % 1000 === 0; // Round thousands
    });

    // Check if address is new (less than 7 days old)
    let newAddress = false;
    try {
      const addressAge = await this.getAddressAge(address);
      newAddress = addressAge ? (Date.now() - addressAge) < (7 * 24 * 60 * 60 * 1000) : false;
    } catch (error) {
      console.log('Could not determine address age, assuming not new');
      newAddress = false;
    }

    return {
      rapidTransactions,
      unusualTiming,
      highFailureRate,
      suspiciousAmounts,
      newAddress
    };
  }

  /**
   * Validate if an address is a valid Sui address format
   */
  private isValidSuiAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // Remove whitespace
    address = address.trim();
    
    // Sui addresses can be in different formats:
    // 1. Full format: 0x followed by 64 hex characters (32 bytes)
    // 2. Shortened format: 0x followed by fewer hex characters
    // 3. Without 0x prefix
    
    // Normalize the address
    const normalizedAddress = address.startsWith('0x') ? address : `0x${address}`;
    
    // Basic hex format validation
    const addressRegex = /^0x[a-fA-F0-9]+$/;
    if (!addressRegex.test(normalizedAddress)) {
      return false;
    }
    
    // Length validation - Sui addresses should be at least 3 characters (0x + 1 hex char)
    // and at most 66 characters (0x + 64 hex characters)
    const hexPart = normalizedAddress.slice(2);
    return hexPart.length >= 1 && hexPart.length <= 64;
  }

  /**
   * Helper method to get transactions by doing a general query and filtering client-side
   */
  private async getTransactionsByGeneralQuery(
    address: string, 
    limit: number, 
    type: 'sent' | 'received'
  ): Promise<TransactionData[]> {
    try {
      // Get a larger set of recent transactions and filter client-side
      const response = await this.suiClient.queryTransactionBlocks({
        limit: Math.min(limit * 10, 100), // Get more transactions to filter from
        order: 'descending',
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (!response.data || response.data.length === 0) {
        return [];
      }

      // Parse all transactions and filter for the specific address
      const allTransactions = response.data.map(tx => this.parseTransactionData(tx));
      
      let filteredTransactions: TransactionData[] = [];
      
      if (type === 'sent') {
        filteredTransactions = allTransactions.filter(tx => tx.sender === address);
      } else if (type === 'received') {
        filteredTransactions = allTransactions.filter(tx => tx.recipient === address);
      }
      
      // Return only the requested number of transactions
      return filteredTransactions.slice(0, limit);
    } catch (error) {
      console.error('Error in general query fallback:', error);
      return [];
    }
  }
}
