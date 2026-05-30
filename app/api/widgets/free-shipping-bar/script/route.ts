export async function GET() {
  const script = `
(function () {
  const FREE_SHIPPING_GOAL = 50

  function getThemeAnnouncementColor() {
    const elements = Array.from(document.querySelectorAll("div, section, header"))

    const announcement = elements.find((el) =>
      el.innerText &&
      el.innerText.toLowerCase().includes("livraison")
    )

    if (announcement) {
      const bg = window.getComputedStyle(announcement).backgroundColor

      if (
        bg &&
        bg !== "rgba(0, 0, 0, 0)" &&
        bg !== "transparent"
      ) {
        return bg
      }
    }

    return "#66cdbf"
  }

  async function getCart() {
    try {
      const res = await fetch("/cart.js")
      return await res.json()
    } catch {
      return null
    }
  }

  function createBar() {
    let bar = document.getElementById("boost-free-shipping-bar")
    if (bar) return bar

    bar = document.createElement("div")
    bar.id = "boost-free-shipping-bar"

    bar.style.width = "100%"
    bar.style.background = getThemeAnnouncementColor()
    bar.style.color = "#111827"
    bar.style.textAlign = "center"
    bar.style.fontWeight = "800"
    bar.style.fontSize = "14px"
    bar.style.letterSpacing = "0.8px"
    bar.style.padding = "9px 12px"
    bar.style.fontFamily = "Arial, sans-serif"
    bar.style.zIndex = "9999"
    bar.style.boxSizing = "border-box"

    const header =
      document.querySelector("header") ||
      document.querySelector(".shopify-section-header") ||
      document.body.firstElementChild

    if (header && header.parentNode) {
      header.parentNode.insertBefore(bar, header)
    } else {
      document.body.prepend(bar)
    }

    return bar
  }

  async function updateBar() {
    const cart = await getCart()
    if (!cart) return

    const total = cart.total_price / 100
    const remaining = FREE_SHIPPING_GOAL - total

    const bar = createBar()

    if (remaining <= 0) {
      bar.innerHTML = "🎉 LIVRAISON GRATUITE DÉBLOQUÉE !"
      bar.style.background = getThemeAnnouncementColor()
    } else {
      bar.innerHTML =
        "🚚 PLUS QUE " +
        remaining.toFixed(2).replace(".", ",") +
        "€ POUR PROFITER DE LA LIVRAISON GRATUITE"
      bar.style.background = getThemeAnnouncementColor()
    }
  }

  updateBar()
  setInterval(updateBar, 5000)
})()
`

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  })
}