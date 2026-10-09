// 工具层的图标，来自 Simple Icons（单色 SVG）。图标库里没有的，自己画或显示缩写。
import {
  siAmd, siApachekafka, siApachespark, siC, siCplusplus, siDjango, siDocker, siFastapi, siFlutter,
  siGnubash, siGo, siGodotengine, siHuggingface, siJavascript, siKotlin, siKubernetes, siLangchain, siLlvm,
  siNginx, siNodedotjs, siNumpy, siNvidia, siPandas, siPostgresql, siPrometheus, siPython, siPytorch,
  siQt, siReact, siRedis, siRos, siRust, siSolidity, siSpring, siSwift, siTerraform, siTypescript, siVuedotjs,
  siWireshark,
  type SimpleIcon,
} from 'simple-icons'

export const ICONS: Record<string, SimpleIcon> = {
  c: siC,
  cpp: siCplusplus,
  rust: siRust,
  go: siGo,
  kotlin: siKotlin,
  swift: siSwift,
  python: siPython,
  javascript: siJavascript,
  typescript: siTypescript,
  shell: siGnubash,
  solidity: siSolidity,
  react: siReact,
  vue: siVuedotjs,
  spring: siSpring,
  django: siDjango,
  fastapi: siFastapi,
  flutter: siFlutter,
  qt: siQt,
  godot: siGodotengine,
  numpy: siNumpy,
  pandas: siPandas,
  pytorch: siPytorch,
  transformers: siHuggingface,
  langchain: siLangchain,
  spark: siApachespark,
  nodejs: siNodedotjs,
  docker: siDocker,
  k8s: siKubernetes,
  nginx: siNginx,
  postgres: siPostgresql,
  redis: siRedis,
  kafka: siApachekafka,
  prometheus: siPrometheus,
  terraform: siTerraform,
  cuda: siNvidia,
  llvm: siLlvm,
  vivado: siAmd,
  ros: siRos,
  wireshark: siWireshark,
}

/**
 * Simple Icons 里已下架、需要自己画的图标（线条风格，24×24）。
 * Java 的咖啡杯取自 Lucide 的 coffee 图标（ISC 许可）。
 */
export const STROKE_ICONS: Record<string, string[]> = {
  java: ['M10 2v2', 'M14 2v2', 'M6 2v2', 'M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1'],
}

/** 没有图标时显示的缩写 */
export const MONOGRAMS: Record<string, string> = {
  csharp: 'C#',
  sql: 'SQL',
  asm: 'ASM',
  verilog: 'V',
  ghidra: 'G',
}
