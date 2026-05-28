(function () {
  const shop = "hy4nf1-dt.myshopify.com"

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
          "https://boost-app-9e6w.vercel.app/api/widgets/sales-popups/script"
        script.defer = true
        document.body.appendChild(script)
      }
    } catch (error) {
      console.error("Boost runtime error:", error)
    }
  }

  loadBoostWidgets()
})()