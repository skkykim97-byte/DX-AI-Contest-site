import { useCallback, useEffect, useState } from 'react';
import { Submission, VotingState } from '../types';
import {
  ApiError,
  SubmissionInput,
  VoterRecord,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  fetchSubmissions,
  fetchState,
  advanceState,
  resetVoting,
  fetchVoters,
} from '../services/api';
import StatusBadge from '../components/StatusBadge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAME_MAX = 50;
const DESC_MIN = 10;
const DESC_MAX = 200;

const STATE_LABELS: Record<VotingState['status'], string> = {
  not_started: '미시작',
  in_progress: '진행중',
  ended: '종료',
};

const NEXT_STATE_LABEL: Record<VotingState['status'], string | null> = {
  not_started: '진행중',
  in_progress: '종료',
  ended: null,
};

const NEXT_STATE_ACTION: Record<VotingState['status'], string | null> = {
  not_started: '투표 시작',
  in_progress: '투표 종료',
  ended: null,
};

// Empty form factory.
function emptyForm(): SubmissionInput {
  return {
    participantName: '',
    type: 'github',
    url: '',
    description: '',
    file: null,
  };
}

function AdminPage() {
  // --- Auth state ---
  const [token, setToken] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // --- Data state ---
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [votingState, setVotingState] = useState<VotingState | null>(null);
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // --- Form state ---
  const [form, setForm] = useState<SubmissionInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- State transition feedback ---
  const [stateError, setStateError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Handle a 401 anywhere: drop the token and show auth failure.
  const handleAuthFailure = useCallback(() => {
    setToken(null);
    setAuthError('인증이 만료되었거나 유효하지 않습니다. 비밀번호를 다시 입력해 주세요.');
  }, []);

  // Load all admin data (submissions, state, voters).
  const loadData = useCallback(
    async (authToken: string) => {
      setDataLoading(true);
      setDataError(null);
      try {
        const [submissionsData, stateData, votersData] = await Promise.all([
          fetchSubmissions(),
          fetchState(),
          fetchVoters(authToken),
        ]);
        const sorted = [...submissionsData].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setSubmissions(sorted);
        setVotingState(stateData);
        setVoters(votersData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          handleAuthFailure();
          return;
        }
        setDataError('데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setDataLoading(false);
      }
    },
    [handleAuthFailure]
  );

  // Once authenticated, load data.
  useEffect(() => {
    if (token) {
      loadData(token);
    }
  }, [token, loadData]);

  // --- Auth submit: validate the password via an Admin-only call. ---
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const candidate = passwordInput.trim();
    if (!candidate) {
      setAuthError('비밀번호를 입력해 주세요.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      // fetchVoters is an Admin-only endpoint; success confirms the password.
      await fetchVoters(candidate);
      setToken(candidate);
      setPasswordInput('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthError('비밀번호가 올바르지 않습니다.');
      } else {
        setAuthError('인증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setPasswordInput('');
    setAuthError(null);
    resetForm();
  }

  // --- Form helpers ---
  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
    setFormSuccess(null);
  }

  function startEdit(submission: Submission) {
    setEditingId(submission.id);
    setForm({
      participantName: submission.participantName,
      type: submission.type,
      url: submission.url,
      description: submission.description,
      file: null,
    });
    setFormError(null);
    setFormSuccess(null);
  }

  // Client-side validation mirroring the backend rules.
  function validateForm(): string | null {
    const name = form.participantName.trim();
    if (!name) return '참가자 이름을 입력해 주세요.';
    if (name.length > NAME_MAX) return `참가자 이름은 최대 ${NAME_MAX}자까지 입력할 수 있습니다.`;

    const desc = form.description.trim();
    if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
      return `제작 배경 설명은 ${DESC_MIN}자 이상 ${DESC_MAX}자 이하로 입력해 주세요.`;
    }

    if (form.type === 'github') {
      const url = (form.url ?? '').trim();
      if (!url) return '링크(URL)를 입력해 주세요.';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return '링크는 "http://" 또는 "https://"로 시작해야 합니다.';
      }
    } else {
      // html: require a file on create; on edit, a file is optional (keep existing).
      if (!editingId && !form.file) {
        return 'HTML 파일을 업로드해 주세요 (.html, 최대 10MB).';
      }
      if (form.file && !form.file.name.toLowerCase().endsWith('.html')) {
        return '.html 확장자 파일만 업로드할 수 있습니다.';
      }
    }
    return null;
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setFormSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    // Build payload. For github, no file. For html, include file when present.
    const payload: SubmissionInput = {
      participantName: form.participantName.trim(),
      type: form.type,
      description: form.description.trim(),
      url: form.type === 'github' ? (form.url ?? '').trim() : form.url,
      file: form.type === 'html' ? form.file : null,
    };

    setSubmitting(true);
    try {
      const wasEditing = editingId !== null;
      if (wasEditing) {
        await updateSubmission(editingId!, payload, token);
      } else {
        await createSubmission(payload, token);
      }
      resetForm();
      setFormSuccess(wasEditing ? '제출물이 수정되었습니다.' : '제출물이 등록되었습니다.');
      await loadData(token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('제출물 저장 중 오류가 발생했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(submission: Submission) {
    if (!token) return;
    const confirmed = window.confirm(
      `'${submission.participantName}'의 제출물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      await deleteSubmission(submission.id, token);
      if (editingId === submission.id) resetForm();
      await loadData(token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }
      setDataError('제출물 삭제 중 오류가 발생했습니다.');
    }
  }

  async function handleAdvanceState() {
    if (!token || !votingState) return;
    setStateError(null);
    setAdvancing(true);
    try {
      const next = await advanceState(token);
      setVotingState(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }
      if (err instanceof ApiError) {
        setStateError(err.message);
      } else {
        setStateError('상태 전환 중 오류가 발생했습니다.');
      }
    } finally {
      setAdvancing(false);
    }
  }

  async function handleResetVoting() {
    if (!token) return;
    const confirmed = window.confirm(
      '모든 투표 기록을 삭제하고 투표 상태를 "미시작"으로 되돌립니다.\n(제출물은 유지됩니다.) 계속하시겠습니까?'
    );
    if (!confirmed) return;

    setStateError(null);
    setResetting(true);
    try {
      const next = await resetVoting(token);
      setVotingState(next);
      // Refresh voters list (now empty) and other data.
      await loadData(token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleAuthFailure();
        return;
      }
      if (err instanceof ApiError) {
        setStateError(err.message);
      } else {
        setStateError('투표 초기화 중 오류가 발생했습니다.');
      }
    } finally {
      setResetting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render: password prompt (unauthenticated)
  // -------------------------------------------------------------------------
  if (!token) {
    return (
      <div style={containerStyle}>
        <div style={loginCardStyle}>
          <h1 style={{ fontSize: '22px', margin: '0 0 8px 0' }}>🔐 관리자 인증</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
            관리 기능에 접근하려면 관리자 비밀번호를 입력하세요.
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="관리자 비밀번호"
              autoFocus
              style={inputStyle}
            />
            {authError && <p style={errorTextStyle}>{authError}</p>}
            <button type="submit" disabled={authLoading} style={primaryButtonStyle}>
              {authLoading ? '확인 중...' : '인증'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: admin dashboard (authenticated)
  // -------------------------------------------------------------------------
  const nextLabel = votingState ? NEXT_STATE_LABEL[votingState.status] : null;
  const nextAction = votingState ? NEXT_STATE_ACTION[votingState.status] : null;

  return (
    <div style={containerStyle}>
      {/* Top bar */}
      <div style={topBarStyle}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>관리자 페이지</h1>
        <button type="button" onClick={handleLogout} style={secondaryButtonStyle}>
          로그아웃
        </button>
      </div>

      {dataError && <p style={errorTextStyle}>{dataError}</p>}

      {/* Voting state management */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>투표 상태 관리</h2>
        <div style={stateRowStyle}>
          {votingState ? (
            <StatusBadge status={votingState.status} />
          ) : (
            <span style={{ color: '#6b7280' }}>상태 불러오는 중...</span>
          )}
          {votingState && votingState.status !== 'ended' ? (
            <button
              type="button"
              onClick={handleAdvanceState}
              disabled={advancing}
              style={primaryButtonStyle}
            >
              {advancing
                ? '전환 중...'
                : `${nextAction} (→ ${nextLabel})`}
            </button>
          ) : (
            votingState && (
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                투표가 종료되어 더 이상 상태를 변경할 수 없습니다.
              </span>
            )
          )}
        </div>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '12px 0 0 0' }}>
          상태는 단방향으로만 전환됩니다: 미시작 → 진행중 → 종료
        </p>
        {stateError && <p style={errorTextStyle}>{stateError}</p>}

        {/* 테스트용 투표 초기화 */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e5e7eb' }}>
          <button
            type="button"
            onClick={handleResetVoting}
            disabled={resetting}
            style={dangerButtonStyle}
          >
            {resetting ? '초기화 중...' : '🔄 투표 초기화 (테스트용)'}
          </button>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '8px 0 0 0' }}>
            모든 투표 기록을 삭제하고 상태를 "미시작"으로 되돌립니다. 제출물은 유지됩니다.
          </p>
        </div>
      </section>

      {/* Submission form */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          {editingId ? '제출물 수정' : '제출물 등록'}
        </h2>
        <form onSubmit={handleFormSubmit}>
          <label style={labelStyle}>
            참가자 이름 <span style={{ color: '#dc2626' }}>*</span>
            <input
              type="text"
              value={form.participantName}
              maxLength={NAME_MAX}
              onChange={(e) => setForm({ ...form, participantName: e.target.value })}
              placeholder="참가자 이름 (최대 50자)"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            제출 유형 <span style={{ color: '#dc2626' }}>*</span>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as 'html' | 'github',
                  // reset type-specific fields when switching
                  url: '',
                  file: null,
                })
              }
              style={inputStyle}
            >
              <option value="github">웹 링크 (URL)</option>
              <option value="html">HTML 파일</option>
            </select>
          </label>

          {form.type === 'github' ? (
            <label style={labelStyle}>
              웹 링크 (URL) <span style={{ color: '#dc2626' }}>*</span>
              <input
                type="text"
                value={form.url ?? ''}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://... (GitHub, github.io, 배포 주소 등 모든 링크)"
                style={inputStyle}
              />
            </label>
          ) : (
            <label style={labelStyle}>
              HTML 파일 {editingId ? '(변경 시에만 업로드)' : <span style={{ color: '#dc2626' }}>*</span>}
              <input
                type="file"
                accept=".html"
                onChange={(e) =>
                  setForm({ ...form, file: e.target.files?.[0] ?? null })
                }
                style={{ ...inputStyle, padding: '8px' }}
              />
              {editingId && (
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  현재 파일: {form.url || '없음'}
                </span>
              )}
            </label>
          )}

          <label style={labelStyle}>
            제작 배경 설명 <span style={{ color: '#dc2626' }}>*</span>
            <textarea
              value={form.description}
              maxLength={DESC_MAX}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="제작 배경 설명 (10~200자)"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {form.description.trim().length} / {DESC_MAX}자
            </span>
          </label>

          {formError && <p style={errorTextStyle}>{formError}</p>}
          {formSuccess && <p style={successTextStyle}>{formSuccess}</p>}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="submit" disabled={submitting} style={primaryButtonStyle}>
              {submitting ? '저장 중...' : editingId ? '수정 저장' : '등록'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                취소
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Submission list */}
      <section style={sectionStyle}>
        <div style={sectionHeaderRowStyle}>
          <h2 style={sectionTitleStyle}>제출물 목록</h2>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            총 {submissions.length}개 제출물
          </span>
        </div>
        {dataLoading ? (
          <p style={{ color: '#6b7280' }}>로딩 중...</p>
        ) : submissions.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>등록된 제출물이 없습니다.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>참가자</th>
                <th style={thStyle}>유형</th>
                <th style={thStyle}>설명</th>
                <th style={thStyle}>관리</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{s.participantName}</td>
                  <td style={tdStyle}>{s.type === 'github' ? '링크' : 'HTML'}</td>
                  <td style={{ ...tdStyle, maxWidth: '360px' }}>{s.description}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        style={smallButtonStyle}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        style={dangerButtonStyle}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Voters list */}
      <section style={sectionStyle}>
        <div style={sectionHeaderRowStyle}>
          <h2 style={sectionTitleStyle}>투표 완료자 목록</h2>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            총 {voters.length}명 투표 완료
          </span>
        </div>
        {voters.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>아직 투표한 사람이 없습니다.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>이름</th>
                <th style={thStyle}>투표 시간</th>
              </tr>
            </thead>
            <tbody>
              {voters.map((v, idx) => (
                <tr key={`${v.voterName}-${idx}`}>
                  <td style={tdStyle}>{v.voterName}</td>
                  <td style={tdStyle}>{new Date(v.submittedAt).toLocaleString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles (PC-optimized, consistent with ArchivePage)
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '24px 32px',
};

const loginCardStyle: React.CSSProperties = {
  maxWidth: '420px',
  margin: '80px auto',
  padding: '32px',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  paddingBottom: '16px',
  borderBottom: '1px solid #e5e7eb',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '32px',
  padding: '24px',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  margin: '0 0 16px 0',
};

const sectionHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const stateRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '16px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  boxSizing: 'border-box',
  fontWeight: 400,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '8px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  backgroundColor: '#ffffff',
  color: '#374151',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const smallButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  backgroundColor: '#ffffff',
  color: '#374151',
  fontSize: '13px',
  cursor: 'pointer',
};

const dangerButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  fontSize: '13px',
  cursor: 'pointer',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '2px solid #e5e7eb',
  color: '#6b7280',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
  color: '#374151',
  verticalAlign: 'top',
};

const errorTextStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '14px',
  margin: '8px 0',
};

const successTextStyle: React.CSSProperties = {
  color: '#059669',
  fontSize: '14px',
  margin: '8px 0',
};

export default AdminPage;
