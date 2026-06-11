(function () {
  const shop = window.BOOST_SHOP || "hy4nf1-dt.myshopify.com"

  window.BOOST_POPUP_ACTIVE = false

  window.BOOST_CAN_SHOW_POPUP = function () {
    return window.BOOST_POPUP_ACTIVE !== true
  }

  window.BOOST_OPEN_POPUP = function () {
    window.BOOST_POPUP_ACTIVE = true
  }

  window.BOOST_CLOSE_POPUP = function () {
    window.BOOST_POPUP_ACTIVE = false
  }

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
          "https://boost-app-9e6w.vercel.app/api/widgets/sales-popups/script?v=6"
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
          "https://boost-app-9e6w.vercel.app/api/widgets/recently-viewed/script?v=4"
        script.defer = true
        document.body.appendChild(script)
      }

      if (data.widgets["free-shipping-bar"]) {
        const script = document.createElement("script")
        script.src =
          "https://boost-app-9e6w.vercel.app/api/widgets/free-shipping-bar/script?v=5"
        script.defer = true
        document.body.appendChild(script)
      }

      if (data.widgets["upsell"]) {
        const script = document.createElement("script")
        script.src =
          "https://boost-app-9e6w.vercel.app/api/widgets/upsell/script?v=6"
        script.defer = true
        document.body.appendChild(script)
      }

      if (data.widgets["reviews"]) {
        const script = document.createElement("script")
        script.src =
          "https://boost-app-9e6w.vercel.app/api/widgets/reviews/script?v=12"
        script.defer = true
        document.body.appendChild(script)
      }
    } catch (error) {
      console.error("Boost runtime error:", error)
    }
  }

  loadBoostWidgets()
})()
