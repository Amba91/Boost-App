export async function GET() {
  const script = `
(() => {
  const STORAGE_KEY = "boost_recently_viewed_products"
  const DISPLAY_DURATION = 7000
  const POPUP_INTERVAL = 120000

  function getProductHandle() {
    const match = window.location.pathname.match(/\\/products\\/([^/?#]+)/)
    return match ? match[1] : null
  }

  async function fetchProduct(handle) {
    try {
      const res = await fetch("/products/" + handle + ".js")
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  function saveProduct(product) {
    if (!product || !product.handle) return

    let products = []

    try {
      products = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    } catch {
      products = []
    }

    products = products.filter((p) => p.handle !== product.handle)

    products.unshift({
      handle: product.handle,
      title: product.title,
      url: product.url || "/products/" + product.handle,
      image: product.featured_image || "",
      price: product.price || 0,
    })

    products = products.slice(0, 6)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  }

  function formatPrice(price) {
    if (!price) return ""

    return (price / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    })
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)]
  }

  function showPopup() {
    let products = []

    try {
      products = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    } catch {
      products = []
    }

    const currentHandle = getProductHandle()
    const items = products.filter((p) => p.handle !== currentHandle)

    if (!items.length) return

    const product = randomItem(items)

    const old = document.getElementById("boost-recently-popup")
    if (old) old.remove()

    const popup = document.createElement("div")
    popup.id = "boost-recently-popup"

    popup.innerHTML = \`
      <a href="\${product.url}" class="boost-rv-popup-link">
        \${product.image ? \`<img src="\${product.image}" class="boost-rv-popup-img" />\` : ""}
        <div>
          <div class="boost-rv-popup-label">Vu récemment</div>
          <div class="boost-rv-popup-title">\${product.title}</div>
          <div class="boost-rv-popup-price">\${formatPrice(product.price)}</div>
        </div>
      </a>
    \`

    const style = document.createElement("style")
    style.innerHTML = \`
      #boost-recently-popup {
        position: fixed;
        right: 18px;
        bottom: 90px;
        width: 330px;
        max-width: calc(100% - 36px);
        background: #111827;
        color: white;
        border-radius: 18px;
        z-index: 999999;
        box-shadow: 0 14px 38px rgba(0,0,0,.35);
        overflow: hidden;
        animation: boostRvIn .35s ease;
        font-family: Arial, sans-serif;
      }

      .boost-rv-popup-link {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px;
        color: white;
        text-decoration: none;
      }

      .boost-rv-popup-img {
        width: 62px;
        height: 62px;
        object-fit: cover;
        border-radius: 12px;
        flex-shrink: 0;
      }

      .boost-rv-popup-label {
        font-size: 12px;
        opacity: .75;
        margin-bottom: 3px;
      }

      .boost-rv-popup-title {
        font-size: 14px;
        font-weight: 800;
        line-height: 1.3;
      }

      .boost-rv-popup-price {
        margin-top: 4px;
        font-size: 13px;
        font-weight: 800;
        color: #a78bfa;
      }

      @keyframes boostRvIn {
        from {
          transform: translateX(30px);
          opacity: 0;
        }

        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @media (max-width: 600px) {
        #boost-recently-popup {
          right: 12px;
          left: 12px;
          bottom: 88px;
          width: auto;
        }
      }
    \`

    document.head.appendChild(style)
    document.body.appendChild(popup)

    setTimeout(() => {
      popup.remove()
    }, DISPLAY_DURATION)
  }

  async function start() {
    const handle = getProductHandle()

    if (handle) {
      const product = await fetchProduct(handle)
      saveProduct(product)
    }

    setTimeout(showPopup, 5000)

    setInterval(showPopup, POPUP_INTERVAL)
  }

  start()
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