import { useEffect, useState } from 'react';
import { Submission, VotingState } from '../types';
import { fetchSubmissions, fetchState } from '../services/api';
import VotingForm from '../components/VotingForm';
import { HowVotingWorks, PrizeBanner } from '../components/ContestGuide';

function VotePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [votingState, setVotingState] = useState<VotingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [submissionsData, stateData] = await Promise.all([
          fetchSubmissions(),
          fetchState(),
        ]);
        setSubmissions(submissionsData);
        setVotingState(stateData);
      } catch {
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
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={noticeBoxStyle}>
          <p style={{ color: '#dc2626', fontSize: '16px', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  // Vote submitted successfully - confirmation message.
  if (voted) {
    return (
      <div style={containerStyle}>
        <div style={{ ...noticeBoxStyle, borderColor: '#86efac', backgroundColor: '#f0fdf4' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>✅</p>
          <h2 style={{ fontSize: '22px', color: '#15803d', margin: '8px 0 4px 0' }}>
            투표가 접수되었습니다!
          </h2>
          <p style={{ fontSize: '15px', color: '#4b5563', margin: 0 }}>
            소중한 투표에 참여해 주셔서 감사합니다.
          </p>
        </div>
      </div>
    );
  }

  const status = votingState?.status;

  // not_started: voting hasn't begun yet.
  if (status === 'not_started') {
    return (
      <div style={containerStyle}>
        <div style={{ ...noticeBoxStyle, padding: '36px 24px', marginBottom: '20px' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>⏳</p>
          <h2 style={{ fontSize: '22px', color: '#111827', margin: '8px 0 4px 0' }}>
            곧 투표가 시작됩니다
          </h2>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
            관리자가 투표를 시작하면 이 화면에서 바로 투표할 수 있어요. 그 전에 진행 방식을 미리 확인해 보세요!
          </p>
        </div>

        <PrizeBanner />
        <HowVotingWorks />
      </div>
    );
  }

  // ended: voting period is over.
  if (status === 'ended') {
    return (
      <div style={containerStyle}>
        <div style={{ ...noticeBoxStyle, borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>🏁</p>
          <h2 style={{ fontSize: '22px', color: '#b91c1c', margin: '8px 0 4px 0' }}>
            투표가 종료되었습니다
          </h2>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
            더 이상 투표를 제출할 수 없습니다. 결과 페이지에서 결과를 확인해 주세요.
          </p>
        </div>
      </div>
    );
  }

  // in_progress: show the voting form.
  // 투표 제외(excludeFromVoting) 항목은 투표 대상에서 거릅니다.
  const votableSubmissions = submissions.filter((s) => !s.excludeFromVoting);
  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: 0 }}>
        🗳️ 투표하기
      </h1>
      <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', marginBottom: '20px' }}>
        3개 카테고리에서 각각 한 명씩 선택해 투표해 주세요. 동일한 참가자를 여러 카테고리에서 선택할 수 없습니다.
      </p>
      <PrizeBanner />
      <VotingForm submissions={votableSubmissions} onVoted={() => setVoted(true)} />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '24px 32px',
};

const noticeBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '60px 24px',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  gap: '4px',
};

export default VotePage;
