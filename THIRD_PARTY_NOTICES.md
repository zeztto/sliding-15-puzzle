# 외부 코드와 자산 고지

production `dist/`에는 자체 JavaScript·CSS·HTML만 복사합니다. 기존 15 퍼즐 engine을 유지하며 vendor SDK나 그 source를 포함하지 않습니다. 제외한 SDK의 권리를 자체 MIT로 추정하거나 재허가하지 않습니다.

숫자 보드와 favicon 없는 entry는 코드로 구성하며 외부 사진·음원·raster·font를 배포하지 않습니다. 시스템 글꼴을 사용합니다.

TypeScript·ESLint·jsdom과 그 의존성은 개발·자동 검사에만 사용합니다. version·integrity는 `package-lock.json`에 고정하며 각 npm 배포물의 원래 license와 고지를 따릅니다. 이 도구들의 code나 test adapter를 production에 복사하지 않습니다.
