# 首页短片

首页那支 22 秒的短片是程序生成的，不是录屏：画面由 `film.html` 里的 `render(t)` 按时间算出来，逐帧截图再编码成视频；声音（键盘声、嗖声）由 `audio.py` 合成，和画面用同一张时间表，所以每一下都卡在点上。树的布局、技能名字和数字都来自真实数据，内容改了重新生成就会跟着变。

## 重新生成

需要：Node 22.18+、Python 3 和 numpy、ffmpeg，以及 Playwright 的 Chromium。

```bash
npm i --no-save playwright && npx playwright install chromium
pip install numpy
bash tools/film/make.sh
```

大约两三分钟。生成的东西：

- `tools/film/out/film.mp4`：高清原版，1080p、60 帧，单独发出去用（不进 git）
- `site/intro.mp4`、`site/intro-poster.jpg`：首页用的 720p 版本和封面

## 文件

| 文件 | 作用 |
| --- | --- |
| `film.html` | 整支片子：`render(t)` 画第 t 秒，`CUES` 是音效时间表。直接用浏览器打开 `film.html?play` 能循环预览（要先跑一次 `data.ts`，并用任意静态服务器打开这个目录） |
| `data.ts` | 从真实数据导出片子要用的布局、图标、前置关系，写到 `out/data.json` |
| `render.mjs` | 逐帧渲染，送进 ffmpeg，写出无声视频和音效时间表 |
| `audio.py` | 按时间表合成声音 |
| `make.sh` | 把上面串起来 |

改片子：时间点都在 `film.html` 开头的“时间表”里，改完再跑一遍 `make.sh`。只用黑白灰（见 [docs/ART.md](../../docs/ART.md)）。
