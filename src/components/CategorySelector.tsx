import { Submission } from '../types';

interface CategorySelectorProps {
  /** Unique radio group name (the category selection key). */
  name: string;
  /** Category display title, e.g. "아이디어 미쵸따". */
  title: string;
  /** Short description shown next to the title. */
  subtitle: string;
  /** Emoji/icon prefix for the category heading. */
  icon: string;
  /** Submissions available for selection. */
  submissions: Submission[];
  /** Currently selected submission id (empty string if none). */
  selectedId: string;
  /** Called with the submission id when a participant is selected. */
  onSelect: (submissionId: string) => void;
}

export default function CategorySelector({
  name,
  title,
  subtitle,
  icon,
  submissions,
  selectedId,
  onSelect,
}: CategorySelectorProps) {
  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>
        <span style={{ fontWeight: 700, fontSize: '17px', color: '#111827' }}>
          {icon} {title}
        </span>
        <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '8px' }}>
          {subtitle}
        </span>
      </legend>

      <div style={optionListStyle}>
        {submissions.map((submission) => {
          const isSelected = selectedId === submission.id;

          return (
            <label
              key={submission.id}
              style={{
                ...optionStyle,
                borderColor: isSelected ? '#2563eb' : '#e5e7eb',
                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              }}
            >
              <input
                type="radio"
                name={name}
                value={submission.id}
                checked={isSelected}
                onChange={() => onSelect(submission.id)}
                style={{ marginTop: '3px', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                  {submission.participantName}
                </span>
                <span style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.4 }}>
                  {submission.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const fieldsetStyle: React.CSSProperties = {
  border: 'none',
  margin: 0,
  padding: 0,
};

const legendStyle: React.CSSProperties = {
  padding: 0,
  marginBottom: '12px',
  display: 'block',
};

const optionListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const optionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  padding: '12px 14px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, background-color 0.15s ease',
};
