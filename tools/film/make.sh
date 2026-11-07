#!/usr/bin/env bash
# 一条命令重新生成首页短片：数据 → 逐帧渲染 → 合成音效 → 合成视频 → 首页版和封面放进 site/
# 用法（在仓库根目录）：bash tools/film/make.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=tools/film/out

npm run data
node tools/film/data.ts
node tools/film/render.mjs
python3 tools/film/audio.py $OUT/cues.json $OUT/sound.wav

# 高清原版：1080p、60 帧
ffmpeg -y -loglevel error -i $OUT/silent.mp4 -i $OUT/sound.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $OUT/film.mp4
# 首页版：720p、30 帧，体积小；封面取片尾的标题画面
ffmpeg -y -loglevel error -i $OUT/film.mp4 -vf "scale=1280:720:flags=lanczos,fps=30" -c:v libx264 -preset veryslow -crf 25 -pix_fmt yuv420p -tune animation -c:a aac -b:a 128k -movflags +faststart site/intro.mp4
ffmpeg -y -loglevel error -ss 21.7 -i $OUT/film.mp4 -frames:v 1 -vf scale=1280:720:flags=lanczos -q:v 3 site/intro-poster.jpg

echo "高清版：$OUT/film.mp4；首页版和封面已更新到 site/"
