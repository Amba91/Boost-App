export async function GET() {
  const script = `
(function () {
  window.BOOST_UPSELL_LOADED = true

  let productsCache = []

  async function getProducts() {
    try {
      const res = await fetch("/products.json?limit=20")
      const data = await res.json()
      productsCache = data.products || []
      return productsCache
    } catch {
      productsCache = []
      return []
    }
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)]
  }

  function createPopup(product) {
    const old = document.getElementById("boost-upsell-popup")
    if (old) old.remove()

    const image = product.images?.[0]?.src || ""
    const variantId = product.variants?.[0]?.id

    if (!variantId) return

    const popup = document.createElement("div")
    popup.id = "boost-upsell-popup"

    popup.innerHTML = \`
      <div class="boost-upsell-header">
        🔥 Complétez votre achat
        <button id="boost-upsell-close">×</button>
      </div>

      <div class="boost-upsell-body">
        \${image ? \`<img src="\${image}" class="boost-upsell-img" />\` : ""}

        <div class="boost-upsell-info">
          <div class="boost-upsell-title">\${product.title}</div>
          <button id="boost-upsell-add">Ajouter à ma commande</button>
        </div>
      </div>
    \`

    const style = document.createElement("style")
    style.innerHTML = \`
      #boost-upsell-popup {
        position: fixed;
        right: 18px;
        bottom: 18px;
        width: 340px;
        max-width: calc(100% - 36px);
        background: #111827;
        color: white;
        border-radius: 18px;
        z-index: 999999;
        box-shadow: 0 14px 40px rgba(0,0,0,.35);
        overflow: hidden;
        font-family: Arial, sans-serif;
        animation: boostUpsellIn .35s ease;
      }

      .boost-upsell-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 13px 14px;
        font-weight: 800;
        border-bottom: 1px solid rgba(255,255,255,.12);
      }

      #boost-upsell-close {
        background: transparent;
        color: white;
        border: none;
        font-size: 22px;
        cursor: pointer;
      }

      .boost-upsell-body {
        display: flex;
        gap: 12px;
        padding: 14px;
        align-items: center;
      }

      .boost-upsell-img {
        width: 72px;
        height: 72px;
        object-fit: cover;
        border-radius: 12px;
        flex-shrink: 0;
      }

      .boost-upsell-title {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.35;
        margin-bottom: 10px;
      }

      #boost-upsell-add {
        background: #22c55e;
        color: white;
        border: none;
        border-radius: 10px;
        padding: 10px 12px;
        cursor: pointer;
        font-weight: 800;
        font-size: 13px;
      }

      @keyframes boostUpsellIn {
        from { transform: translateY(25px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    \`

    document.head.appendChild(style)
    document.body.appendChild(popup)

    document.getElementById("boost-upsell-close")?.addEventListener("click", () => {
      popup.remove()
    })

    document.getElementById("boost-upsell-add")?.addEventListener("click", async () => {
      try {
        await fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: variantId,
            quantity: 1,
          }),
        })

        popup.innerHTML =
          '<div style="padding:18px;font-weight:800;">✅ Produit ajouté au panier</div>'

        setTimeout(() => {
          popup.remove()
        }, 2000)
      } catch (error) {
        console.error("Boost upsell add error:", error)
      }
    })

    setTimeout(() => {
      popup.remove()
    }, 12000)
  }

  async function showUpsell() {
    const products = productsCache.length ? productsCache : await getProducts()

    if (products.length < 2) return

    const currentHandle = window.location.pathname.split("/products/")[1]?.split("?")[0]
    const filtered = products.filter((product) => product.handle !== currentHandle)

    const product = randomItem(filtered.length ? filtered : products)

    setTimeout(() => {
      createPopup(product)
    }, 1200)
  }

  document.addEventListener("click", function (event) {
    const target = event.target

    const button = target.closest(
      'form[action*="/cart/add"] button, button[name="add"], .product-form__submit, .sticky-atc-button'
    )

    if (!button) return

    showUpsell()
  })

  getProducts()
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