import type { CategoryResult, VoteResult } from '../types';

interface ResultBoardProps {
  result: VoteResult;
}

type CategoryKey = keyof VoteResult['categories'];

/** Human-readable display names for each voting category. */
const CATEGORY_META: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: 'ideaMichiotta', label: '아이디어 미쵸따', emoji: '🎨' },
  { key: 'planningMaster', label: '기획 장인', emoji: '📐' },
  { key: 'keepTouching', label: '자꾸 손이가', emoji: '🔄' },
];

/**
 * Sort a list of category results by vote count in descending order.
 * Returns a new array; the source data is not mutated.
 */
function sortDescByVotes<T extends { voteCount: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.voteCount - a.voteCount);
}

/**
 * ResultBoard renders the final voting results: a ranking board for each of
 * the three categories plus the overall ranking. Winners (including co-winners
 * on ties) are highlighted, and every list is sorted by vote count descending.
 */
export default function ResultBoard({ result }: ResultBoardProps) {
  const sortedOverall = sortDescByVotes(result.overall);

  return (
    <div style={boardStyle}>
      {/* Overall ranking */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <span aria-hidden>🏆</span> 종합 순위
        </h2>
        <p style={sectionDescStyle}>3개 카테고리 합산 총 득표 수</p>
        {sortedOverall.length === 0 ? (
          <p style={emptyRowStyle}>집계된 득표가 없습니다.</p>
        ) : (
          <ol style={listStyle}>
            {sortedOverall.map((entry, index) => (
              <RankRow
                key={`${entry.participantName}-${index}`}
                rank={index + 1}
                participantName={entry.participantName}
                voteCount={entry.totalVoteCount}
                isWinner={entry.isWinner}
              />
            ))}
          </ol>
        )}
      </section>

      {/* Per-category rankings */}
      <div style={categoryGridStyle}>
        {CATEGORY_META.map(({ key, label, emoji }) => {
          const items = sortDescByVotes(result.categories[key]);
          return (
            <section key={key} style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                <span aria-hidden>{emoji}</span> {label}
              </h2>
              {items.length === 0 ? (
                <p style={emptyRowStyle}>집계된 득표가 없습니다.</p>
              ) : (
                <ol style={listStyle}>
                  {items.map((item: CategoryResult, index) => (
                    <RankRow
                      key={item.submissionId}
                      rank={index + 1}
                      participantName={item.participantName}
                      voteCount={item.voteCount}
                      isWinner={item.isWinner}
                    />
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface RankRowProps {
  rank: number;
  participantName: string;
  voteCount: number;
  isWinner: boolean;
}

/** A single ranking row, highlighted when the participant is a winner. */
function RankRow({ rank, participantName, voteCount, isWinner }: RankRowProps) {
  return (
    <li style={{ ...rowStyle, ...(isWinner ? winnerRowStyle : {}) }}>
      <span style={{ ...rankBadgeStyle, ...(isWinner ? winnerRankBadgeStyle : {}) }}>
        {rank}
      </span>
      <span style={nameStyle}>
        {participantName}
        {isWinner && (
          <span style={winnerTagStyle} aria-label="우승자">
            👑 우승
          </span>
        )}
      </span>
      <span style={voteCountStyle}>{voteCount}표</span>
    </li>
  );
}

const boardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
};

const categoryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '24px',
};

const sectionStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px 24px',
  backgroundColor: '#ffffff',
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 4px 0',
};

const sectionDescStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 16px 0',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '8px',
  backgroundColor: '#f9fafb',
};

const winnerRowStyle: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
};

const rankBadgeStyle: React.CSSProperties = {
  flexShrink: 0,
  width: '24px',
  height: '24px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  backgroundColor: '#e5e7eb',
};

const winnerRankBadgeStyle: React.CSSProperties = {
  color: '#92400e',
  backgroundColor: '#fcd34d',
};

const nameStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '15px',
  fontWeight: 500,
  color: '#111827',
};

const winnerTagStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#92400e',
};

const voteCountStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: '14px',
  fontWeight: 600,
  color: '#4b5563',
};

const emptyRowStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: 0,
};
