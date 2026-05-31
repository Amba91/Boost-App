import { NextResponse } from "next/server"

export async function GET() {
  const script = `
(function () {
  if (window.BOOST_REVIEWS_LOADED) return
  window.BOOST_REVIEWS_LOADED = true

  const shop = window.BOOST_SHOP || window.location.hostname

  function getProductHandle() {
    const match = window.location.pathname.match(/\\/products\\/([^/?#]+)/)
    return match ? match[1] : null
  }

  async function loadReviews() {
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
      if (!data.success || !data.reviews?.length) return

      renderReviews(data.reviews)
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

    if (!target || !target.parentNode) return

    const total = reviews.length
    const average =
      reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total

    const firstReview = reviews[0]

    const container = document.createElement("div")
    container.id = "boost-reviews-widget"

    container.innerHTML = \`
      <div class="boost-reviews-compact">
        <button class="boost-reviews-summary" type="button">
          <span class="boost-star">⭐</span>
          <strong>\${average.toFixed(1)} / 5</strong>
          <span>(\${total} avis)</span>
          <span class="boost-chevron">⌄</span>
        </button>

        <div class="boost-reviews-details">
          <div class="boost-review-top">
            <strong>
              \${firstReview.customer_first_name || ""}
              \${firstReview.customer_last_name || ""}
            </strong>

            <span class="boost-review-stars">
              \${"★".repeat(Number(firstReview.rating || 5))}
            </span>
          </div>

          <p>\${firstReview.review || ""}</p>

          <div class="boost-review-badges">
            \${firstReview.verified ? "<span>✓ Vérifié</span>" : ""}
            \${firstReview.verified_parent ? "<span>✓ Parent vérifié</span>" : ""}
            \${firstReview.verified_purchase ? "<span>✓ Achat confirmé</span>" : ""}
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

      .boost-reviews-compact {
        border: 1px solid rgba(15, 23, 42, 0.10);
        border-radius: 12px;
        background: #fff;
        overflow: hidden;
      }

      .boost-reviews-summary {
        width: 100%;
        border: none;
        background: #fff;
        padding: 11px 13px;
        display: flex;
        align-items: center;
        gap: 7px;
        cursor: pointer;
        color: #111827;
        font: inherit;
        font-size: 15px;
        text-align: left;
      }

      .boost-star {
        font-size: 17px;
      }

      .boost-chevron {
        margin-left: auto;
        font-size: 18px;
        opacity: .7;
      }

      .boost-reviews-details {
        display: none;
        border-top: 1px solid rgba(15, 23, 42, 0.08);
        padding: 12px 13px;
      }

      .boost-reviews-compact.boost-open .boost-reviews-details {
        display: block;
      }

      .boost-reviews-compact.boost-open .boost-chevron {
        transform: rotate(180deg);
      }

      .boost-review-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: #111827;
        font-size: 14px;
      }

      .boost-review-stars {
        color: #f59e0b;
        white-space: nowrap;
      }

      .boost-reviews-details p {
        margin: 7px 0 10px;
        color: #374151;
        line-height: 1.45;
        font-size: 14px;
      }

      .boost-review-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .boost-review-badges span {
        background: #ecfdf5;
        color: #047857;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 999px;
      }
    \`

    document.head.appendChild(style)

    if (form && form.parentNode) {
      form.parentNode.insertBefore(container, form)
    } else {
      target.appendChild(container)
    }

    const box = container.querySelector(".boost-reviews-compact")
    const button = container.querySelector(".boost-reviews-summary")

    button?.addEventListener("click", function () {
      box?.classList.toggle("boost-open")
    })
  }

  loadReviews()
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