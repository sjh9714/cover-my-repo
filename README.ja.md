# repo-cover

**リポジトリのソーシャルプレビューを、雑誌の表紙のように。コーディング
エージェントが自己完結の HTML 1 ファイルとして書き上げます。**

X や Slack、Discord にリポジトリのリンクを貼るたびにカードが表示され
ます。今のそのカードは、GitHub の自動生成か、誰のものとも見分けの
つかないジェネレーターのテンプレートのはずです。このスキルはエージェ
ント自身にカードを設計させます。本物のタイポグラフィ階層、言語カラー
から取ったアクセント 1 色、そしてモデルの暴走を止める決定的チェック。

[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh-CN.md)

![ムードのデモ](docs/demo.gif)

![ムードグリッド](docs/hero.png)

![Before and after](docs/compare.png)

## インストール

```sh
# Agent Skills CLI (Claude Code, Codex, Cursor, opencode, ...)
npx skills add sjh9714/repo-cover

# Claude Code プラグインマーケットプレイス
/plugin marketplace add sjh9714/repo-cover
/plugin install repo-cover@repo-cover
```

インストール後、リポジトリで一言。

> このリポジトリのソーシャルプレビューカードを作って。

エージェントがリポジトリ情報を集め、説明文を 1 行に磨き、
`<repo>-cover.html` を書き、チェックを通し、1280x640 の PNG を書き出し
ます。**Settings → Social preview** にアップロードすれば完了です。

## 5 つのムード

| | |
|---|---|
| **editorial** (デフォルト)。温かい紙色、Fraunces のワードマーク、角から広がる同心円 | ![editorial](skills/repo-cover/assets/examples/editorial-red-handed.png) |
| **poster**。言語カラーから混ぜたディープカラーの面、リポジトリの頭文字をクロップした透かし | ![poster](skills/repo-cover/assets/examples/poster-openlogi.png) |
| **blueprint**。ネイビーの方眼、等幅書体、コーナーティック、リポジトリ名から導いた図面番号 | ![blueprint](skills/repo-cover/assets/examples/blueprint-macos-harness.png) |
| **gallery**。美術館の作品ラベル。純白、中央揃え、細身のセリフ | ![gallery](skills/repo-cover/assets/examples/gallery-cumora.png) |
| **terminal**。リポジトリをターミナルセッションに。ウィンドウクローム、ブロックカーソル、EXIT 0 | ![terminal](skills/repo-cover/assets/examples/terminal-freeze.png) |

同じカードは二枚と生まれません。アクセントは主要言語から、同心円と
図面番号はリポジトリ名のハッシュから、poster の透かしはあなたの
リポジトリ自身の文字から来ます。

## 強制されるルール

モデルの裁量ではなく、数字で縛ってあります。

- すべての座標とサイズは 4px グリッド
- カード 1 枚にアクセント 1 色、WCAG コントラストを満たすまで自動で暗く
- 名前の長さによるタイトルサイズ段階 (132px から 64px、26 字超は 2 行)
- 説明文は 110 字予算 (CJK は 60 字)、最大 2 行
- 影、グラデーション、グラスモーフィズム、絵文字は禁止
- スター数は**デフォルトで非表示**。すぐ古びる上に、若いリポジトリに酷なので

`scripts/check_card.py` がすべてを決定的に検査します。キャンバス寸法、
自己完結性、コントラスト、CJK の改行、X の 506px 幅への縮小可読性まで。

## CJK は一級市民です

![Korean example](skills/repo-cover/assets/examples/editorial-korean.png)

日本語は Noto Sans JP と正しい禁則処理で組まれます。豆腐フォールバック
ではありません。韓国語は keep-all、中国語は Noto Sans SC。CJK には
専用の文字数予算があり、チェッカーが改行の破綻を検出します。
`references/cjk.md` を参照してください。

## 鮮度を保つ

カードは意図的に静的ファイルです。同梱のコンポジット Action が CI で
再レンダリングし、フォールバックフォントのまま出荷される事故を防ぎ
ます。説明文がよく変わるならスケジュール実行もできます。

```yaml
- uses: sjh9714/repo-cover@main
  with:
    card: assets/my-repo-cover.html
    output: cover.png
```

## 使わない方がよいとき

- 図やチャートが欲しいなら、ダイアグラム系スキルをどうぞ。
- ロゴやマスコットが欲しいなら、画像生成系スキルをどうぞ。
- 非公開リポジトリでリンクされる予定がないなら、デフォルトのカードで
  十分です。

## ライセンス

MIT
