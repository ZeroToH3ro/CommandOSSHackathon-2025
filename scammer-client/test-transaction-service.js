// Test script for the enhanced SuiTransactionService
import { SuiClient } from '@mysten/sui/client';
import { SuiTransactionService } from './src/services/suiTransactionService.ts';

async function testTransactionService() {
  console.log('🧪 Testing Enhanced SuiTransactionService...\n');
  
  // Initialize Sui client
  const suiClient = new SuiClient({
    url: 'https://fullnode.devnet.sui.io:443'
  });
  
  const transactionService = new SuiTransactionService(suiClient);
  
  // Test addresses (common Sui devnet addresses that should have some activity)
  const testAddresses = [
    '0x1', // System address
    '0x2', // System address  
    '0x6', // System address
    '0x0000000000000000000000000000000000000000000000000000000000000001', // Full format system address
  ];
  
  console.log('📋 Testing address validation...');
  testAddresses.forEach(address => {
    const service = new SuiTransactionService(suiClient);
    const isValid = service.isValidSuiAddress ? service.isValidSuiAddress(address) : true;
    console.log(`  ${address}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });
  
  console.log('\n📊 Testing transaction history retrieval...');
  
  for (const address of testAddresses.slice(0, 2)) { // Test first 2 addresses
    console.log(`\n🔍 Testing address: ${address}`);
    
    try {
      // Test getAddressTransactionHistory
      console.log('  📤 Getting sent transactions...');
      const sentTxs = await transactionService.getAddressTransactionHistory(address, 5);
      console.log(`  ✅ Found ${sentTxs.length} sent transactions`);
      
      // Test getIncomingTransactions  
      console.log('  📥 Getting incoming transactions...');
      const incomingTxs = await transactionService.getIncomingTransactions(address, 5);
      console.log(`  ✅ Found ${incomingTxs.length} incoming transactions`);
      
      // Test comprehensive history
      console.log('  📈 Getting comprehensive history...');
      const history = await transactionService.getComprehensiveHistory(address, 10);
      console.log(`  ✅ Comprehensive history: ${history.sent.length} sent, ${history.received.length} received`);
      console.log(`  📊 Metrics: ${history.metrics.totalTransactions} total, ${history.metrics.successRate.toFixed(1)}% success rate`);
      
      // Test pattern analysis
      console.log('  🔍 Analyzing transaction patterns...');
      const patterns = await transactionService.analyzeTransactionPatterns(address);
      console.log(`  ✅ Pattern analysis complete:`, {
        rapidTransactions: patterns.rapidTransactions,
        unusualTiming: patterns.unusualTiming,
        highFailureRate: patterns.highFailureRate,
        suspiciousAmounts: patterns.suspiciousAmounts,
        newAddress: patterns.newAddress
      });
      
    } catch (error) {
      console.error(`  ❌ Error testing ${address}:`, error.message);
    }
  }
  
  console.log('\n🌐 Testing network metrics...');
  try {
    const networkMetrics = await transactionService.getNetworkMetrics();
    console.log('  ✅ Network metrics retrieved:', {
      latestCheckpoint: networkMetrics.latestCheckpoint,
      referenceGasPrice: networkMetrics.referenceGasPrice,
      totalTxCount: networkMetrics.totalTxCount
    });
  } catch (error) {
    console.error('  ❌ Error getting network metrics:', error.message);
  }
  
  console.log('\n🎉 Test completed!');
}

// Run the test
testTransactionService().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
