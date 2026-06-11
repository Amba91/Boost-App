import type { ScraperPlatform } from "./types"

export function detectPlatform(url: string): ScraperPlatform {
  const value = url.toLowerCase()

  if (value.includes("aliexpress.")) return "aliexpress"
  if (value.includes("amazon.")) return "amazon"
  if (value.includes("loox.")) return "loox"
  if (value.includes("judge.me") || value.includes("judgeme")) return "judge_me"
  if (value.includes("ryviu.")) return "ryviu"

  return "unknown"
}
