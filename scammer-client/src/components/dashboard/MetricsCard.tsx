import { Box, Card, Text, Flex } from '@radix-ui/themes';
import { TriangleUpIcon, TriangleDownIcon } from '@radix-ui/react-icons';

interface MetricsCardProps {
  title: string;
  value: string;
  trend?: number;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function MetricsCard({ title, value, trend, icon, loading }: MetricsCardProps) {
  if (loading) {
    return (
      <Card style={{ padding: '24px' }}>
        <Box style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
          <Box style={{ height: '16px', backgroundColor: 'var(--gray-4)', borderRadius: '4px', marginBottom: '8px' }}></Box>
          <Box style={{ height: '32px', backgroundColor: 'var(--gray-4)', borderRadius: '4px', marginBottom: '8px' }}></Box>
          <Box style={{ height: '16px', backgroundColor: 'var(--gray-4)', borderRadius: '4px', width: '50%' }}></Box>
        </Box>
      </Card>
    );
  }

  return (
    <Card style={{ 
      padding: '24px', 
      transition: 'box-shadow 0.2s ease-in-out',
      cursor: 'pointer'
    }}>
      <Flex justify="between" align="start" style={{ marginBottom: '16px' }}>
        <Text size="2" color="gray" style={{ 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em',
          fontWeight: '500'
        }}>
          {title}
        </Text>
        {icon && (
          <Box style={{ color: 'var(--gray-9)' }}>
            {icon}
          </Box>
        )}
      </Flex>
      
      <Text size="7" weight="bold" style={{ display: 'block', marginBottom: '8px' }}>
        {value}
      </Text>
      
      {trend !== undefined && (
        <Flex align="center" gap="1">
          {trend > 0 ? (
            <TriangleUpIcon style={{ width: '16px', height: '16px', color: 'var(--green-9)' }} />
          ) : (
            <TriangleDownIcon style={{ width: '16px', height: '16px', color: 'var(--red-9)' }} />
          )}
          <Text size="2" color={trend > 0 ? 'green' : 'red'}>
            {Math.abs(trend).toFixed(1)}%
          </Text>
          <Text size="2" color="gray">vs last period</Text>
        </Flex>
      )}
    </Card>
  );
}