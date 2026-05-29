(function () {
  const shop = window.BOOST_SHOP || "hy4nf1-dt.myshopify.com"

  async function loadBoostWidgets() {
    try {
      const response = await fetch(
        "https://boost-app-9e6w.vercel.app/api/runtime/widgets?shop=" + shop
      )

      const data = await response.json()

      if (!data.success) return

      if (data.widgets["sales-popups"]) {
        const script = document.createElement("script")
        script.src =
          "https://boost-app-9e6w.vercel.app/api/widgets/sales-popups/script?v=5"
        script.defer = true
        document.body.appendChild(script)
      }

      if (data.widgets["sticky-cart"]) {
        const script = document.createElement("script")
        script.src =
          "https://boost-app-9e6w.vercel.app/api/widgets/sticky-cart/script?v=4"
        script.defer = true
        document.body.appendChild(script)
      }

      if (data.widgets["recently-viewed"]) {
        const script = document.createElement("script")
        script.src =
          "https://boost-app-9e6w.vercel.app/api/widgets/recently-viewed/script?v=3"
        script.defer = true
        document.body.appendChild(script)
      }

      if (data.widgets["free-shipping-bar"]) {
        const script = document.createElement("script")
        script.src =
          "https://boost-app-9e6w.vercel.app/api/widgets/free-shipping-bar/script?v=3"
        script.defer = true
        document.body.appendChild(script)
      }
    } catch (error) {
      console.error("Boost runtime error:", error)
    }
  }

  loadBoostWidgets()
})()