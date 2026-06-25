import { useEffect, useState } from 'react';
import type { VoteResult, VotingState } from '../types';
import { fetchResults, fetchState, ApiError } from '../services/api';
import ResultBoard from '../components/ResultBoard';

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
        <div style={noticeStyle}>
          <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>
            🔒 결과를 아직 확인할 수 없습니다
          </p>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: '8px 0 0 0' }}>
            투표가 종료된 후에 결과가 공개됩니다.
          </p>
        </div>
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

const noticeStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 20px',
  textAlign: 'center',
};

export default ResultPage;
