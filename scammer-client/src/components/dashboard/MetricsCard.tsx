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
      <Card className="p-6">
        <Box className="animate-pulse">
          <Box className="h-4 bg-gray-200 rounded mb-2"></Box>
          <Box className="h-8 bg-gray-200 rounded mb-2"></Box>
          <Box className="h-4 bg-gray-200 rounded w-1/2"></Box>
        </Box>
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <Flex justify="between" align="start" className="mb-4">
        <Text size="2" color="gray" className="uppercase tracking-wide">
          {title}
        </Text>
        {icon && (
          <Box className="text-gray-400">
            {icon}
          </Box>
        )}
      </Flex>
      
      <Text size="7" weight="bold" className="block mb-2">
        {value}
      </Text>
      
      {trend !== undefined && (
        <Flex align="center" gap="1">
          {trend > 0 ? (
            <TriangleUpIcon className="w-4 h-4 text-green-500" />
          ) : (
            <TriangleDownIcon className="w-4 h-4 text-red-500" />
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