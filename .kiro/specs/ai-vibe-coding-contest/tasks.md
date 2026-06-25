# Implementation Plan: AI 바이브 코딩 콘테스트

## Overview

React + TypeScript + Vite 프론트엔드와 Express.js 백엔드를 단일 프로젝트로 구성하여, 제출물 아카이빙, 3개 카테고리 투표, 결과 확인, Admin 관리 기능을 구현한다. JSON 파일 기반 저장소를 사용하며, PC 최적화 UI로 개발한다.

## Tasks

- [x] 1. 프로젝트 초기화 및 공통 인터페이스 정의
  - [x] 1.1 프로젝트 구조 설정
    - Vite + React + TypeScript 프론트엔드 초기화 (React Router 포함)
    - Express.js 백엔드 디렉토리 구조 생성 (routes/, services/, store/, middleware/, validators/)
    - 공통 개발 스크립트 설정 (dev: 프론트+백엔드 동시 실행, build, test)
    - Vitest 테스트 프레임워크 설정
    - _Requirements: 전체_

  - [x] 1.2 공유 타입 및 데이터 모델 정의
    - `types/index.ts`에 Submission, Vote, VotingState, VoteResult, CategoryResult 인터페이스 정의
    - 이름 정규화 함수 `normalizeName` 구현
    - JSON 파일 기반 저장소(`JsonFileStore`) 구현 (원자적 쓰기, in-memory mutex)
    - 입력 검증 함수 구현 (제출물 검증, 투표 검증, GitHub URL 검증)
    - _Requirements: 1.1, 1.3, 1.6, 1.7, 3.2, 3.3, 6.2, 6.3, 6.4_

- [x] 2. 백엔드 API 서비스 구현
  - [x] 2.1 제출물 관리 서비스 및 API 구현
    - `SubmissionService`: 제출물 CRUD 로직 (등록, 조회, 수정, 삭제)
    - `routes/submissions.ts`: GET/POST/PUT/DELETE 엔드포인트
    - HTML 파일 업로드 처리 (multer, 최대 10MB, .html 확장자 검증)
    - Admin 인증 미들웨어 (`X-Admin-Token` 헤더 검증)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 4.7_

  - [x] 2.2 투표 및 상태 관리 서비스 구현
    - `VoteService`: 투표 접수, 중복 투표 검사 (이름 정규화 기반), 동일 참가자 다중 카테고리 선택 방지
    - `StateService`: 투표 상태 단방향 전환 (not_started → in_progress → ended)
    - `ResultService`: 카테고리별/종합 득표 집계, 우승자 결정 (동점 시 공동 우승)
    - `routes/votes.ts`, `routes/state.ts`, `routes/results.ts` 엔드포인트
    - _Requirements: 3.1~3.8, 4.1~4.7, 5.1~5.6, 6.1~6.5_

  - [x] 2.3 핵심 비즈니스 로직 Property-Based 테스트 작성
    - **Property 9: 투표 상태 전환 단방향성** - StateService 상태 전환 검증
    - **Property 10: 투표 집계 정확성** - ResultService 득표 수 계산 검증
    - **Property 11: 우승자 결정 및 동점 처리** - ResultService 우승자 판별 검증
    - **Property 14: 이름 정규화 및 중복 투표 탐지** - normalizeName 함수 검증
    - fast-check 라이브러리 사용, Vitest 기반
    - **Validates: Requirements 3.6, 4.6, 5.1, 5.2, 5.3, 6.1, 6.2**

- [x] 3. Checkpoint - 백엔드 API 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 프론트엔드 공통 레이아웃 및 아카이빙 페이지
  - [x] 4.1 공통 레이아웃 및 라우팅 설정
    - App.tsx: React Router 설정 (아카이빙, 투표, 결과, Admin 페이지)
    - 상단 고정 헤더 (타이틀 + 네비게이션 탭)
    - 콘텐츠 최대 너비 1200px 중앙 정렬 레이아웃
    - API 클라이언트 (`services/api.ts`) 구현
    - _Requirements: 2.1, 4.4_

  - [x] 4.2 아카이빙 페이지 구현
    - `ArchivePage.tsx`: 제출물 그리드(3~4열) 카드 레이아웃
    - `SubmissionCard.tsx`: 참가자 이름, 제작 배경 설명(2줄 제한), 제출 유형 배지, 보기 링크(새 탭)
    - `StatusBadge.tsx`: 현재 투표 상태 표시
    - 빈 상태 메시지 처리 (등록된 제출물 없을 때)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.4_

- [x] 5. 투표 페이지 및 결과 페이지
  - [x] 5.1 투표 페이지 구현
    - `VotePage.tsx`: 투표 폼 전체 레이아웃
    - `VoterNameInput.tsx`: 투표자 이름 입력 (필수, 최대 50자)
    - `CategorySelector.tsx`: 카테고리별 라디오 버튼 참가자 선택
    - 동일 참가자 다중 선택 시 실시간 경고 표시
    - 투표 상태별 UI 분기 (미시작: 안내 메시지, 진행중: 투표 폼, 종료: 종료 안내)
    - 투표 완료 시 확인 메시지 표시
    - _Requirements: 3.1~3.8, 4.1, 4.3, 4.5, 6.3, 6.4_

  - [x] 5.2 결과 페이지 구현
    - `ResultPage.tsx`: 투표 종료 후에만 결과 표시
    - `ResultBoard.tsx`: 카테고리별 순위 + 종합 순위 보드
    - 우승자 하이라이트 (동점 시 공동 우승자 모두 표시)
    - 득표 수 내림차순 정렬
    - 투표 미종료 시 "결과를 아직 확인할 수 없습니다" 메시지
    - _Requirements: 5.1~5.6_

- [x] 6. Admin 관리 페이지
  - [x] 6.1 Admin 페이지 구현
    - `AdminPage.tsx`: 비밀번호 입력 → 인증 후 관리 기능 접근
    - 제출물 등록 폼 (참가자 이름, 제출 유형, URL/파일, 제작 배경 설명)
    - 제출물 목록 관리 (수정, 삭제 + 삭제 확인 프롬프트)
    - 투표 상태 전환 버튼 (현재 상태 표시 + 다음 상태로 전진)
    - 투표 완료자 목록 조회 (이름, 투표 시간)
    - 등록된 제출물 총 개수 표시
    - _Requirements: 1.1~1.8, 4.2, 4.3, 4.6, 4.7, 6.5_

- [x] 7. 통합 및 서버 배포 구성
  - [x] 7.1 프론트엔드-백엔드 통합 및 빌드 설정
    - Express 서버에서 프론트엔드 빌드 결과물(dist/) 정적 서빙 설정
    - 프론트엔드 빌드 명령어 (vite build) 및 서버 시작 스크립트 구성
    - 환경변수 설정 (ADMIN_PASSWORD, PORT)
    - uploads/ 디렉토리 정적 파일 서빙 설정
    - SPA 라우팅을 위한 fallback 설정
    - _Requirements: 전체_

- [x] 8. Final Checkpoint - 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 각 태스크는 특정 요구사항을 참조하여 추적 가능
- Checkpoints에서 점진적 검증 수행
- Property 테스트는 핵심 비즈니스 로직(상태 전환, 투표 집계, 이름 정규화)에 집중
- DX팀 내부 소규모 도구이므로 E2E 테스트, CI/CD 설정은 제외

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "5.2", "6.1"] },
    { "id": 5, "tasks": ["7.1"] }
  ]
}
```
