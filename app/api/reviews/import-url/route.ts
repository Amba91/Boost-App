import { NextResponse } from "next/server"

function detectPlatform(url: string) {
  const value = url.toLowerCase()

  if (value.includes("amazon.")) return "amazon"
  if (value.includes("aliexpress.")) return "aliexpress"
  if (value.includes("loox.")) return "loox"
  if (value.includes("judge.me")) return "judge_me"
  if (value.includes("ryviu.")) return "ryviu"

  return "unknown"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const productHandle = String(body.product_handle || "").trim()
    const url = String(body.url || "").trim()

    if (!productHandle) {
      return NextResponse.json(
        {
          success: false,
          error: "Produit cible obligatoire",
        },
        { status: 400 }
      )
    }

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: "Lien obligatoire",
        },
        { status: 400 }
      )
    }

    const platform = detectPlatform(url)

    return NextResponse.json({
      success: true,
      platform,
      product_handle: productHandle,
      url,
      imported: 0,
      message:
        platform === "unknown"
          ? "Lien détecté, mais la plateforme n’est pas encore reconnue automatiquement."
          : `Lien ${platform} détecté. Prochaine étape : connecter un extracteur d’avis.`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}