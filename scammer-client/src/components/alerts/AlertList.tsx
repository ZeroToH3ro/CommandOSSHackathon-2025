import React from 'react';
import { Card, Flex, Text, Badge, Button, Box, Separator } from '@radix-ui/themes';
import { ExclamationTriangleIcon, CheckCircledIcon, InfoCircledIcon, Cross1Icon, ClockIcon } from '@radix-ui/react-icons';
import { Alert } from '../../types/transactions';

interface AlertListProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
  onClearAll?: () => void;
  maxAlerts?: number;
  showTimestamps?: boolean;
}

export const AlertList: React.FC<AlertListProps> = ({
  alerts,
  onDismiss,
  onClearAll,
  maxAlerts = 10,
  showTimestamps = true
}) => {
  const getAlertIcon = (type: Alert['type'], severity: Alert['severity']) => {
    if (type === 'security' || severity === 'high') {
      return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
    }
    if (type === 'warning' || severity === 'medium') {
      return <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />;
    }
    if (type === 'success') {
      return <CheckCircledIcon className="w-4 h-4 text-green-600" />;
    }
    return <InfoCircledIcon className="w-4 h-4 text-blue-600" />;
  };

  const getBadgeColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getCardStyle = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'border-l-4 border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-4 border-l-orange-500 bg-orange-50';
      case 'low':
        return 'border-l-4 border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-4 border-l-gray-500 bg-gray-50';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const displayedAlerts = alerts.slice(0, maxAlerts);

  if (alerts.length === 0) {
    return (
      <Card>
        <Flex p="6" direction="column" align="center" gap="3">
          <CheckCircledIcon className="w-12 h-12 text-green-600" />
          <Text size="5" weight="bold">All Clear</Text>
          <Text size="3" color="gray" align="center">
            No security alerts detected. Your wallet appears to be safe.
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex p="4" direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Box>
            <Flex align="center" gap="2" mb="1">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <Text size="5" weight="bold">Security Alerts</Text>
            </Flex>
            <Text size="2" color="gray">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''} detected
            </Text>
          </Box>
          {onClearAll && alerts.length > 0 && (
            <Button variant="outline" size="2" onClick={onClearAll}>
              Clear All
            </Button>
          )}
        </Flex>

        <Separator />

        {/* Alert List */}
        <Flex direction="column" gap="3">
          {displayedAlerts.map((alert) => (
            <Card key={alert.id} className={getCardStyle(alert.severity)}>
              <Flex p="4" justify="between" align="start">
                <Flex gap="3" className="flex-1">
                  {getAlertIcon(alert.type, alert.severity)}
                  
                  <Box className="flex-1">
                    <Flex align="center" gap="2" mb="2">
                      <Text size="3" weight="bold">{alert.title}</Text>
                      <Badge color={getBadgeColor(alert.severity)} size="1">
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </Flex>
                    
                    <Text size="2" color="gray" className="mb-3">
                      {alert.message}
                    </Text>
                    
                    {showTimestamps && (
                      <Flex align="center" gap="4" className="text-xs text-gray-500">
                        <Flex align="center" gap="1">
                          <ClockIcon className="w-3 h-3" />
                          <Text size="1" color="gray">
                            {formatRelativeTime(alert.timestamp)}
                          </Text>
                        </Flex>
                        <Text size="1" color="gray" style={{ textTransform: 'capitalize' }}>
                          {alert.type}
                        </Text>
                      </Flex>
                    )}
                    
                    {/* Additional alert data */}
                    {alert.data && (
                      <Box mt="3" p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: '6px' }}>
                        <details>
                          <summary style={{ cursor: 'pointer' }}>
                            <Text size="2" color="gray">View Details</Text>
                          </summary>
                          <Box mt="2" className="space-y-1">
                            {alert.data.pattern && (
                              <Flex gap="2">
                                <Text size="1" weight="bold">Pattern:</Text>
                                <Text size="1">{alert.data.pattern.type}</Text>
                              </Flex>
                            )}
                            {alert.data.walletAddress && (
                              <Flex gap="2">
                                <Text size="1" weight="bold">Wallet:</Text>
                                <Text size="1" style={{ fontFamily: 'monospace' }}>
                                  {alert.data.walletAddress.slice(0, 8)}...{alert.data.walletAddress.slice(-8)}
                                </Text>
                              </Flex>
                            )}
                            {alert.data.transactionId && (
                              <Flex gap="2">
                                <Text size="1" weight="bold">Transaction:</Text>
                                <Text size="1" style={{ fontFamily: 'monospace' }}>
                                  {alert.data.transactionId.slice(0, 8)}...{alert.data.transactionId.slice(-8)}
                                </Text>
                              </Flex>
                            )}
                            {alert.data.amount && (
                              <Flex gap="2">
                                <Text size="1" weight="bold">Amount:</Text>
                                <Text size="1">{alert.data.amount} SUI</Text>
                              </Flex>
                            )}
                          </Box>
                        </details>
                      </Box>
                    )}
                  </Box>
                </Flex>
                
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="1"
                    onClick={() => onDismiss(alert.id)}
                    className="shrink-0"
                  >
                    <Cross1Icon className="w-4 h-4" />
                  </Button>
                )}
              </Flex>
            </Card>
          ))}
          
          {alerts.length > maxAlerts && (
            <Flex justify="center" pt="2">
              <Text size="2" color="gray">
                Showing {maxAlerts} of {alerts.length} alerts
              </Text>
            </Flex>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};