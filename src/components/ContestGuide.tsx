/**
 * Shared explainer pieces used on the Vote/Result pages BEFORE voting starts,
 * so participants understand how the contest works and what the prize is.
 */

export interface CategoryInfo {
  key: 'ideaMichiotta' | 'planningMaster' | 'keepTouching';
  title: string;
  subtitle: string;
  icon: string;
}

/** The three voting categories, shared across the app. */
export const CATEGORIES: CategoryInfo[] = [
  {
    key: 'ideaMichiotta',
    title: '아이디어 미쵸따',
    subtitle: '가장 크리에이티브한 결과물 (창의성)',
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
    subtitle: '다시 써보고 싶은 서비스 (재사용성)',
    icon: '🔄',
  },
];

/** Prize banner: 1st place reward. */
export function PrizeBanner() {
  return (
    <div style={prizeBannerStyle}>
      <span style={{ fontSize: '28px' }}>🏆</span>
      <div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
          종합 1등 부상: 10만원 회식권
        </div>
        <div style={{ fontSize: '13px', color: '#b45309', marginTop: '2px' }}>
          3개 카테고리 합산 최다 득표자가 영예의 주인공! (동점 시 공동 우승)
        </div>
      </div>
    </div>
  );
}

/** Explains how voting works: pick one per category, no duplicates. */
export function HowVotingWorks() {
  return (
    <div style={cardStyle}>
      <h2 style={sectionTitleStyle}>📋 이렇게 투표해요</h2>
      <ol style={stepListStyle}>
        <li>투표가 시작되면 아래 3개 카테고리가 나타나요.</li>
        <li>카테고리마다 가장 마음에 드는 출품작을 <b>한 명씩</b> 선택해요 (총 3표).</li>
        <li>같은 참가자를 여러 카테고리에 <b>중복으로 선택해도 돼요.</b></li>
        <li>이름을 입력해 제출하면 완료! (중복 투표 방지를 위해 1인 1회)</li>
      </ol>

      <div style={categoryGridStyle}>
        {CATEGORIES.map((c) => (
          <div key={c.key} style={categoryItemStyle}>
            <div style={{ fontSize: '22px' }}>{c.icon}</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
              {c.title}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
              {c.subtitle}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const prizeBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '16px 20px',
  borderRadius: '12px',
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
  marginBottom: '20px',
};

const cardStyle: React.CSSProperties = {
  padding: '24px',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  marginBottom: '20px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 12px 0',
};

const stepListStyle: React.CSSProperties = {
  margin: '0 0 20px 0',
  paddingLeft: '20px',
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: 1.9,
};

const categoryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
};

const categoryItemStyle: React.CSSProperties = {
  padding: '16px',
  borderRadius: '10px',
  backgroundColor: '#f9fafb',
  border: '1px solid #f0f1f3',
  textAlign: 'center',
};
