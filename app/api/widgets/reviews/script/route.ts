import { NextResponse } from "next/server"

export async function GET() {
  const script = `
(function () {
  window.BOOST_REVIEWS_LOADED = true

  const shop = window.location.hostname

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

    if (!form || !form.parentNode) return

    const total = reviews.length
    const average =
      reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total

    let currentIndex = 0

    const container = document.createElement("div")
    container.id = "boost-reviews-widget"

    function reviewHtml(review) {
      const initials = (review.customer_first_name || "C").charAt(0)

      return \`
        <div class="boost-single-review">
          <div class="boost-review-avatar">
            \${review.image_url ? \`<img src="\${review.image_url}" />\` : \`<span>\${initials}</span>\`}
          </div>

          <div class="boost-review-content">
            <div class="boost-review-title">
              <strong>\${review.customer_first_name || ""} \${review.customer_last_name || ""}</strong>
              <span>\${"★".repeat(Number(review.rating || 5))}</span>
            </div>

            <p>\${review.review || ""}</p>
          </div>
        </div>
      \`
    }

    container.innerHTML = \`
      <div class="boost-reviews-box">
        <div class="boost-reviews-summary">
          <span>⭐</span>
          <strong>\${average.toFixed(1)} / 5</strong>
          <span>(\${total} avis)</span>
        </div>

        <div class="boost-review-slider">
          <button class="boost-review-arrow boost-prev" type="button">‹</button>

          <div class="boost-review-current">
            \${reviewHtml(reviews[currentIndex])}
          </div>

          <button class="boost-review-arrow boost-next" type="button">›</button>
        </div>
      </div>
    \`

    const style = document.createElement("style")
    style.innerHTML = \`
      #boost-reviews-widget {
        margin: 14px 0 18px;
        font-family: inherit;
        width: 100%;
      }

      .boost-reviews-box {
        background: #f0fffb;
        border-radius: 16px;
        padding: 14px;
      }

      .boost-reviews-summary {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 10px;
        color: #111827;
        font-size: 14px;
      }

      .boost-review-slider {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .boost-review-current {
        flex: 1;
        min-width: 0;
      }

      .boost-single-review {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        background: #f0fffb;
        border-radius: 14px;
      }

      .boost-review-avatar {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        background: #d1fae5;
        color: #047857;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        flex-shrink: 0;
        overflow: hidden;
      }

      .boost-review-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .boost-review-content {
        flex: 1;
        min-width: 0;
      }

      .boost-review-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 14px;
        color: #111827;
      }

      .boost-review-title span {
        color: #f59e0b;
        font-size: 12px;
        white-space: nowrap;
      }

      .boost-review-content p {
        margin: 5px 0 0;
        color: #374151;
        font-size: 13px;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .boost-review-arrow {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid rgba(0,0,0,.16);
        background: #fff;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
        color: #111827;
        flex-shrink: 0;
      }
    \`

    document.head.appendChild(style)

    const paymentIcons =
      form.parentNode.querySelector(".list-payment") ||
      form.parentNode.querySelector(".payment-icons") ||
      form.parentNode.querySelector('[class*="payment"]')

    if (paymentIcons && paymentIcons.parentNode) {
      paymentIcons.parentNode.insertBefore(container, paymentIcons.nextSibling)
    } else {
      form.parentNode.insertBefore(container, form.nextSibling)
    }

    const current = container.querySelector(".boost-review-current")
    const prev = container.querySelector(".boost-prev")
    const next = container.querySelector(".boost-next")

    function updateReview() {
      current.innerHTML = reviewHtml(reviews[currentIndex])
    }

    prev?.addEventListener("click", function () {
      currentIndex = currentIndex === 0 ? reviews.length - 1 : currentIndex - 1
      updateReview()
    })

    next?.addEventListener("click", function () {
      currentIndex = currentIndex === reviews.length - 1 ? 0 : currentIndex + 1
      updateReview()
    })
  }

  setTimeout(loadReviews, 800)
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