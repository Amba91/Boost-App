import { NextResponse } from "next/server"

export async function GET() {
  const script = `
(function () {
  window.BOOST_REVIEWS_LOADED = true

  function getProductHandle() {
    var match = window.location.pathname.match(/\\/products\\/([^/?#]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }

  async function loadReviews() {
    var productHandle = getProductHandle()
    if (!productHandle) return

    try {
      var response = await fetch(
        "https://boost-app-9e6w.vercel.app/api/reviews/list?shop=kiidiiz.com&product_handle=" +
          encodeURIComponent(productHandle)
      )

      var data = await response.json()

      if (!data.success || !data.reviews || !data.reviews.length) {
        console.log("Boost Reviews: aucun avis trouvé", productHandle, data)
        return
      }

      renderReviews(data.reviews)
    } catch (error) {
      console.error("Boost Reviews Error", error)
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  function safeMediaUrl(value) {
    try {
      var url = new URL(String(value || ""), window.location.origin)
      return url.protocol === "https:" || url.protocol === "http:"
        ? escapeHtml(url.href)
        : ""
    } catch (error) {
      return ""
    }
  }

  function renderReviews(reviews) {
    var oldWidget = document.getElementById("boost-reviews-widget")
    if (oldWidget) oldWidget.remove()

    var form =
      document.querySelector('form[action*="/cart/add"]') ||
      document.querySelector(".product-form") ||
      document.querySelector("product-form")

    if (!form || !form.parentNode) {
      console.log("Boost Reviews: formulaire produit introuvable")
      return
    }

    var total = reviews.length
    var average =
      reviews.reduce(function (sum, item) {
        return sum + Number(item.rating || 0)
      }, 0) / total

    var currentIndex = 0

    var container = document.createElement("div")
    container.id = "boost-reviews-widget"

    function reviewHtml(review) {
      var firstName = escapeHtml(review.customer_first_name || "")
      var lastName = escapeHtml(review.customer_last_name || "")
      var content = escapeHtml(review.review || "")
      var rating = Number(review.rating || 5)
      var initials = escapeHtml((review.customer_first_name || "C").charAt(0))
      var imageUrl = safeMediaUrl(review.image_url)
      var videoUrl = safeMediaUrl(review.video_url)
      var mediaHtml = ""

      if (imageUrl) {
        mediaHtml +=
          '<a class="boost-review-media-link" href="' + imageUrl + '" target="_blank" rel="noopener noreferrer">' +
            '<img class="boost-review-media" src="' + imageUrl + '" alt="Photo ajoutée par le client" loading="lazy" />' +
          '</a>'
      }

      if (videoUrl) {
        mediaHtml +=
          '<video class="boost-review-video" src="' + videoUrl + '" controls preload="metadata"></video>'
      }

      return (
        '<div class="boost-single-review">' +
          '<div class="boost-review-avatar">' +
            '<span>' + initials + '</span>' +
          '</div>' +
          '<div class="boost-review-content">' +
            '<div class="boost-review-title">' +
              '<strong>' + firstName + ' ' + lastName + '</strong>' +
              '<span>' + "★".repeat(rating) + '</span>' +
            '</div>' +
            '<p>' + content + '</p>' +
            (mediaHtml ? '<div class="boost-review-medias">' + mediaHtml + '</div>' : '') +
          '</div>' +
        '</div>'
      )
    }

    container.innerHTML =
      '<div class="boost-reviews-box">' +
        '<div class="boost-reviews-summary">' +
          '<span>⭐</span>' +
          '<strong>' + average.toFixed(1) + ' / 5</strong>' +
          '<span>(' + total + ' avis)</span>' +
        '</div>' +
        '<div class="boost-review-slider">' +
          '<button class="boost-review-arrow boost-prev" type="button">‹</button>' +
          '<div class="boost-review-current">' +
            reviewHtml(reviews[currentIndex]) +
          '</div>' +
          '<button class="boost-review-arrow boost-next" type="button">›</button>' +
        '</div>' +
      '</div>'

    var style = document.createElement("style")
    style.innerHTML =
      '#boost-reviews-widget {' +
        'margin: 14px 0 18px;' +
        'font-family: inherit;' +
        'width: 100%;' +
      '}' +
      '.boost-reviews-box {' +
        'background: #f0fffb;' +
        'border-radius: 16px;' +
        'padding: 14px;' +
      '}' +
      '.boost-reviews-summary {' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 7px;' +
        'margin-bottom: 10px;' +
        'color: #111827;' +
        'font-size: 14px;' +
      '}' +
      '.boost-review-slider {' +
        'position: relative;' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 10px;' +
      '}' +
      '.boost-review-current {' +
        'flex: 1;' +
        'min-width: 0;' +
      '}' +
      '.boost-single-review {' +
        'display: flex;' +
        'gap: 12px;' +
        'align-items: flex-start;' +
        'background: #f0fffb;' +
        'border-radius: 14px;' +
      '}' +
      '.boost-review-avatar {' +
        'width: 48px;' +
        'height: 48px;' +
        'border-radius: 999px;' +
        'background: #d1fae5;' +
        'color: #047857;' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'font-weight: 800;' +
        'flex-shrink: 0;' +
        'overflow: hidden;' +
      '}' +
      '.boost-review-avatar img {' +
        'width: 100%;' +
        'height: 100%;' +
        'object-fit: cover;' +
      '}' +
      '.boost-review-content {' +
        'flex: 1;' +
        'min-width: 0;' +
      '}' +
      '.boost-review-title {' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 8px;' +
        'flex-wrap: wrap;' +
        'font-size: 14px;' +
        'color: #111827;' +
      '}' +
      '.boost-review-title span {' +
        'color: #f59e0b;' +
        'font-size: 12px;' +
        'white-space: nowrap;' +
      '}' +
      '.boost-review-content p {' +
        'margin: 5px 0 0;' +
        'color: #374151;' +
        'font-size: 13px;' +
        'line-height: 1.35;' +
        'display: -webkit-box;' +
        '-webkit-line-clamp: 3;' +
        '-webkit-box-orient: vertical;' +
        'overflow: hidden;' +
      '}' +
      '.boost-review-medias {' +
        'display: flex;' +
        'gap: 8px;' +
        'align-items: flex-start;' +
        'flex-wrap: wrap;' +
        'margin-top: 10px;' +
      '}' +
      '.boost-review-media-link {' +
        'display: block;' +
      '}' +
      '.boost-review-media {' +
        'display: block;' +
        'width: 88px;' +
        'height: 88px;' +
        'object-fit: cover;' +
        'border-radius: 10px;' +
      '}' +
      '.boost-review-video {' +
        'display: block;' +
        'width: 156px;' +
        'max-height: 120px;' +
        'border-radius: 10px;' +
        'background: #000;' +
      '}' +
      '.boost-review-arrow {' +
        'width: 28px;' +
        'height: 28px;' +
        'border-radius: 999px;' +
        'border: 1px solid rgba(0,0,0,.16);' +
        'background: #fff;' +
        'cursor: pointer;' +
        'font-size: 22px;' +
        'line-height: 1;' +
        'color: #111827;' +
        'flex-shrink: 0;' +
      '}'

    document.head.appendChild(style)

    var paymentIcons =
      form.parentNode.querySelector(".list-payment") ||
      form.parentNode.querySelector(".payment-icons") ||
      form.parentNode.querySelector('[class*="payment"]')

    if (paymentIcons && paymentIcons.parentNode) {
      paymentIcons.parentNode.insertBefore(container, paymentIcons.nextSibling)
    } else {
      form.parentNode.insertBefore(container, form.nextSibling)
    }

    var current = container.querySelector(".boost-review-current")
    var prev = container.querySelector(".boost-prev")
    var next = container.querySelector(".boost-next")

    function updateReview() {
      current.innerHTML = reviewHtml(reviews[currentIndex])
    }

    if (prev) {
      prev.addEventListener("click", function () {
        currentIndex = currentIndex === 0 ? reviews.length - 1 : currentIndex - 1
        updateReview()
      })
    }

    if (next) {
      next.addEventListener("click", function () {
        currentIndex = currentIndex === reviews.length - 1 ? 0 : currentIndex + 1
        updateReview()
      })
    }
  }

  setTimeout(loadReviews, 800)
})()
`

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  })
}
