const MAX_NAME_LENGTH = 50;

interface VoterNameInputProps {
  /** Current voter name value. */
  value: string;
  /** Called with the new value on change (already capped to max length). */
  onChange: (value: string) => void;
  /** Optional validation message to display below the input. */
  error?: string | null;
  /** Disables the input (e.g. while submitting). */
  disabled?: boolean;
}

export default function VoterNameInput({
  value,
  onChange,
  error,
  disabled,
}: VoterNameInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label htmlFor="voterName" style={labelStyle}>
        📝 투표자 이름 <span style={{ color: '#dc2626' }}>*</span>
      </label>
      <input
        id="voterName"
        type="text"
        value={value}
        maxLength={MAX_NAME_LENGTH}
        disabled={disabled}
        placeholder="이름을 입력하세요 (중복 투표 방지용)"
        onChange={(e) => onChange(e.target.value.slice(0, MAX_NAME_LENGTH))}
        style={{
          ...inputStyle,
          borderColor: error ? '#dc2626' : '#d1d5db',
          backgroundColor: disabled ? '#f9fafb' : '#ffffff',
        }}
      />
      <div style={helperRowStyle}>
        <span style={{ fontSize: '13px', color: error ? '#dc2626' : '#9ca3af' }}>
          {error ?? '입력한 이름은 중복 투표 방지에만 사용됩니다.'}
        </span>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          {value.length}/{MAX_NAME_LENGTH}
        </span>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '15px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  boxSizing: 'border-box',
  outline: 'none',
};

const helperRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};
