import { Box, Flex, Text, Button, Badge } from '@radix-ui/themes';
import { Cross1Icon, ExclamationTriangleIcon, InfoCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  // Contract-specific fields
  sender?: string;
  recipient?: string;
  amount?: string;
  riskScore?: number;
  txDigest?: string;
}

interface AlertBannerProps {
  alert: Alert;
  onDismiss: () => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const getAlertColors = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircledIcon className="w-5 h-5 text-green-500" />;
      default:
        return <InfoCircledIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      default:
        return 'blue';
    }
  };

  return (
    <Box className={`p-4 rounded-lg border ${getAlertColors(alert.type)}`}>
      <Flex justify="between" align="start" gap="3">
        <Flex gap="3" align="start" className="flex-1">
          {getAlertIcon(alert.type)}
          <Box className="flex-1">
            <Flex align="center" gap="2" className="mb-1">
              <Text weight="bold" size="3">{alert.title}</Text>
              <Badge color={getSeverityColor(alert.severity)} size="1">
                {alert.severity.toUpperCase()}
              </Badge>
            </Flex>
            <Text size="2">{alert.message}</Text>
            <Text size="1" color="gray" className="mt-1">
              {new Date(alert.timestamp).toLocaleString()}
            </Text>
            
            {/* Contract-specific information */}
            {(alert.sender || alert.recipient || alert.amount || alert.riskScore) && (
              <Box mt="2" p="2" style={{ 
                backgroundColor: 'var(--gray-2)', 
                borderRadius: 'var(--radius-2)' 
              }}>
                {alert.riskScore && (
                  <Flex align="center" gap="2" mb="1">
                    <Text size="1" color="gray">Risk Score:</Text>
                    <Badge color={alert.riskScore >= 70 ? 'red' : alert.riskScore >= 40 ? 'orange' : 'green'} size="1">
                      {alert.riskScore}
                    </Badge>
                  </Flex>
                )}
                {alert.amount && (
                  <Box style={{ display: 'block' }}>
                    <Text size="1" color="gray">
                      Amount: {alert.amount} SUI
                    </Text>
                  </Box>
                )}
                {alert.sender && (
                  <Box style={{ display: 'block' }}>
                    <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                      From: {alert.sender.slice(0, 10)}...{alert.sender.slice(-8)}
                    </Text>
                  </Box>
                )}
                {alert.recipient && (
                  <Box style={{ display: 'block' }}>
                    <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                      To: {alert.recipient.slice(0, 10)}...{alert.recipient.slice(-8)}
                    </Text>
                  </Box>
                )}
                {alert.txDigest && (
                  <Box style={{ display: 'block' }}>
                    <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                      Tx: {alert.txDigest.slice(0, 10)}...{alert.txDigest.slice(-8)}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Flex>
        
        <Button
          variant="ghost"
          size="1"
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          <Cross1Icon />
        </Button>
      </Flex>
    </Box>
  );
}