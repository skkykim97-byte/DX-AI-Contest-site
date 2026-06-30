// API client for the AI Vibe Coding Contest frontend.
//
// Covers all backend endpoints:
//   - submissions: GET / POST / PUT / DELETE (Admin write ops via X-Admin-Token)
//   - votes:       POST /api/votes, GET /api/votes/voters (Admin)
//   - state:       GET /api/state, PUT /api/state/advance (Admin)
//   - results:     GET /api/results (only available when voting has ended)
import type { Submission, Vote, VotingState, VoteResult } from '../types';

const API_BASE = '/api';

/**
 * Structured error thrown for any non-2xx API response. Carries through the
 * extra fields the backend returns so callers can render precise messages.
 */
export class ApiError extends Error {
  status: number;
  field?: string;
  currentStatus?: string;
  missingCategories?: string[];

  constructor(
    message: string,
    status: number,
    extra?: { field?: string; currentStatus?: string; missingCategories?: string[] }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = extra?.field;
    this.currentStatus = extra?.currentStatus;
    this.missingCategories = extra?.missingCategories;
  }
}

/**
 * Parse a fetch Response, returning the JSON body on success or throwing an
 * ApiError carrying the server-provided error details on failure.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const errBody = (body ?? {}) as {
      error?: string;
      field?: string;
      currentStatus?: string;
      missingCategories?: string[];
    };
    throw new ApiError(errBody.error || `요청에 실패했습니다 (${res.status})`, res.status, {
      field: errBody.field,
      currentStatus: errBody.currentStatus,
      missingCategories: errBody.missingCategories,
    });
  }

  return body as T;
}

/** Build request headers including the admin token when provided. */
function adminHeaders(token: string): HeadersInit {
  return { 'X-Admin-Token': token };
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export interface SubmissionInput {
  participantName: string;
  type: 'html' | 'github';
  /** GitHub link, or HTML URL when not uploading a file. */
  url?: string;
  description: string;
  /** HTML file to upload (only relevant for type === 'html'). */
  file?: File | null;
  /** true면 아카이빙에는 표시되지만 투표 대상에서 제외됩니다. */
  excludeFromVoting?: boolean;
}

/**
 * Build a multipart FormData payload for submission create/update so the
 * backend's multer middleware can read both text fields and the optional file.
 */
function buildSubmissionFormData(data: Partial<SubmissionInput>): FormData {
  const form = new FormData();
  if (data.participantName !== undefined) form.append('participantName', data.participantName);
  if (data.type !== undefined) form.append('type', data.type);
  if (data.url !== undefined) form.append('url', data.url);
  if (data.description !== undefined) form.append('description', data.description);
  if (data.excludeFromVoting !== undefined) {
    form.append('excludeFromVoting', String(data.excludeFromVoting));
  }
  if (data.file) form.append('file', data.file);
  return form;
}

/** GET /api/submissions - list all submissions (public). */
export async function fetchSubmissions(): Promise<Submission[]> {
  const res = await fetch(`${API_BASE}/submissions`);
  return handleResponse<Submission[]>(res);
}

/** POST /api/submissions - create a submission (Admin). */
export async function createSubmission(
  data: SubmissionInput,
  token: string
): Promise<Submission> {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: buildSubmissionFormData(data),
  });
  return handleResponse<Submission>(res);
}

/** PUT /api/submissions/:id - update a submission (Admin). */
export async function updateSubmission(
  id: string,
  data: Partial<SubmissionInput>,
  token: string
): Promise<Submission> {
  const res = await fetch(`${API_BASE}/submissions/${id}`, {
    method: 'PUT',
    headers: adminHeaders(token),
    body: buildSubmissionFormData(data),
  });
  return handleResponse<Submission>(res);
}

/** DELETE /api/submissions/:id - delete a submission (Admin). */
export async function deleteSubmission(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/submissions/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  return handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export interface VoteInput {
  voterName: string;
  selections: {
    ideaMichiotta: string;
    planningMaster: string;
    keepTouching: string;
  };
}

export interface VoterRecord {
  voterName: string;
  submittedAt: string;
}

/** POST /api/votes - submit a vote (public, requires voting in progress). */
export async function submitVote(input: VoteInput): Promise<Vote> {
  const res = await fetch(`${API_BASE}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Vote>(res);
}

/** GET /api/votes/voters - list voters who have voted (Admin). */
export async function fetchVoters(token: string): Promise<VoterRecord[]> {
  const res = await fetch(`${API_BASE}/votes/voters`, {
    headers: adminHeaders(token),
  });
  return handleResponse<VoterRecord[]>(res);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** GET /api/state - current voting state (public). */
export async function fetchState(): Promise<VotingState> {
  const res = await fetch(`${API_BASE}/state`);
  return handleResponse<VotingState>(res);
}

/** PUT /api/state/advance - advance voting state one step forward (Admin). */
export async function advanceState(token: string): Promise<VotingState> {
  const res = await fetch(`${API_BASE}/state/advance`, {
    method: 'PUT',
    headers: adminHeaders(token),
  });
  return handleResponse<VotingState>(res);
}

/**
 * PUT /api/state/reset - reset voting (clear all votes + state back to
 * 'not_started') for repeated testing (Admin).
 */
export async function resetVoting(token: string): Promise<VotingState> {
  const res = await fetch(`${API_BASE}/state/reset`, {
    method: 'PUT',
    headers: adminHeaders(token),
  });
  return handleResponse<VotingState>(res);
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** GET /api/results - voting results (public, only when state is 'ended'). */
export async function fetchResults(): Promise<VoteResult> {
  const res = await fetch(`${API_BASE}/results`);
  return handleResponse<VoteResult>(res);
}
