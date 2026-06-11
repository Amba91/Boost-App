import type { ScrapedReview } from "./types"

const targetLanguages = {
  fr: "français",
  en: "anglais",
  es: "espagnol",
  de: "allemand",
  it: "italien",
  ar: "arabe",
} as const

export type TargetLanguage = keyof typeof targetLanguages

export function isSupportedTargetLanguage(
  language: unknown
): language is TargetLanguage {
  return (
    typeof language === "string" &&
    Object.prototype.hasOwnProperty.call(targetLanguages, language)
  )
}

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY

  if (!key) {
    throw new Error("OPENAI_API_KEY manquant dans Vercel.")
  }

  return key
}

async function enhanceSingleReview(
  review: ScrapedReview,
  targetLanguage: TargetLanguage
) {
  const apiKey = getOpenAIKey()
  const targetLanguageName = targetLanguages[targetLanguage]

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `Tu es un assistant e-commerce. Traduis les avis clients en ${targetLanguageName} naturel, corrige les fautes et améliore légèrement le style sans inventer de nouveaux détails. Garde un ton authentique, simple et crédible. Ne réponds qu'avec le texte final de l'avis.`,
        },
        {
          role: "user",
          content: review.review,
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Erreur pendant l'amélioration IA de l'avis."
    )
  }

  const enhancedText =
    data?.output_text ||
    data?.output?.[0]?.content?.[0]?.text ||
    review.review

  return {
    ...review,
    review: String(enhancedText).trim(),
  }
}

export async function enhanceReviewsWithOpenAI(
  reviews: ScrapedReview[],
  targetLanguage: TargetLanguage
): Promise<ScrapedReview[]> {
  const enhancedReviews: ScrapedReview[] = []

  for (const review of reviews) {
    try {
      const enhanced = await enhanceSingleReview(review, targetLanguage)
      enhancedReviews.push(enhanced)
    } catch {
      enhancedReviews.push(review)
    }
  }

  return enhancedReviews
}
