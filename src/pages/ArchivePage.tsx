import { useEffect, useState } from 'react';
import { Submission, VotingState } from '../types';
import { fetchSubmissions, fetchState } from '../services/api';
import SubmissionCard from '../components/SubmissionCard';
import StatusBadge from '../components/StatusBadge';

function ArchivePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [votingState, setVotingState] = useState<VotingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [submissionsData, stateData] = await Promise.all([
          fetchSubmissions(),
          fetchState(),
        ]);
        // Sort by createdAt descending (newest first)
        const sorted = [...submissionsData].sort(
          (a: Submission, b: Submission) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setSubmissions(sorted);
        setVotingState(stateData);
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
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

  return (
    <div style={containerStyle}>
      {/* Header info bar */}
      <div style={headerBarStyle}>
        <div>
          {votingState && <StatusBadge status={votingState.status} />}
        </div>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          총 {submissions.length}개 출품작
        </span>
      </div>

      {/* Content */}
      {submissions.length === 0 ? (
        <div style={emptyStateStyle}>
          <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>
            📭 아직 등록된 제출물이 없습니다.
          </p>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: '8px 0 0 0' }}>
            관리자가 제출물을 등록하면 이곳에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={gridStyle}>
          {submissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '24px 32px',
};

const headerBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  paddingBottom: '16px',
  borderBottom: '1px solid #e5e7eb',
};

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 20px',
  textAlign: 'center',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '20px',
};

export default ArchivePage;
