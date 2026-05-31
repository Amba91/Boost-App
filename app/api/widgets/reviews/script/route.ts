import { NextResponse } from "next/server"

export async function GET() {
  const script = `
(function () {
  window.BOOST_REVIEWS_LOADED = true

  const shop = window.BOOST_SHOP || window.location.hostname

  function getProductHandle() {
    const match = window.location.pathname.match(/\\/products\\/([^/?#]+)/)
    return match ? match[1] : null
  }

  async function loadReviews(attempt = 0) {
    const productHandle = getProductHandle()
    if (!productHandle) return

    try {
      const response = await fetch(
        "https://boost-app-9e6w.vercel.app/api/reviews/list?shop=" +
          encodeURIComponent(shop) +
          "&product_handle=" +
          encodeURIComponent(productHandle)
      )

      const data = await response.json()

      if (!data.success) return

      if (!data.reviews || data.reviews.length === 0) return

      const rendered = renderReviews(data.reviews)

      if (!rendered && attempt < 10) {
        setTimeout(() => loadReviews(attempt + 1), 700)
      }
    } catch (error) {
      console.error("Boost Reviews Error", error)
    }
  }

  function renderReviews(reviews) {
    const oldWidget = document.getElementById("boost-reviews-widget")
    if (oldWidget) oldWidget.remove()

    const form =
      document.querySelector('form[action*="/cart/add"]') ||
      document.querySelector(".product-form") ||
      document.querySelector("product-form")

    const target =
      form ||
      document.querySelector(".product__info-container") ||
      document.querySelector(".product__info-wrapper") ||
      document.querySelector("main")

    if (!target || !target.parentNode) return false

    const total = reviews.length
    const average =
      reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total

    const firstReview = reviews[0]

    const container = document.createElement("div")
    container.id = "boost-reviews-widget"

    container.innerHTML = \`
      <div class="boost-reviews-mini">
        <button class="boost-reviews-summary" type="button">
          <span>⭐</span>
          <strong>\${average.toFixed(1)} / 5</strong>
          <span>(\${total} avis)</span>
          <span class="boost-chevron">⌄</span>
        </button>

        <div class="boost-reviews-detail">
          <div class="boost-review-name">
            <strong>
              \${firstReview.customer_first_name || ""}
              \${firstReview.customer_last_name || ""}
            </strong>
            <span>\${"★".repeat(Number(firstReview.rating || 5))}</span>
          </div>

          <p>\${firstReview.review || ""}</p>

          <div class="boost-review-badges">
            \${firstReview.verified ? "<small>✓ Vérifié</small>" : ""}
            \${firstReview.verified_parent ? "<small>✓ Parent vérifié</small>" : ""}
            \${firstReview.verified_purchase ? "<small>✓ Achat confirmé</small>" : ""}
          </div>
        </div>
      </div>
    \`

    const style = document.createElement("style")
    style.innerHTML = \`
      #boost-reviews-widget {
        margin: 12px 0 16px;
        font-family: inherit;
        width: 100%;
      }

      .boost-reviews-mini {
        background: #fff;
        border: 1px solid rgba(0,0,0,.10);
        border-radius: 12px;
        overflow: hidden;
      }

      .boost-reviews-summary {
        width: 100%;
        padding: 10px 12px;
        border: 0;
        background: #fff;
        display: flex;
        align-items: center;
        gap: 7px;
        cursor: pointer;
        font: inherit;
        color: #111827;
        text-align: left;
      }

      .boost-chevron {
        margin-left: auto;
        font-size: 18px;
      }

      .boost-reviews-detail {
        display: none;
        padding: 10px 12px;
        border-top: 1px solid rgba(0,0,0,.08);
      }

      .boost-reviews-mini.open .boost-reviews-detail {
        display: block;
      }

      .boost-reviews-mini.open .boost-chevron {
        transform: rotate(180deg);
      }

      .boost-review-name {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 14px;
        color: #111827;
      }

      .boost-review-name span {
        color: #f59e0b;
        white-space: nowrap;
      }

      .boost-reviews-detail p {
        margin: 6px 0 8px;
        font-size: 14px;
        line-height: 1.4;
        color: #374151;
      }

      .boost-review-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .boost-review-badges small {
        background: #ecfdf5;
        color: #047857;
        padding: 3px 7px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
      }
    \`

    document.head.appendChild(style)

    if (form && form.parentNode) {
      form.parentNode.insertBefore(container, form)
    } else {
      target.appendChild(container)
    }

    const box = container.querySelector(".boost-reviews-mini")
    const button = container.querySelector(".boost-reviews-summary")

    button?.addEventListener("click", function () {
      box?.classList.toggle("open")
    })

    return true
  }

  setTimeout(() => loadReviews(), 800)
})()
`

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  })
}