import { Submission } from '../types';

interface SubmissionCardProps {
  submission: Submission;
}

/**
 * Submission card with:
 *  - a live preview thumbnail of the submission (URL or uploaded HTML),
 *  - the participant name and type badge,
 *  - the FULL "제작 배경" description (no truncation),
 *  - a link to open the submission in a new tab.
 */
export default function SubmissionCard({ submission }: SubmissionCardProps) {
  const { participantName, description, type, url } = submission;

  const isLinkAvailable = url && url.trim().length > 0;

  const typeBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
    color: type === 'github' ? '#1f2937' : '#7c3aed',
    backgroundColor: type === 'github' ? '#e5e7eb' : '#ede9fe',
  };

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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
      {/* Preview thumbnail */}
      <PreviewArea url={isLinkAvailable ? url : null} />

      {/* Body */}
      <div
        style={{
          padding: '16px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
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
          <span style={typeBadgeStyle}>{type === 'github' ? '링크' : 'HTML'}</span>
        </div>

        {/* Full description - wraps fully, no clamping */}
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#4b5563',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {description}
        </p>

        <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
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
    </div>
  );
}

/**
 * Live preview of the submission rendered inside a scaled-down iframe so the
 * card shows a "thumbnail" of the actual site / HTML main page. The iframe is
 * non-interactive (pointer-events disabled) and a transparent link overlay
 * opens the real submission in a new tab on click.
 *
 * Note: some external sites block being embedded in an iframe
 * (X-Frame-Options / CSP). In that case the iframe stays blank, so we keep a
 * neutral placeholder behind it.
 */
function PreviewArea({ url }: { url: string | null }) {
  const PREVIEW_HEIGHT = 180; // visible thumbnail height
  const SCALE = 0.5; // render the page at 2x then scale down to show more

  return (
    <div
      style={{
        position: 'relative',
        height: `${PREVIEW_HEIGHT}px`,
        backgroundColor: '#f3f4f6',
        borderBottom: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {/* Placeholder shown behind the iframe (visible if embedding is blocked) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '13px',
        }}
      >
        {url ? '미리보기' : '미리보기를 사용할 수 없습니다'}
      </div>

      {url && (
        <iframe
          src={url}
          title="submission-preview"
          loading="lazy"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${100 / SCALE}%`,
            height: `${PREVIEW_HEIGHT / SCALE}px`,
            border: 'none',
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            backgroundColor: '#ffffff',
          }}
        />
      )}

      {/* Transparent overlay: click preview to open submission in a new tab */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="제출물 새 탭에서 열기"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
          }}
        />
      )}
    </div>
  );
}
