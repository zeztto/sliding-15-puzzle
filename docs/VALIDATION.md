# 검증 범위

2026-10-28, Node.js 22.23.4와 npm 11.19.0에서 typecheck·warning 없는 ESLint·19개 회귀와 정적 production build를 실행했습니다. `npm ci --ignore-scripts` 후 같은 검사도 통과했으며 npm audit의 취약점은 0개였습니다.

```sh
npm ci --ignore-scripts
npm run check
npm audit --audit-level=low
```

400개 판의 permutation·solvability, 행 경계를 넘지 않는 이동, 불변 배열, undo·새 게임 초기화와 실제 shuffled 판의 독립 IDA* 해를 합법 이동으로 완료하는 경로를 검사합니다. 시간 정지·최고 기록 비교·손상/미지원/unknown field 원문 보존·읽기/쓰기 거부·동시 변경 시 삭제 거부를 확인합니다.

실제 DOM을 mount해 숫자 click·방향키 완료, 연속 방향키와 undo/newgame의 focus 보존, modifier/defaultPrevented 화살표 무시를 검사합니다. persisted pagehide/pageshow와 nonpersisted cleanup은 DOM adapter 회귀입니다. 실제 browser의 뒤로 가기·BFCache·touch·focus·저장 권한과 작은 화면 검증은 별도 QA입니다.

합성 Storage와 완료 해 fixture는 `tests/`에만 두며 build allowlist가 production에 포함하지 않습니다. production seed 선택·강제 완료 query·완료 global을 제공하지 않습니다. 이 로컬 결과는 원격 CI·호스팅 배포 성공과 구분합니다.


## 실제 browser 확인

동일 production 파일에서 pointer·trusted touch·방향키·20회 undo·새 퍼즐과 실제 합법 이동 완료를 확인했습니다. 정상 완료, 도중 손상된 기록, 저장 용량 거부, 시작 시 읽기 거부의 네 경로를 실제 판을 풀어 검사했습니다. 완료 후 시간 정지·기록 재조회, 원문 보존·삭제 취소/확인·다른 key 보존을 확인했습니다.

1440×900·1024×768·768×1024·390×844·360×800에서 가로 overflow와 한국어 분리를 확인했습니다. 보드와 undo/newgame의 연속 keyboard focus, modifier/defaultPrevented 화살표 무시, 같은 origin으로 이동한 뒤 실제 BFCache의 persisted 뒤로 복귀도 통과했습니다. lifecycle·focus 수정에서는 engine·controller와 저장 기능을 바꾸지 않아 앞선 완료·저장 검증을 재사용했습니다.
