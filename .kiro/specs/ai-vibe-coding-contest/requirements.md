# Requirements Document

## Introduction

DX팀 내 AI 바이브 코딩 콘테스트를 위한 웹 시스템이다. Kiro를 활용한 바이브 코딩으로 자유주제 결과물을 제출하고, 아카이빙 페이지에서 모아보며, 3개 카테고리별 투표를 통해 우승자를 선정하는 시스템을 구현한다.

## Glossary

- **Contest_System**: AI 바이브 코딩 콘테스트 전체를 관리하는 웹 애플리케이션
- **Archiving_Page**: 제출된 결과물(HTML 파일 또는 GitHub 링크)을 모아서 보여주는 페이지
- **Voting_System**: 3개 카테고리별 투표를 수행하고 집계하는 시스템
- **Submission**: 참가자가 제출하는 결과물로, HTML 파일 또는 GitHub 링크와 제작 배경 설명을 포함
- **Admin**: 제출물을 등록하고 관리하는 관리자
- **Voter**: 투표에 참여하는 DX팀 구성원
- **Category**: 투표 카테고리로 "아이디어 미쵸따", "기획 장인", "자꾸 손이가" 3가지가 존재
- **Participant**: 콘테스트에 결과물을 제출하는 DX팀 구성원

## Requirements

### Requirement 1: 제출물 등록 관리

**User Story:** 관리자로서, 콘테스트 제출물을 등록하고 관리하고 싶다. 그래야 모든 출품작이 적절히 아카이빙되고 표시될 수 있다.

#### Acceptance Criteria

1. WHEN Admin이 새 제출물을 등록하면, THE Contest_System SHALL 참가자 이름(최대 50자), 제출 유형(HTML 파일 또는 GitHub 링크), 제출 URL 또는 파일, 제작 배경 설명(최소 10자, 최대 200자)을 저장한다.
2. WHEN Admin이 HTML 파일로 제출물을 등록하면, THE Contest_System SHALL 파일을 업로드(최대 10MB, .html 확장자만 허용)하고 시스템이 생성한 고유 URL을 통해 접근 가능하도록 한다.
3. WHEN Admin이 GitHub 링크로 제출물을 등록하면, THE Contest_System SHALL 링크를 저장하고 URL이 "https://github.com/"으로 시작하는지 검증한다.
4. WHEN Admin이 기존 제출물을 수정하면, THE Contest_System SHALL 참가자 이름, 제출 유형, 제출 URL 또는 파일, 제작 배경 설명의 수정을 허용한다.
5. WHEN Admin이 제출물 삭제를 요청하면, THE Contest_System SHALL 영구 삭제 전에 확인 프롬프트를 표시한다.
6. IF 제작 배경 설명 없이 또는 10자 미만의 설명으로 제출물이 등록되면, THEN THE Contest_System SHALL 등록을 거부하고 유효한 제작 배경 설명을 요청하는 오류 메시지를 표시한다.
7. IF 참가자 이름이 비어있는 상태로 제출물이 등록되면, THEN THE Contest_System SHALL 등록을 거부하고 참가자 이름을 요청하는 오류 메시지를 표시한다.
8. THE Contest_System SHALL Admin에게 등록된 제출물의 총 개수를 표시한다.

### Requirement 2: 아카이빙 페이지

**User Story:** DX팀 구성원으로서, 모든 콘테스트 제출물을 한 페이지에서 둘러보고 싶다. 그래야 투표 전에 각 출품작을 검토할 수 있다.

#### Acceptance Criteria

1. THE Archiving_Page SHALL 모든 등록된 제출물을 그리드 또는 리스트 레이아웃의 카드 형태로 표시하며, 등록일 기준 최신순으로 정렬한다.
2. THE Archiving_Page SHALL 각 카드에 참가자 이름, 제작 배경 설명(최대 2줄), 제출 유형(HTML 파일 또는 GitHub 링크), 제출물 보기 링크를 표시한다.
3. WHEN 사용자가 제출물 링크를 클릭하면, THE Archiving_Page SHALL HTML 파일 또는 GitHub 링크를 새 브라우저 탭에서 연다.
4. IF 제출물 링크를 사용할 수 없거나 로드에 실패하면, THEN THE Archiving_Page SHALL 참가자 이름과 제작 배경 설명이 포함된 카드를 계속 표시하고, 제출물 링크를 현재 사용할 수 없음을 안내한다.
5. WHILE 등록된 제출물이 없는 동안, THE Archiving_Page SHALL 아직 등록된 제출물이 없음을 안내하는 메시지를 표시한다.

### Requirement 3: 투표 시스템

**User Story:** 투표자로서, 3개 카테고리에서 최고의 출품작에 투표하고 싶다. 그래야 콘테스트 우승자가 공정하게 결정될 수 있다.

#### Acceptance Criteria

1. THE Voting_System SHALL 3개 투표 카테고리를 제공한다: "아이디어 미쵸따"(가장 창의적인), "기획 장인"(가장 잘 기획된 서비스), "자꾸 손이가"(가장 사용하고 싶은 서비스).
2. WHEN Voter가 투표를 제출하면, THE Voting_System SHALL 카테고리당 정확히 1개의 선택을 요구한다(투표자당 총 3표).
3. THE Voting_System SHALL 동일한 참가자를 2개 이상의 카테고리에서 중복 선택하는 것을 허용한다(카테고리별로 정확히 1명씩 선택하되, 같은 참가자가 여러 카테고리에서 선택될 수 있다).
4. WHEN Voter가 투표를 제출하면, THE Voting_System SHALL Voter에게 본인의 이름을 입력하도록 요구한다.
5. IF Voter가 카테고리별로 정확히 1명의 참가자를 선택하지 않고 투표를 제출하려 하면, THEN THE Voting_System SHALL 제출을 거부하고 어떤 카테고리에서 선택이 누락되었는지 안내하는 오류 메시지를 표시한다.
6. IF Voter가 2회 이상 투표를 시도하면, THEN THE Voting_System SHALL 중복 투표를 거부하고 이미 투표가 완료되었음을 안내하는 메시지를 표시한다.
7. WHEN Voter가 성공적으로 투표를 제출하면, THE Voting_System SHALL 투표가 접수되었음을 확인하는 메시지를 표시한다.
8. THE Voting_System SHALL 각 카테고리 내에서 선택을 위해 모든 제출물 목록(참가자 이름과 제작 배경 설명)을 표시한다.

### Requirement 4: 투표 상태 관리

**User Story:** 관리자로서, 투표의 시작과 종료 시점을 제어하고 싶다. 그래야 모든 제출물이 수집된 후에만 투표가 시작될 수 있다.

#### Acceptance Criteria

1. WHILE Admin이 투표 기간을 활성화하지 않은 동안, THE Voting_System SHALL 투표가 아직 시작되지 않았음을 안내하는 메시지를 표시하고 모든 투표 제출 시도를 거부한다.
2. WHEN Admin이 투표 기간을 활성화하면, THE Voting_System SHALL 투표 상태를 "미시작"에서 "진행중"으로 변경하고 모든 Voter가 투표를 제출할 수 있도록 허용한다.
3. WHEN Admin이 투표 기간을 종료하면, THE Voting_System SHALL 투표 상태를 "진행중"에서 "종료"로 변경하고, 새로운 투표 제출 접수를 중단하며, 투표가 종료되었음을 안내하는 메시지를 표시한다.
4. THE Contest_System SHALL 현재 투표 상태(미시작, 진행중, 종료)를 Archiving_Page에 표시한다.
5. IF Admin이 투표 기간을 종료한 후에 Voter가 투표를 제출하려 하면, THEN THE Voting_System SHALL 제출을 거부하고 투표 기간이 종료되었음을 안내하는 메시지를 표시한다.
6. THE Voting_System SHALL 투표 상태 전환을 단방향으로만 허용한다: "미시작" → "진행중" → "종료", 이전 상태로 되돌리는 것은 허용하지 않는다.
7. IF Admin이 아닌 사용자가 투표 상태를 변경하려 하면, THEN THE Contest_System SHALL 해당 작업을 거부하고 권한 부족을 안내하는 오류 메시지를 표시한다.

### Requirement 5: 투표 결과 확인

**User Story:** DX팀 구성원으로서, 투표 결과를 확인하고 싶다. 그래야 누가 콘테스트에서 우승했는지 알 수 있다.

#### Acceptance Criteria

1. WHEN Admin이 투표 기간을 종료하면, THE Voting_System SHALL 카테고리별 참가자 총 투표 수와 전체 카테고리를 합산한 참가자별 총 투표 수를 계산한다.
2. WHEN 투표 기간이 종료되면, THE Voting_System SHALL 각 카테고리별 최다 득표 참가자와 전체 3개 카테고리 합산 최다 득표 참가자를 종합 우승자로 표시하는 결과 페이지를 제공한다.
3. IF 특정 카테고리 또는 종합에서 2명 이상의 참가자가 동일한 최다 득표수를 기록하면, THEN THE Voting_System SHALL 해당 카테고리 또는 종합에서 동점자 전원을 공동 우승자로 표시한다.
4. WHEN 투표 기간이 종료되면, THE Voting_System SHALL 각 카테고리에서 참가자별 투표 수를 내림차순으로 정렬하여 표시한다.
5. WHILE 투표 기간이 종료되지 않은 동안, THE Voting_System SHALL Admin을 포함한 모든 사용자에게 결과 페이지를 숨긴다.
6. WHEN 투표 기간이 종료되면, THE Voting_System SHALL 모든 DX팀 구성원이 결과 페이지에 접근할 수 있도록 한다.

### Requirement 6: 참가자 식별 및 중복 방지

**User Story:** 관리자로서, 투표의 무결성을 보장하고 싶다. 그래야 결과가 공정하고 각 사람이 한 번만 투표할 수 있다.

#### Acceptance Criteria

1. WHEN Voter가 투표를 제출하면, THE Voting_System SHALL Voter 이름(앞뒤 공백 제거)과 투표 제출 시간을 저장한다.
2. WHEN Voter가 투표를 제출하면, THE Voting_System SHALL 공백 제거 및 대소문자 구분 없는 비교를 통해 Voter 이름을 매칭하여 중복 투표를 식별한다.
3. IF Voter가 이름 필드가 비어있거나 공백만 포함된 상태로 투표를 제출하면, THEN THE Voting_System SHALL 투표를 거부하고 유효한 Voter 이름을 요청하는 오류 메시지를 표시한다.
4. IF Voter가 50자를 초과하는 이름으로 투표를 제출하면, THEN THE Voting_System SHALL 투표를 거부하고 이름 길이 제한을 안내하는 오류 메시지를 표시한다.
5. THE Voting_System SHALL Admin이 투표를 완료한 Voter 목록을 확인할 수 있도록 하며, 각 Voter의 이름과 투표 제출 시간을 표시한다.
