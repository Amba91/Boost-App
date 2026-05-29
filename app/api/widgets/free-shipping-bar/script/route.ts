export async function GET() {
  const script = `
(function () {

  const FREE_SHIPPING_GOAL = 50

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

    bar.style.position = "fixed"
    bar.style.top = "0"
    bar.style.left = "0"
    bar.style.right = "0"
    bar.style.zIndex = "999998"
    bar.style.background = "#7c3aed"
    bar.style.color = "white"
    bar.style.padding = "10px"
    bar.style.textAlign = "center"
    bar.style.fontWeight = "bold"
    bar.style.fontSize = "14px"
    bar.style.fontFamily = "Arial"

    document.body.appendChild(bar)

    return bar
  }

  async function updateBar() {

    const cart = await getCart()

    if (!cart) return

    const total = cart.total_price / 100

    const remaining = FREE_SHIPPING_GOAL - total

    const bar = createBar()

    if (remaining <= 0) {

      bar.innerHTML =
        "🎉 Félicitations ! Livraison gratuite débloquée"

      bar.style.background = "#16a34a"

    } else {

      bar.innerHTML =
        "🚚 Plus que " +
        remaining.toFixed(2) +
        "€ pour profiter de la livraison gratuite"

      bar.style.background = "#7c3aed"
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
    },
  })
}