import React, { useState } from 'react';
import { Card, Flex, Text, Button, Select, TextField, Checkbox, Badge, Box, Separator } from '@radix-ui/themes';
import { TransactionFilter as FilterType, Transaction } from '../../types/transactions';

interface TransactionFilterProps {
  filter: FilterType;
  onChange: (filter: FilterType) => void;
  onReset: () => void;
  transactionCount?: number;
}

export const TransactionFilter: React.FC<TransactionFilterProps> = ({
  filter,
  onChange,
  onReset,
  transactionCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTypeChange = (type: Transaction['type'], checked: boolean) => {
    const currentTypes = filter.type || [];
    const newTypes = checked 
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    onChange({
      ...filter,
      type: newTypes.length > 0 ? newTypes : undefined
    });
  };

  const handleStatusChange = (status: Transaction['status'], checked: boolean) => {
    const currentStatuses = filter.status || [];
    const newStatuses = checked 
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onChange({
      ...filter,
      status: newStatuses.length > 0 ? newStatuses : undefined
    });
  };

  const handleAmountRangeChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onChange({
      ...filter,
      amountRange: {
        min: field === 'min' ? numValue : filter.amountRange?.min,
        max: field === 'max' ? numValue : filter.amountRange?.max
      }
    });
  };

  const handleRiskScoreChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onChange({
      ...filter,
      riskScore: {
        min: field === 'min' ? numValue : filter.riskScore?.min,
        max: field === 'max' ? numValue : filter.riskScore?.max
      }
    });
  };

  const handleSuspiciousChange = (checked: boolean) => {
    onChange({
      ...filter,
      onlySuspicious: checked || undefined
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filter.type?.length) count++;
    if (filter.status?.length) count++;
    if (filter.amountRange?.min !== undefined || filter.amountRange?.max !== undefined) count++;
    if (filter.riskScore?.min !== undefined || filter.riskScore?.max !== undefined) count++;
    if (filter.onlySuspicious) count++;
    if (filter.tokens?.length) count++;
    if (filter.addresses?.length) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card>
      <Flex p="4" direction="column" gap="3">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Text weight="bold">Filters</Text>
            {activeFilterCount > 0 && (
              <Badge color="blue" size="1">
                {activeFilterCount}
              </Badge>
            )}
          </Flex>
          <Flex gap="2">
            <Text size="2" color="gray">
              {transactionCount} transactions
            </Text>
            <Button 
              variant="ghost" 
              size="1" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="1" onClick={onReset}>
                Reset
              </Button>
            )}
          </Flex>
        </Flex>

        {isExpanded && (
          <>
            <Separator />
            
            {/* Transaction Types */}
            <Box>
              <Text weight="medium" size="2" mb="2">Transaction Types</Text>
              <Flex gap="3" wrap="wrap">
                {(['send', 'receive', 'contract', 'approval'] as Transaction['type'][]).map(type => (
                  <label key={type} style={{ cursor: 'pointer' }}>
                    <Flex align="center" gap="2">
                      <Checkbox
                        checked={filter.type?.includes(type) || false}
                        onCheckedChange={(checked) => handleTypeChange(type, checked as boolean)}
                      />
                      <Text size="2" style={{ textTransform: 'capitalize' }}>
                        {type}
                      </Text>
                    </Flex>
                  </label>
                ))}
              </Flex>
            </Box>

            {/* Transaction Status */}
            <Box>
              <Text weight="medium" size="2" mb="2">Status</Text>
              <Flex gap="3" wrap="wrap">
                {(['success', 'pending', 'failed', 'confirmed'] as Transaction['status'][]).map(status => (
                  <label key={status} style={{ cursor: 'pointer' }}>
                    <Flex align="center" gap="2">
                      <Checkbox
                        checked={filter.status?.includes(status) || false}
                        onCheckedChange={(checked) => handleStatusChange(status, checked as boolean)}
                      />
                      <Text size="2" style={{ textTransform: 'capitalize' }}>
                        {status}
                      </Text>
                    </Flex>
                  </label>
                ))}
              </Flex>
            </Box>

            {/* Amount Range */}
            <Box>
              <Text weight="medium" size="2" mb="2">Amount Range (SUI)</Text>
              <Flex gap="2" align="center">
                <TextField.Root
                  placeholder="Min"
                  size="1"
                  value={filter.amountRange?.min?.toString() || ''}
                  onChange={(e) => handleAmountRangeChange('min', e.target.value)}
                />
                <Text size="2" color="gray">to</Text>
                <TextField.Root
                  placeholder="Max"
                  size="1"
                  value={filter.amountRange?.max?.toString() || ''}
                  onChange={(e) => handleAmountRangeChange('max', e.target.value)}
                />
              </Flex>
            </Box>

            {/* Risk Score Range */}
            <Box>
              <Text weight="medium" size="2" mb="2">Risk Score Range</Text>
              <Flex gap="2" align="center">
                <TextField.Root
                  placeholder="0.0"
                  size="1"
                  value={filter.riskScore?.min?.toString() || ''}
                  onChange={(e) => handleRiskScoreChange('min', e.target.value)}
                />
                <Text size="2" color="gray">to</Text>
                <TextField.Root
                  placeholder="1.0"
                  size="1"
                  value={filter.riskScore?.max?.toString() || ''}
                  onChange={(e) => handleRiskScoreChange('max', e.target.value)}
                />
              </Flex>
            </Box>

            {/* Suspicious Only */}
            <Box>
              <label style={{ cursor: 'pointer' }}>
                <Flex align="center" gap="2">
                  <Checkbox
                    checked={filter.onlySuspicious || false}
                    onCheckedChange={handleSuspiciousChange}
                  />
                  <Text size="2">Show only suspicious transactions</Text>
                </Flex>
              </label>
            </Box>

            {/* Time Range - Simple implementation */}
            <Box>
              <Text weight="medium" size="2" mb="2">Time Range</Text>
              <Flex gap="2" align="center">
                <Select.Root
                  value="all"
                  onValueChange={(value) => {
                    if (value === 'today') {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      onChange({
                        ...filter,
                        timeRange: {
                          start: today.getTime(),
                          end: Date.now()
                        }
                      });
                    } else if (value === 'week') {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      onChange({
                        ...filter,
                        timeRange: {
                          start: weekAgo.getTime(),
                          end: Date.now()
                        }
                      });
                    } else if (value === 'month') {
                      const monthAgo = new Date();
                      monthAgo.setMonth(monthAgo.getMonth() - 1);
                      onChange({
                        ...filter,
                        timeRange: {
                          start: monthAgo.getTime(),
                          end: Date.now()
                        }
                      });
                    } else {
                      onChange({
                        ...filter,
                        timeRange: undefined
                      });
                    }
                  }}
                >
                  <Select.Trigger placeholder="Select time range" />
                  <Select.Content>
                    <Select.Item value="all">All time</Select.Item>
                    <Select.Item value="today">Today</Select.Item>
                    <Select.Item value="week">Last 7 days</Select.Item>
                    <Select.Item value="month">Last 30 days</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Box>
          </>
        )}
      </Flex>
    </Card>
  );
};