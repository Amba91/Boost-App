export async function GET() {
  const script = `
(() => {
  const STORAGE_KEY = "boost_recently_viewed_products"

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

  function renderRecentlyViewed() {
    let products = []

    try {
      products = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    } catch {
      products = []
    }

    if (products.length < 2) return

    const currentHandle = getProductHandle()
    const items = products.filter((p) => p.handle !== currentHandle).slice(0, 4)

    if (!items.length) return

    const old = document.getElementById("boost-recently-viewed")
    if (old) old.remove()

    const section = document.createElement("section")
    section.id = "boost-recently-viewed"

    section.innerHTML = \`
      <div class="boost-rv-container">
        <h2 class="boost-rv-title">Produits récemment consultés</h2>

        <div class="boost-rv-grid">
          \${items
            .map(
              (product) => \`
                <a href="\${product.url}" class="boost-rv-card">
                  <div class="boost-rv-image-wrap">
                    \${product.image ? \`<img src="\${product.image}" class="boost-rv-image" />\` : ""}
                  </div>

                  <div class="boost-rv-product-title">
                    \${product.title}
                  </div>

                  <div class="boost-rv-price">
                    \${formatPrice(product.price)}
                  </div>
                </a>
              \`
            )
            .join("")}
        </div>
      </div>
    \`

    const style = document.createElement("style")
    style.innerHTML = \`
      #boost-recently-viewed {
        margin: 48px auto 24px;
        padding: 0 16px;
        max-width: 1200px;
        font-family: Arial, sans-serif;
      }

      .boost-rv-title {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 18px;
        color: #111827;
      }

      .boost-rv-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 18px;
      }

      .boost-rv-card {
        text-decoration: none;
        color: inherit;
        background: white;
        border: 1px solid rgba(15,23,42,0.08);
        border-radius: 18px;
        padding: 12px;
        box-shadow: 0 8px 24px rgba(15,23,42,0.08);
        transition: transform .2s ease, box-shadow .2s ease;
      }

      .boost-rv-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 30px rgba(15,23,42,0.14);
      }

      .boost-rv-image-wrap {
        width: 100%;
        aspect-ratio: 1 / 1;
        background: #f8fafc;
        border-radius: 14px;
        overflow: hidden;
        margin-bottom: 10px;
      }

      .boost-rv-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .boost-rv-product-title {
        font-size: 14px;
        font-weight: 700;
        color: #111827;
        line-height: 1.35;
        min-height: 38px;
      }

      .boost-rv-price {
        margin-top: 6px;
        font-size: 14px;
        font-weight: 800;
        color: #7c3aed;
      }

      @media (max-width: 800px) {
        .boost-rv-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 480px) {
        #boost-recently-viewed {
          margin-top: 32px;
        }

        .boost-rv-title {
          font-size: 20px;
        }
      }
    \`

    document.head.appendChild(style)

    const productForm =
      document.querySelector('form[action*="/cart/add"]') ||
      document.querySelector("main") ||
      document.body

    productForm.parentNode.insertBefore(section, productForm.nextSibling)
  }

  async function start() {
    const handle = getProductHandle()

    if (handle) {
      const product = await fetchProduct(handle)
      saveProduct(product)
    }

    renderRecentlyViewed()
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