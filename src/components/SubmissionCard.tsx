import { Submission } from '../types';

interface SubmissionCardProps {
  submission: Submission;
}

export default function SubmissionCard({ submission }: SubmissionCardProps) {
  const { participantName, description, type, url } = submission;

  const isLinkAvailable = url && url.trim().length > 0;

  const typeBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: type === 'github' ? '#1f2937' : '#7c3aed',
    backgroundColor: type === 'github' ? '#e5e7eb' : '#ede9fe',
  };

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'box-shadow 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            color: '#111827',
          }}
        >
          {participantName}
        </h3>
        <span style={typeBadgeStyle}>
          {type === 'github' ? '링크' : 'HTML'}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: '14px',
          color: '#4b5563',
          lineHeight: '1.5',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {description}
      </p>

      <div style={{ marginTop: 'auto' }}>
        {isLinkAvailable ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '14px',
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
            }}
          >
            제출물 보기 →
          </a>
        ) : (
          <span
            style={{
              fontSize: '13px',
              color: '#9ca3af',
              fontStyle: 'italic',
            }}
          >
            링크를 현재 사용할 수 없습니다
          </span>
        )}
      </div>
    </div>
  );
}
