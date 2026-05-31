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

  function findProductPaymentIcons(form) {
    const productArea =
      form.closest(".product__info-container") ||
      form.closest(".product__info-wrapper") ||
      form.closest("[class*='product']") ||
      form.parentElement

    if (!productArea) return null

    const selectors = [
      ".payment-icons",
      ".list-payment",
      "[class*='payment-icons']",
      "[class*='list-payment']",
      "[class*='shopify-payment']",
      "[class*='payment-method']",
      "[class*='methods-of-payment']"
    ]

    for (const selector of selectors) {
      const items = productArea.querySelectorAll(selector)

      for (const item of items) {
        if (item.closest("footer")) continue
        return item
      }
    }

    let current = form

    for (let i = 0; i < 8; i++) {
      if (!current) break

      const next = current.nextElementSibling

      if (next) {
        const text = next.innerText || ""
        const html = next.innerHTML || ""

        if (
          html.includes("visa") ||
          html.includes("paypal") ||
          html.includes("apple") ||
          html.includes("payment") ||
          text.includes("Visa") ||
          text.includes("PayPal")
        ) {
          return next
        }
      }

      current = current.parentElement
    }

    return null
  }

  function renderReviews(reviews) {
    const oldWidget = document.getElementById("boost-reviews-widget")
    if (oldWidget) oldWidget.remove()

    const form =
      document.querySelector('form[action*="/cart/add"]') ||
      document.querySelector(".product-form") ||
      document.querySelector("product-form")

    if (!form || !form.parentNode) return

    const paymentIcons = findProductPaymentIcons(form)

    const total = reviews.length
    const average =
      reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total

    const previewReviews = reviews.slice(0, 4)

    const container = document.createElement("div")
    container.id = "boost-reviews-widget"

    container.innerHTML = \`
      <div class="boost-reviews-box">
        <button class="boost-reviews-summary" type="button">
          <span>⭐</span>
          <strong>\${average.toFixed(1)} / 5</strong>
          <span>(\${total} avis)</span>
          <span class="boost-chevron">⌄</span>
        </button>

        <div class="boost-reviews-carousel">
          <button class="boost-review-arrow boost-prev" type="button">‹</button>

          <div class="boost-review-track">
            \${previewReviews.map((review) => \`
              <div class="boost-review-card">
                <div class="boost-review-head">
                  <div class="boost-review-avatar">
                    \${(review.customer_first_name || "C").charAt(0)}
                  </div>

                  <div>
                    <strong>
                      \${review.customer_first_name || ""}
                      \${review.customer_last_name || ""}
                    </strong>
                    <div class="boost-review-stars">
                      \${"★".repeat(Number(review.rating || 5))}
                    </div>
                  </div>
                </div>

                <p>\${review.review || ""}</p>

                \${review.image_url ? \`<img src="\${review.image_url}" class="boost-review-image" />\` : ""}
              </div>
            \`).join("")}
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
        background: #fff;
        border: 1px solid rgba(0,0,0,.10);
        border-radius: 14px;
        overflow: hidden;
      }

      .boost-reviews-summary {
        width: 100%;
        padding: 10px 13px;
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
        opacity: .7;
      }

      .boost-reviews-carousel {
        display: none;
        position: relative;
        border-top: 1px solid rgba(0,0,0,.08);
        padding: 12px 34px;
      }

      .boost-reviews-box.open .boost-reviews-carousel {
        display: block;
      }

      .boost-review-track {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
      }

      .boost-review-track::-webkit-scrollbar {
        display: none;
      }

      .boost-review-card {
        min-width: 180px;
        max-width: 200px;
        border: 1px solid rgba(0,0,0,.08);
        border-radius: 12px;
        padding: 10px;
        scroll-snap-align: start;
        background: #fff;
      }

      .boost-review-head {
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 13px;
        color: #111827;
      }

      .boost-review-avatar {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        background: #ecfdf5;
        color: #047857;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        flex-shrink: 0;
      }

      .boost-review-stars {
        color: #f59e0b;
        font-size: 12px;
        margin-top: 2px;
      }

      .boost-review-card p {
        margin: 8px 0 0;
        font-size: 12px;
        line-height: 1.35;
        color: #374151;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .boost-review-image {
        margin-top: 8px;
        width: 100%;
        height: 65px;
        object-fit: cover;
        border-radius: 9px;
      }

      .boost-review-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 1px solid rgba(0,0,0,.12);
        background: #fff;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        color: #111827;
      }

      .boost-prev {
        left: 6px;
      }

      .boost-next {
        right: 6px;
      }
    \`

    document.head.appendChild(style)

    if (paymentIcons && paymentIcons.parentNode) {
      paymentIcons.parentNode.insertBefore(container, paymentIcons.nextSibling)
    } else {
      form.parentNode.insertBefore(container, form.nextSibling)
    }

    const box = container.querySelector(".boost-reviews-box")
    const summary = container.querySelector(".boost-reviews-summary")
    const track = container.querySelector(".boost-review-track")
    const prev = container.querySelector(".boost-prev")
    const next = container.querySelector(".boost-next")

    summary?.addEventListener("click", function () {
      box?.classList.toggle("open")
    })

    prev?.addEventListener("click", function () {
      track?.scrollBy({ left: -210, behavior: "smooth" })
    })

    next?.addEventListener("click", function () {
      track?.scrollBy({ left: 210, behavior: "smooth" })
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