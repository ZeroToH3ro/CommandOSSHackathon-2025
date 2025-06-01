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
        return {
          backgroundColor: 'var(--red-2)',
          borderColor: 'var(--red-6)',
          color: 'var(--red-11)'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--yellow-2)',
          borderColor: 'var(--yellow-6)',
          color: 'var(--yellow-11)'
        };
      case 'success':
        return {
          backgroundColor: 'var(--green-2)',
          borderColor: 'var(--green-6)',
          color: 'var(--green-11)'
        };
      default:
        return {
          backgroundColor: 'var(--blue-2)',
          borderColor: 'var(--blue-6)',
          color: 'var(--blue-11)'
        };
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--red-9)' }} />;
      case 'warning':
        return <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: 'var(--yellow-9)' }} />;
      case 'success':
        return <CheckCircledIcon style={{ width: '20px', height: '20px', color: 'var(--green-9)' }} />;
      default:
        return <InfoCircledIcon style={{ width: '20px', height: '20px', color: 'var(--blue-9)' }} />;
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

  const alertColors = getAlertColors(alert.type);

  return (
    <Box style={{
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${alertColors.borderColor}`,
      backgroundColor: alertColors.backgroundColor,
      color: alertColors.color
    }}>
      <Flex justify="between" align="start" gap="3">
        <Flex gap="3" align="start" style={{ flex: 1 }}>
          {getAlertIcon(alert.type)}
          <Box style={{ flex: 1 }}>
            <Flex align="center" gap="2" style={{ marginBottom: '4px' }}>
              <Text weight="bold" size="3">{alert.title}</Text>
              <Badge color={getSeverityColor(alert.severity)} size="1">
                {alert.severity.toUpperCase()}
              </Badge>
            </Flex>
            <Text size="2">{alert.message}</Text>
            <Text size="1" color="gray" style={{ marginTop: '4px' }}>
              {new Date(alert.timestamp).toLocaleString()}
            </Text>
            
            {/* Contract-specific information */}
            {(alert.sender || alert.recipient || alert.amount || alert.riskScore) && (
              <Box style={{ 
                marginTop: '8px',
                padding: '8px', 
                backgroundColor: 'var(--gray-2)', 
                borderRadius: 'var(--radius-2)' 
              }}>
                {alert.riskScore && (
                  <Flex align="center" gap="2" style={{ marginBottom: '4px' }}>
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
          style={{ color: 'var(--gray-9)' }}
        >
          <Cross1Icon />
        </Button>
      </Flex>
    </Box>
  );
}