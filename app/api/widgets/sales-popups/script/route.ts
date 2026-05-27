import { NextResponse } from "next/server"

export async function GET() {
  const script = `
    (() => {
      const messages = [
        "🔥 Sarah vient d’acheter un produit",
        "🛍️ Ahmed a commandé sur Kiidiiz",
        "✨ Nouvelle commande depuis Lyon",
        "🚀 Produit populaire acheté",
        "🎉 Commande confirmée sur Kiidiiz"
      ]

      let index = 0

      function createPopup() {
        const old = document.getElementById("boost-sales-popup")
        if (old) old.remove()

        const popup = document.createElement("div")
        popup.id = "boost-sales-popup"

        popup.innerHTML = messages[index]

        popup.style.position = "fixed"
        popup.style.bottom = "20px"
        popup.style.left = "20px"
        popup.style.background = "#111827"
        popup.style.color = "white"
        popup.style.padding = "14px 18px"
        popup.style.borderRadius = "12px"
        popup.style.zIndex = "999999"
        popup.style.boxShadow = "0 8px 25px rgba(0,0,0,0.35)"
        popup.style.fontFamily = "Arial"
        popup.style.fontSize = "14px"
        popup.style.transition = "all .3s ease"

        document.body.appendChild(popup)

        setTimeout(() => {
          popup.remove()
        }, 4000)

        index++
        if (index >= messages.length) index = 0
      }

      createPopup()

      setInterval(() => {
        createPopup()
      }, 7000)
    })();
  `

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
    },
  })
}