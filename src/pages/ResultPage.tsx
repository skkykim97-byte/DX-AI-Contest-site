import { useEffect, useState } from 'react';
import type { VoteResult, VotingState } from '../types';
import { fetchResults, fetchState, ApiError } from '../services/api';
import ResultBoard from '../components/ResultBoard';
import { PrizeBanner } from '../components/ContestGuide';

/**
 * ResultPage shows the final voting results, but only after the admin has
 * ended the voting period. While voting is "not_started" or "in_progress",
 * the results are hidden from every user (Requirements 5.5/5.6) and an
 * explanatory message is shown instead.
 */
function ResultPage() {
  const [result, setResult] = useState<VoteResult | null>(null);
  const [votingState, setVotingState] = useState<VotingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Always read the state first so we can decide whether results are
        // even allowed to be displayed.
        const stateData = await fetchState();
        setVotingState(stateData);

        if (stateData.status !== 'ended') {
          // Voting has not ended: results stay hidden. No need to call the
          // results endpoint (it would reject the request anyway).
          setResult(null);
          return;
        }

        const resultData = await fetchResults();
        setResult(resultData);
      } catch (err) {
        // The results endpoint only responds when voting has ended. If the
        // backend rejects the request because voting is still open, treat it
        // as "results not available yet" rather than a hard error.
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setResult(null);
        } else {
          setError('결과를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>
          로딩 중...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <p style={{ textAlign: 'center', color: '#dc2626', fontSize: '16px' }}>
          {error}
        </p>
      </div>
    );
  }

  // Results are hidden until voting has ended.
  const votingEnded = votingState?.status === 'ended';

  if (!votingEnded || !result) {
    return (
      <div style={containerStyle}>
        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>📊 투표 결과 (미리보기)</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            투표가 종료되면 이 화면에 <b>실제 집계 결과</b>가 표시돼요. 아래는 예시 화면이에요.
          </p>
        </div>

        <PrizeBanner />

        <div style={howItWorksStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
            🗳️ 3개 카테고리로 투표하면 이렇게 집계돼요
          </h2>
          <p style={{ fontSize: '14px', color: '#4b5563', margin: 0, lineHeight: 1.7 }}>
            팀원들이 카테고리별로 한 명씩 투표하면, 각 카테고리 순위와 3개 합산 종합 순위가
            자동으로 계산돼요. 종합 1등이 우승자가 됩니다. (동점 시 공동 우승)
          </p>
        </div>

        {/* Example preview using sample data */}
        <div style={{ position: 'relative' }}>
          <div style={exampleBadgeStyle}>예시</div>
          <div style={{ opacity: 0.92, pointerEvents: 'none' }}>
            <ResultBoard result={EXAMPLE_RESULT} />
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af', marginTop: '20px' }}>
          ※ 위 숫자는 예시이며, 실제 결과는 투표 종료 후 공개됩니다.
        </p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={pageHeaderStyle}>
        <h1 style={pageTitleStyle}>🎉 투표 결과</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
          카테고리별 순위와 종합 순위입니다. 동점 시 공동 우승자가 함께 표시됩니다.
        </p>
      </div>
      <ResultBoard result={result} />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '24px 32px',
};

const pageHeaderStyle: React.CSSProperties = {
  marginBottom: '24px',
  paddingBottom: '16px',
  borderBottom: '1px solid #e5e7eb',
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#111827',
  margin: 0,
};

const howItWorksStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  marginBottom: '24px',
};

const exampleBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-10px',
  left: '16px',
  zIndex: 1,
  padding: '3px 12px',
  borderRadius: '9999px',
  backgroundColor: '#6b7280',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 700,
};

/**
 * Sample result shown before voting ends, so participants can see what the
 * live ranking will look like. These are illustrative numbers only.
 */
const EXAMPLE_RESULT: VoteResult = {
  categories: {
    ideaMichiotta: [
      { participantName: '김아이디어', submissionId: 'ex-1', voteCount: 12, isWinner: true },
      { participantName: '박크리에', submissionId: 'ex-2', voteCount: 8, isWinner: false },
      { participantName: '이참신', submissionId: 'ex-3', voteCount: 5, isWinner: false },
    ],
    planningMaster: [
      { participantName: '최기획', submissionId: 'ex-4', voteCount: 11, isWinner: true },
      { participantName: '김아이디어', submissionId: 'ex-1', voteCount: 7, isWinner: false },
      { participantName: '정설계', submissionId: 'ex-5', voteCount: 6, isWinner: false },
    ],
    keepTouching: [
      { participantName: '박크리에', submissionId: 'ex-2', voteCount: 10, isWinner: true },
      { participantName: '최기획', submissionId: 'ex-4', voteCount: 9, isWinner: false },
      { participantName: '이참신', submissionId: 'ex-3', voteCount: 4, isWinner: false },
    ],
  },
  overall: [
    { participantName: '최기획', totalVoteCount: 26, isWinner: true },
    { participantName: '김아이디어', totalVoteCount: 19, isWinner: false },
    { participantName: '박크리에', totalVoteCount: 18, isWinner: false },
    { participantName: '이참신', totalVoteCount: 9, isWinner: false },
    { participantName: '정설계', totalVoteCount: 6, isWinner: false },
  ],
};

export default ResultPage;
