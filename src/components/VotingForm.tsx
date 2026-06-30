import { useMemo, useState } from 'react';
import { Submission } from '../types';
import { submitVote, ApiError, VoteInput } from '../services/api';
import VoterNameInput from './VoterNameInput';
import CategorySelector from './CategorySelector';

type CategoryKey = 'ideaMichiotta' | 'planningMaster' | 'keepTouching';

interface CategoryMeta {
  key: CategoryKey;
  title: string;
  subtitle: string;
  icon: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: 'ideaMichiotta',
    title: '아이디어 미쵸따',
    subtitle: '가장 크리에이티브한 결과물',
    icon: '🎨',
  },
  {
    key: 'planningMaster',
    title: '기획 장인',
    subtitle: '섬세한 기획 + 탄탄한 설계',
    icon: '📐',
  },
  {
    key: 'keepTouching',
    title: '자꾸 손이가',
    subtitle: '다시 써보고 싶은 서비스',
    icon: '🔄',
  },
];

const MAX_NAME_LENGTH = 50;

type Selections = Record<CategoryKey, string>;

const EMPTY_SELECTIONS: Selections = {
  ideaMichiotta: '',
  planningMaster: '',
  keepTouching: '',
};

interface VotingFormProps {
  submissions: Submission[];
  /** Called when the vote is successfully submitted. */
  onVoted: () => void;
}

export default function VotingForm({ submissions, onVoted }: VotingFormProps) {
  const [voterName, setVoterName] = useState('');
  const [selections, setSelections] = useState<Selections>(EMPTY_SELECTIONS);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const missingCategories = useMemo(
    () => CATEGORIES.filter((meta) => !selections[meta.key]),
    [selections]
  );

  const handleSelect = (key: CategoryKey, submissionId: string) => {
    setSelections((prev) => ({ ...prev, [key]: submissionId }));
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const trimmed = voterName.trim();
    if (trimmed.length === 0) {
      setNameError('투표자 이름을 입력해 주세요.');
      return false;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setNameError(`이름은 최대 ${MAX_NAME_LENGTH}자까지 입력할 수 있습니다.`);
      return false;
    }
    setNameError(null);

    if (missingCategories.length > 0) {
      const names = missingCategories.map((m) => m.title).join(', ');
      setSubmitError(`다음 카테고리에서 선택이 누락되었습니다: ${names}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const payload: VoteInput = {
      voterName: voterName.trim(),
      selections: {
        ideaMichiotta: selections.ideaMichiotta,
        planningMaster: selections.planningMaster,
        keepTouching: selections.keepTouching,
      },
    };

    try {
      setSubmitting(true);
      await submitVote(payload);
      onVoted();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setSubmitError('이미 투표가 완료되었습니다. 투표는 1회만 가능합니다.');
        } else if (err.status === 403) {
          setSubmitError(
            err.currentStatus === 'ended'
              ? '투표 기간이 종료되어 더 이상 투표할 수 없습니다.'
              : '현재 투표를 제출할 수 없는 상태입니다.'
          );
        } else if (err.status === 400 && err.missingCategories?.length) {
          setSubmitError(
            `다음 카테고리에서 선택이 누락되었습니다: ${err.missingCategories.join(', ')}`
          );
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('투표 제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submissions.length === 0) {
    return (
      <div style={noticeStyle}>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
          아직 투표할 수 있는 제출물이 없습니다.
        </p>
      </div>
    );
  }

  const canSubmit = !submitting && missingCategories.length === 0;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <VoterNameInput
        value={voterName}
        onChange={(v) => {
          setVoterName(v);
          if (nameError) setNameError(null);
        }}
        error={nameError}
        disabled={submitting}
      />

      <hr style={dividerStyle} />

      {CATEGORIES.map((meta) => (
        <CategorySelector
          key={meta.key}
          name={meta.key}
          title={meta.title}
          subtitle={meta.subtitle}
          icon={meta.icon}
          submissions={submissions}
          selectedId={selections[meta.key]}
          onSelect={(id) => handleSelect(meta.key, id)}
        />
      ))}

      {submitError && (
        <div style={errorStyle} role="alert">
          {submitError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...submitButtonStyle,
            backgroundColor: canSubmit ? '#2563eb' : '#9ca3af',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? '제출 중...' : '투표하기 🗳️'}
        </button>
      </div>
    </form>
  );
}

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: 0,
};

const errorStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: '#fef2f2',
  border: '1px solid #fca5a5',
  color: '#b91c1c',
  fontSize: '14px',
};

const noticeStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '60px 20px',
  textAlign: 'center',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '12px 40px',
  fontSize: '16px',
  fontWeight: 600,
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  transition: 'background-color 0.15s ease',
};
