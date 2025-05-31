import { useMemo } from 'react';
import { Box, Text } from '@radix-ui/themes';
import { Transaction } from '../../types/transactions';

interface TransactionChartProps {
  transactions: Transaction[];
  timeRange: string;
  loading?: boolean;
}

export function TransactionChart({ transactions, timeRange, loading }: TransactionChartProps) {
  const chartData = useMemo(() => {
    if (!transactions.length) return [];
    
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    
    const timeWindow = ranges[timeRange as keyof typeof ranges] || ranges['24h'];
    const startTime = now - timeWindow;
    
    const filteredTransactions = transactions.filter(
      tx => tx.timestamp >= startTime && tx.status === 'success'
    );
    
    // Group by hour for simple visualization
    const groupedData: { [key: string]: { send: number; receive: number; contract: number; approval: number } } = {};
    
    filteredTransactions.forEach(tx => {
      const hour = new Date(tx.timestamp).toISOString().slice(0, 13);
      if (!groupedData[hour]) {
        groupedData[hour] = { send: 0, receive: 0, contract: 0, approval: 0 };
      }
      
      // Handle all transaction types
      switch (tx.type) {
        case 'send':
          groupedData[hour].send += tx.amount;
          break;
        case 'receive':
          groupedData[hour].receive += tx.amount;
          break;
        case 'contract':
          groupedData[hour].contract += tx.amount;
          break;
        case 'approval':
          groupedData[hour].approval += tx.amount;
          break;
      }
    });
    
    return Object.entries(groupedData).map(([hour, data]) => ({
      time: hour,
      ...data,
    }));
  }, [transactions, timeRange]);

  if (loading) {
    return (
      <Box className="h-48 flex items-center justify-center">
        <Box className="animate-pulse w-full h-32 bg-gray-200 rounded"></Box>
      </Box>
    );
  }

  if (chartData.length === 0) {
    return (
      <Box className="h-48 flex items-center justify-center">
        <Text color="gray">No transaction data available</Text>
      </Box>
    );
  }

  const maxValue = Math.max(...chartData.map(d => 
    Math.max(d.send, d.receive, d.contract, d.approval)
  ));

  return (
    <Box className="h-48 relative">
      <svg className="w-full h-full" viewBox="0 0 400 200">
        {/* Chart bars */}
        {chartData.map((data, index) => {
          const x = (index / chartData.length) * 380 + 10;
          const barWidth = 6;
          const spacing = 1;
          
          const sendHeight = (data.send / maxValue) * 160;
          const receiveHeight = (data.receive / maxValue) * 160;
          const contractHeight = (data.contract / maxValue) * 160;
          const approvalHeight = (data.approval / maxValue) * 160;
          
          return (
            <g key={data.time}>
              {/* Send bars */}
              <rect
                x={x}
                y={180 - sendHeight}
                width={barWidth}
                height={sendHeight}
                fill="#ef4444"
                opacity="0.8"
                rx="1"
              />
              {/* Receive bars */}
              <rect
                x={x + barWidth + spacing}
                y={180 - receiveHeight}
                width={barWidth}
                height={receiveHeight}
                fill="#22c55e"
                opacity="0.8"
                rx="1"
              />
              {/* Contract bars */}
              <rect
                x={x + (barWidth + spacing) * 2}
                y={180 - contractHeight}
                width={barWidth}
                height={contractHeight}
                fill="#3b82f6"
                opacity="0.8"
                rx="1"
              />
              {/* Approval bars */}
              <rect
                x={x + (barWidth + spacing) * 3}
                y={180 - approvalHeight}
                width={barWidth}
                height={approvalHeight}
                fill="#f59e0b"
                opacity="0.8"
                rx="1"
              />
              
              {/* Hover tooltip area */}
              <rect
                x={x - 5}
                y={0}
                width={barWidth * 4 + spacing * 3 + 10}
                height={180}
                fill="transparent"
                className="hover:fill-gray-100 hover:opacity-20"
              >
                <title>
                  {`Time: ${new Date(data.time).toLocaleTimeString()}
Send: ${data.send.toFixed(4)} SUI
Receive: ${data.receive.toFixed(4)} SUI
Contract: ${data.contract.toFixed(4)} SUI
Approval: ${data.approval.toFixed(4)} SUI`}
                </title>
              </rect>
            </g>
          );
        })}
        
        {/* Y-axis labels */}
        <g className="text-xs fill-gray-500">
          <text x="5" y="15" fontSize="10">{maxValue.toFixed(2)}</text>
          <text x="5" y="95" fontSize="10">{(maxValue / 2).toFixed(2)}</text>
          <text x="5" y="175" fontSize="10">0</text>
        </g>
        
        {/* Grid lines */}
        <g stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5">
          <line x1="20" y1="20" x2="380" y2="20" />
          <line x1="20" y1="100" x2="380" y2="100" />
          <line x1="20" y1="180" x2="380" y2="180" />
        </g>
      </svg>
      
      {/* Enhanced Legend */}
      <Box className="absolute bottom-0 right-0 flex gap-3 text-sm bg-white/90 p-2 rounded">
        <Box className="flex items-center gap-1">
          <Box className="w-3 h-3 bg-red-500 rounded"></Box>
          <Text size="1">Sent</Text>
        </Box>
        <Box className="flex items-center gap-1">
          <Box className="w-3 h-3 bg-green-500 rounded"></Box>
          <Text size="1">Received</Text>
        </Box>
        <Box className="flex items-center gap-1">
          <Box className="w-3 h-3 bg-blue-500 rounded"></Box>
          <Text size="1">Contract</Text>
        </Box>
        <Box className="flex items-center gap-1">
          <Box className="w-3 h-3 bg-yellow-500 rounded"></Box>
          <Text size="1">Approval</Text>
        </Box>
      </Box>
      
      {/* Chart summary */}
      <Box className="absolute top-0 left-0 bg-white/90 p-2 rounded text-xs">
        <Text size="1" color="gray">
          Total Transactions: {transactions.length}
        </Text>
      </Box>
    </Box>
  );
}