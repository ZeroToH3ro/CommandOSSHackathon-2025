import { Box, Text } from '@radix-ui/themes';

interface TransactionStatusProps {
  status: string;
  onClear?: () => void;
}

export function TransactionStatus({ status, onClear }: TransactionStatusProps) {
  if (!status) return null;

  const getStatusColor = () => {
    if (status.includes('✅')) return { bg: 'var(--green-2)', border: 'var(--green-6)', text: 'green' };
    if (status.includes('❌')) return { bg: 'var(--red-2)', border: 'var(--red-6)', text: 'red' };
    if (status.includes('⚠️')) return { bg: 'var(--orange-2)', border: 'var(--orange-6)', text: 'orange' };
    return { bg: 'var(--blue-2)', border: 'var(--blue-6)', text: 'blue' };
  };

  const colors = getStatusColor();

  return (
    <Box 
      p="3" 
      style={{ 
        backgroundColor: colors.bg,
        borderRadius: '6px',
        border: `1px solid ${colors.border}`,
        position: 'relative'
      }}
    >
      <Text size="2" weight="medium" color={colors.text as any}>
        {status}
      </Text>
      {onClear && (
        <button
          onClick={onClear}
          style={{
            position: 'absolute',
            top: '4px',
            right: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            color: 'var(--gray-9)'
          }}
        >
          ×
        </button>
      )}
    </Box>
  );
}
