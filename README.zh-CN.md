# repo-cover

**让编程智能体为你的仓库设计社交预览图，像杂志刊头一样。
一个自包含的 HTML 文件，没有图像生成模型。**

每次把仓库链接贴到微信、X 或 Slack，都会显示一张预览卡片。现在
那张卡片要么是 GitHub 自动生成的灰色默认图，要么是和所有人雷同的
生成器模板。这个技能让智能体自己设计卡片。真正的排版层级、从语言
颜色取的一个强调色，以及防止模型跑偏的确定性检查。

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md)

![四种风格动画](docs/demo.gif)

![四种风格](docs/hero.png)

![前后对比](docs/compare.png)

## 安装

```sh
# Agent Skills CLI (Claude Code, Codex, Cursor, opencode, ...)
npx skills add sjh9714/repo-cover

# Claude Code 插件市场
/plugin marketplace add sjh9714/repo-cover
/plugin install repo-cover@repo-cover
```

安装后，在你的仓库里说一句：

> 给这个仓库做一张社交预览卡片。

智能体会收集仓库信息，把描述打磨成一行，写出 `<repo>-cover.html`，
跑完检查，导出 1280x640 的 PNG。上传到 **Settings → Social preview**
即可。

## 五种风格

| | |
|---|---|
| **editorial**（默认）。暖纸色，Fraunces 字标，从角落散开的同心圆 | ![editorial](skills/repo-cover/assets/examples/editorial-red-handed.png) |
| **poster**。用语言颜色调出的深色底，仓库首字母裁切水印 | ![poster](skills/repo-cover/assets/examples/poster-openlogi.png) |
| **blueprint**。藏青方格纸，等宽字体，角标，由仓库名推导的图号 | ![blueprint](skills/repo-cover/assets/examples/blueprint-macos-harness.png) |
| **gallery**。美术馆作品标签。纯白，居中，细衬线 | ![gallery](skills/repo-cover/assets/examples/gallery-cumora.png) |
| **terminal**。把仓库变成一个终端会话。窗口装饰、块状光标、EXIT 0 | ![terminal](skills/repo-cover/assets/examples/terminal-freeze.png) |

不会有两张相同的卡片。强调色来自主要语言，同心圆数量和图号来自
仓库名的哈希，poster 的水印就是你仓库自己的字母。

## 强制的规则

不靠模型的自觉，靠写死的数字。

- 所有坐标和尺寸落在 4px 网格上
- 每张卡片一个强调色，自动加深到通过 WCAG 对比度
- 按名称长度分级的标题字号（132px 到 64px，超过 26 字符换两行）
- 描述 110 字符预算（CJK 为 60），最多两行
- 禁止阴影、渐变、毛玻璃、emoji
- 星标数**默认关闭**，因为它很快过时，还让年轻仓库难堪

`scripts/check_card.py` 对以上全部做确定性检查：画布尺寸、自包含、
对比度、CJK 换行，以及在 X 的 506px 卡片宽度下的缩小可读性。

## CJK 是一等公民

![中文示例](skills/repo-cover/assets/examples/editorial-chinese.png)

中文使用 Noto Sans SC 和正确的换行规则，不是豆腐字回退。日文用
Noto Sans JP，韩文用 keep-all。CJK 有独立的字符预算，检查器会把
排版破坏判为失败。详见 `references/cjk.md`。

## 保持新鲜

卡片有意做成静态文件。内置的组合 Action 会在 CI 里重新渲染，
避免带着回退字体出厂。描述经常变的话也可以定时执行。

```yaml
- uses: sjh9714/repo-cover@main
  with:
    card: assets/my-repo-cover.html
    output: cover.png
```

## 什么时候不要用

- 想要图表或架构图，请用图表类技能。
- 想要 logo 或吉祥物，请用图像生成类技能。
- 私有仓库、从来不会被链接，默认卡片就够了。

## 许可

MIT
