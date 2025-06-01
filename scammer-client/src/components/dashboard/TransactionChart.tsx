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
      <Box style={{ height: '192px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box style={{ 
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          width: '100%', 
          height: '128px', 
          backgroundColor: 'var(--gray-4)', 
          borderRadius: '4px' 
        }}></Box>
      </Box>
    );
  }

  if (chartData.length === 0) {
    return (
      <Box style={{ height: '192px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text color="gray">No transaction data available</Text>
      </Box>
    );
  }

  const maxValue = Math.max(...chartData.map(d => 
    Math.max(d.send, d.receive, d.contract, d.approval)
  ));

  return (
    <Box style={{ height: '192px', position: 'relative' }}>
      <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 400 200">
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
                fill="var(--red-9)"
                opacity="0.8"
                rx="1"
              />
              {/* Receive bars */}
              <rect
                x={x + barWidth + spacing}
                y={180 - receiveHeight}
                width={barWidth}
                height={receiveHeight}
                fill="var(--green-9)"
                opacity="0.8"
                rx="1"
              />
              {/* Contract bars */}
              <rect
                x={x + (barWidth + spacing) * 2}
                y={180 - contractHeight}
                width={barWidth}
                height={contractHeight}
                fill="var(--blue-9)"
                opacity="0.8"
                rx="1"
              />
              {/* Approval bars */}
              <rect
                x={x + (barWidth + spacing) * 3}
                y={180 - approvalHeight}
                width={barWidth}
                height={approvalHeight}
                fill="var(--orange-9)"
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
                style={{ cursor: 'pointer' }}
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
        <g style={{ fontSize: '10px', fill: 'var(--gray-9)' }}>
          <text x="5" y="15">{maxValue.toFixed(2)}</text>
          <text x="5" y="95">{(maxValue / 2).toFixed(2)}</text>
          <text x="5" y="175">0</text>
        </g>
        
        {/* Grid lines */}
        <g stroke="var(--gray-6)" strokeWidth="0.5" opacity="0.5">
          <line x1="20" y1="20" x2="380" y2="20" />
          <line x1="20" y1="100" x2="380" y2="100" />
          <line x1="20" y1="180" x2="380" y2="180" />
        </g>
      </svg>
      
      {/* Enhanced Legend */}
      <Box style={{ 
        position: 'absolute', 
        bottom: '8px', 
        right: '8px', 
        display: 'flex', 
        gap: '12px', 
        fontSize: '12px', 
        backgroundColor: 'var(--color-background)',
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid var(--gray-6)'
      }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Box style={{ width: '12px', height: '12px', backgroundColor: 'var(--red-9)', borderRadius: '2px' }}></Box>
          <Text size="1">Sent</Text>
        </Box>
        <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Box style={{ width: '12px', height: '12px', backgroundColor: 'var(--green-9)', borderRadius: '2px' }}></Box>
          <Text size="1">Received</Text>
        </Box>
        <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Box style={{ width: '12px', height: '12px', backgroundColor: 'var(--blue-9)', borderRadius: '2px' }}></Box>
          <Text size="1">Contract</Text>
        </Box>
        <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Box style={{ width: '12px', height: '12px', backgroundColor: 'var(--orange-9)', borderRadius: '2px' }}></Box>
          <Text size="1">Approval</Text>
        </Box>
      </Box>
      
      {/* Chart summary */}
      <Box style={{ 
        position: 'absolute', 
        top: '8px', 
        left: '8px', 
        backgroundColor: 'var(--color-background)',
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid var(--gray-6)'
      }}>
        <Text size="1" color="gray">
          Total Transactions: {transactions.length}
        </Text>
      </Box>
    </Box>
  );
}