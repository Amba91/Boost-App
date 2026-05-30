export async function GET() {
  const script = `
(function () {
  const FREE_SHIPPING_GOAL = 50

  function findExistingShippingBar() {
    const elements = Array.from(document.querySelectorAll("div, section, announcement-bar"))

    return elements.find((el) => {
      const text = el.innerText || ""
      return (
        text.toLowerCase().includes("livraison offerte") ||
        text.toLowerCase().includes("livraison gratuite")
      )
    })
  }

  function getThemeAnnouncementColor(existingBar) {
    if (existingBar) {
      const bg = window.getComputedStyle(existingBar).backgroundColor

      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
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

    const existingBar = findExistingShippingBar()
    const color = getThemeAnnouncementColor(existingBar)

    bar = document.createElement("div")
    bar.id = "boost-free-shipping-bar"

    bar.style.width = "100%"
    bar.style.background = color
    bar.style.color = "#111827"
    bar.style.textAlign = "center"
    bar.style.fontWeight = "800"
    bar.style.fontSize = "14px"
    bar.style.letterSpacing = "0.8px"
    bar.style.padding = "9px 12px"
    bar.style.fontFamily = "Arial, sans-serif"
    bar.style.zIndex = "9999"
    bar.style.boxSizing = "border-box"

    if (existingBar && existingBar.parentNode) {
      existingBar.parentNode.insertBefore(bar, existingBar)
      existingBar.style.display = "none"
    } else {
      const header =
        document.querySelector("header") ||
        document.querySelector(".shopify-section-header") ||
        document.body.firstElementChild

      if (header && header.parentNode) {
        header.parentNode.insertBefore(bar, header)
      } else {
        document.body.prepend(bar)
      }
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
    } else {
      bar.innerHTML =
        "🚚 PLUS QUE " +
        remaining.toFixed(2).replace(".", ",") +
        "€ POUR PROFITER DE LA LIVRAISON GRATUITE"
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