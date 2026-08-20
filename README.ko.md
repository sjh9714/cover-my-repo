# Cover My Repo

**클릭하고 싶은 GitHub 소셜 프리뷰를 만드세요.**

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

![Cover My Repo CLI 데모](docs/cli-demo.gif)

## 바로 실행하기

```sh
npx cover-my-repo
```

Git 레포 안에서 실행합니다. 로그인된 Codex, Claude, Cursor CLI를 찾아
디자인 세 가지를 만들고, 로컬 Chrome으로 렌더링한 뒤 비교 화면을 엽니다.

이미지 모델을 쓰지 않으며 레포 인증 정보를 전달하지 않습니다.

Node.js 20과 Chrome이 필요합니다. GitHub의
**Settings → Social preview** 업로드는 직접 해야 하므로 사용자 확인 없이
레포 설정이 바뀌지 않습니다.

![다섯 가지 무드](docs/hero.png)

![GitHub 기본 이미지와 Cover My Repo 비교](docs/compare.png)

## 만들어지는 파일

- 자기완결 HTML 디자인 세 가지
- 로컬 Chrome으로 렌더링한 1280x640 PNG 세 장
- 원본 크기와 피드 크기를 함께 보는 비교 페이지
- 대비, 넘침, CJK 줄바꿈, 캔버스 크기를 확인하는 결정적 검사

최종 GitHub 업로드는 CLI가 대신하지 않습니다.

## 다섯 가지 무드

모든 예제는 [갤러리](https://sjh9714.github.io/cover-my-repo/)에서
라이브 페이지로 볼 수 있습니다.

| | |
|---|---|
| **editorial**. 따뜻한 종이색, Fraunces 워드마크, 절제된 모서리 동심원 | ![editorial](skills/repo-cover/assets/examples/editorial-red-handed.png) |
| **poster**. 언어 색을 섞은 짙은 배경과 크게 자른 첫 글자 | ![poster](skills/repo-cover/assets/examples/poster-openlogi.png) |
| **blueprint**. 네이비 그리드, 모노 타입, 코너 틱, 도면 번호 | ![blueprint](skills/repo-cover/assets/examples/blueprint-macos-harness.png) |
| **gallery**. 중앙 정렬한 가는 세리프의 미술관 벽 라벨 | ![gallery](skills/repo-cover/assets/examples/gallery-cumora.png) |
| **terminal**. 창 크롬과 EXIT 0을 담은 터미널 세션 | ![terminal](skills/repo-cover/assets/examples/terminal-freeze.png) |

악센트는 주 언어에서 가져옵니다. 세부 배치는 레포 이름에서 정해지므로
같은 디자인 체계를 유지하면서도 복제본처럼 보이지 않습니다.

## 에이전트 스킬로 설치하기

기존 `repo-cover` 스킬도 계속 쓸 수 있습니다. 호환성을 위해 내부 이름은
바꾸지 않습니다.

```sh
# Agent Skills CLI
npx skills add sjh9714/cover-my-repo

# Claude Code 플러그인 마켓플레이스
/plugin marketplace add sjh9714/cover-my-repo
/plugin install repo-cover@repo-cover

# Codex
codex plugin marketplace add sjh9714/cover-my-repo
codex plugin add repo-cover@repo-cover

# Pi
pi install https://github.com/sjh9714/cover-my-repo
```

설치한 뒤 에이전트에게 이 레포의 소셜 프리뷰 카드를 만들어 달라고
요청하면 됩니다.

## 검사 규칙

- 모든 좌표와 크기는 4px 그리드
- 카드당 악센트 하나와 WCAG 대비
- 132px부터 64px까지 이름 길이별 제목 크기
- 설명 110자 예산과 CJK 60자 예산
- 그림자, 그라데이션, 글래스 효과, 이모지 금지
- 금방 낡는 스타 수는 기본으로 숨김

`skills/repo-cover/scripts/check_card.py`가 캔버스 크기, 자기완결성,
대비, CJK 줄바꿈, 축소 가독성을 검사합니다.

## CJK 지원

![한국어 예제](skills/repo-cover/assets/examples/editorial-korean.png)

한국어는 `word-break:keep-all`과 Noto Sans KR을 사용합니다. 일본어와
중국어는 각 줄바꿈 규칙에 맞춰 Noto Sans JP와 Noto Sans SC를 사용합니다.

## 카드 다시 렌더링하기

동봉된 Action으로 기존 HTML 카드를 CI에서 다시 렌더링할 수 있습니다.

```yaml
- uses: sjh9714/cover-my-repo@main
  with:
    card: assets/my-repo-cover.html
    output: cover.png
```

## 이럴 때는 쓰지 마세요

- 차트나 아키텍처 그림은 다이어그램 도구가 더 맞습니다.
- 로고나 마스코트는 이미지 생성 도구가 더 맞습니다.
- 외부에 공유하지 않는 비공개 레포라면 GitHub 기본 카드로 충분합니다.

## 라이선스

MIT
