import { VotingState } from '../types';

interface StatusBadgeProps {
  status: VotingState['status'];
}

const statusConfig: Record<VotingState['status'], { label: string; color: string; bgColor: string; dotColor: string }> = {
  not_started: {
    label: '미시작',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    dotColor: '#9ca3af',
  },
  in_progress: {
    label: '진행중',
    color: '#059669',
    bgColor: '#ecfdf5',
    dotColor: '#10b981',
  },
  ended: {
    label: '종료',
    color: '#dc2626',
    bgColor: '#fef2f2',
    dotColor: '#ef4444',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: 500,
        color: config.color,
        backgroundColor: config.bgColor,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.dotColor,
        }}
      />
      투표 상태: {config.label}
    </span>
  );
}
