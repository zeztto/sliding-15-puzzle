# 유지관리

- 숫자 퍼즐 engine과 합법적인 실제 이동·완료 경로를 유지합니다.
- production에 SDK mock·가짜 잔액·강제 완료 global/query를 추가하지 않습니다.
- 손상 기록·접근 거부는 원문을 보존하고 삭제는 명시 확인과 raw 일치를 요구합니다.
- keyboard focus·modifier 입력·page lifecycle 회귀를 유지합니다.
- fixture와 adapter는 tests에만 두고 build allowlist로 제외합니다.
- `npm ci --ignore-scripts`, `npm run check`, `npm audit --audit-level=low`를 실행하고 README·CHANGELOG를 갱신합니다.
