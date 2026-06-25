/**
 * Normalize a name for duplicate detection.
 * Trims whitespace, removes all internal whitespace, converts to lowercase.
 * (Req 6.2)
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * Validate that a URL is a well-formed web link (http:// or https://).
 * Accepts any web address, not only github.com.
 */
export function validateUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Validate a GitHub URL starts with "https://github.com/".
 * (Kept for backward compatibility; general submissions use validateUrl.)
 */
export function validateGitHubUrl(url: string): boolean {
  return url.startsWith('https://github.com/');
}

/**
 * Validate voter name constraints.
 * (Req 6.3, 6.4)
 */
export function validateVoterName(name: unknown): { valid: boolean; error?: string } {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: '투표자 이름이 비어있습니다.' };
  }
  if (name.length > 50) {
    return { valid: false, error: '투표자 이름은 50자를 초과할 수 없습니다.' };
  }
  return { valid: true };
}

interface SubmissionValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

/**
 * Validate submission data.
 * (Req 1.1, 1.3, 1.6, 1.7)
 */
export function validateSubmission(data: unknown): SubmissionValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '유효하지 않은 데이터입니다.', field: 'data' };
  }

  const obj = data as Record<string, unknown>;

  // Req 1.7: 참가자 이름 비어있으면 등록 거부
  if (typeof obj.participantName !== 'string' || obj.participantName.trim().length === 0) {
    return { valid: false, error: '참가자 이름이 비어있습니다.', field: 'participantName' };
  }

  // Req 1.1: 참가자 이름 최대 50자
  if (obj.participantName.length > 50) {
    return { valid: false, error: '참가자 이름은 50자를 초과할 수 없습니다.', field: 'participantName' };
  }

  // Req 1.1: 제출 유형 (HTML/GitHub)
  if (obj.type !== 'html' && obj.type !== 'github') {
    return { valid: false, error: '제출 유형은 html 또는 github이어야 합니다.', field: 'type' };
  }

  // Req 1.1: URL 필수
  if (typeof obj.url !== 'string' || obj.url.trim().length === 0) {
    return { valid: false, error: 'URL이 비어있습니다.', field: 'url' };
  }

  // Req 1.3: 링크 형식 검증 (모든 웹 링크 허용: http:// 또는 https://)
  if (obj.type === 'github' && !validateUrl(obj.url)) {
    return { valid: false, error: '링크는 http:// 또는 https:// 로 시작해야 합니다.', field: 'url' };
  }

  // Req 1.6: 제작 배경 설명 없거나 10자 미만이면 등록 거부
  if (typeof obj.description !== 'string' || obj.description.trim().length < 10) {
    return { valid: false, error: '제작 배경 설명은 10자 이상이어야 합니다.', field: 'description' };
  }

  // Req 1.1: 제작 배경 설명 최대 200자
  if (obj.description.length > 200) {
    return { valid: false, error: '제작 배경 설명은 200자를 초과할 수 없습니다.', field: 'description' };
  }

  return { valid: true };
}

const CATEGORY_KEYS = ['ideaMichiotta', 'planningMaster', 'keepTouching'] as const;

interface VoteValidationResult {
  valid: boolean;
  error?: string;
  missingCategories?: string[];
}

/**
 * Validate vote data.
 * (Req 3.2, 3.3, 6.3, 6.4)
 */
export function validateVote(data: unknown): VoteValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '유효하지 않은 데이터입니다.' };
  }

  const obj = data as Record<string, unknown>;

  // Req 6.3, 6.4: 투표자 이름 검증
  const voterNameResult = validateVoterName(obj.voterName);
  if (!voterNameResult.valid) {
    return { valid: false, error: voterNameResult.error };
  }

  // Req 3.2: selections 객체 검증
  if (!obj.selections || typeof obj.selections !== 'object') {
    return { valid: false, error: '투표 선택이 필요합니다.', missingCategories: [...CATEGORY_KEYS] };
  }

  const selections = obj.selections as Record<string, unknown>;

  // Req 3.2: 카테고리당 정확히 1개 선택 (총 3표)
  const missingCategories: string[] = [];
  for (const key of CATEGORY_KEYS) {
    if (typeof selections[key] !== 'string' || selections[key].trim().length === 0) {
      missingCategories.push(key);
    }
  }

  if (missingCategories.length > 0) {
    return {
      valid: false,
      error: '모든 카테고리에 대해 투표해야 합니다.',
      missingCategories,
    };
  }

  // Req 3.3: 동일 참가자 2개 이상 카테고리 선택 방지
  const selectedIds = CATEGORY_KEYS.map((key) => selections[key] as string);
  const uniqueIds = new Set(selectedIds);
  if (uniqueIds.size < selectedIds.length) {
    return { valid: false, error: '동일한 참가자를 2개 이상의 카테고리에 선택할 수 없습니다.' };
  }

  return { valid: true };
}
