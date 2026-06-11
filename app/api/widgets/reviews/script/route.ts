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

      var preparedReviews = await prepareReviewPhotos(data.reviews)
      renderReviews(preparedReviews)
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

  function imageProxyUrl(value) {
    var url = safeMediaUrl(value)
    if (!url) return ""

    return (
      "https://boost-app-9e6w.vercel.app/api/reviews/media?url=" +
      encodeURIComponent(url)
    )
  }

  function preloadPhoto(review) {
    return new Promise(function (resolve) {
      var originalUrl = safeMediaUrl(review.image_url)
      var proxyUrl = imageProxyUrl(review.image_url)

      if (!originalUrl || !proxyUrl) {
        resolve(Object.assign({}, review, { boost_photo: null }))
        return
      }

      var image = new Image()
      var finished = false
      var timeout = setTimeout(function () {
        finish(null)
      }, 5000)

      function finish(photo) {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        image.onload = null
        image.onerror = null
        resolve(Object.assign({}, review, { boost_photo: photo }))
      }

      image.onload = function () {
        if (image.naturalWidth > 1 && image.naturalHeight > 1) {
          finish({ originalUrl: originalUrl, proxyUrl: proxyUrl })
        } else {
          finish(null)
        }
      }
      image.onerror = function () {
        finish(null)
      }
      image.referrerPolicy = "no-referrer"
      image.src = proxyUrl
    })
  }

  async function prepareReviewPhotos(reviews) {
    return Promise.all(reviews.map(preloadPhoto))
  }

  function renderReviews(reviews) {
    var oldWidget = document.getElementById("boost-reviews-widget")
    var oldSummary = document.getElementById("boost-reviews-rating")
    var oldStyle = document.getElementById("boost-reviews-style")
    if (oldWidget) oldWidget.remove()
    if (oldSummary) oldSummary.remove()
    if (oldStyle) oldStyle.remove()

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
    var summary = document.createElement("div")
    container.id = "boost-reviews-widget"
    summary.id = "boost-reviews-rating"

    function reviewHtml(review) {
      var firstName = escapeHtml(review.customer_first_name || "")
      var lastName = escapeHtml(review.customer_last_name || "")
      var content = escapeHtml(review.review || "")
      var rating = Number(review.rating || 5)
      var initials = escapeHtml((review.customer_first_name || "C").charAt(0))
      var photo = review.boost_photo
      var mediaHtml = ""

      if (photo) {
        mediaHtml +=
          '<a class="boost-review-media-link" href="' + photo.originalUrl + '" target="_blank" rel="noopener noreferrer">' +
            '<img class="boost-review-media" src="' + photo.proxyUrl + '" alt="Photo ajoutée par le client" loading="lazy" referrerpolicy="no-referrer" />' +
          '</a>'
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

    summary.innerHTML =
      '<span class="boost-rating-stars">★★★★★</span>' +
      '<strong>' + average.toFixed(1).replace(".", ",") + ' / 5</strong>' +
      '<span>(' + total + ' avis)</span>'

    container.innerHTML =
      '<div class="boost-reviews-box">' +
        '<div class="boost-reviews-heading">Avis de nos clients</div>' +
        '<div class="boost-review-slider">' +
          '<button class="boost-review-arrow boost-prev" type="button">‹</button>' +
          '<div class="boost-review-current">' +
            reviewHtml(reviews[currentIndex]) +
          '</div>' +
          '<button class="boost-review-arrow boost-next" type="button">›</button>' +
        '</div>' +
      '</div>'

    var style = document.createElement("style")
    style.id = "boost-reviews-style"
    style.innerHTML =
      '#boost-reviews-rating {' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 7px;' +
        'margin: 10px 0 8px;' +
        'color: #111827;' +
        'font-size: 14px;' +
        'line-height: 1.2;' +
      '}' +
      '.boost-rating-stars {' +
        'color: #f59e0b;' +
        'font-size: 17px;' +
        'letter-spacing: 1px;' +
      '}' +
      '#boost-reviews-widget {' +
        'margin: 18px 0 22px;' +
        'font-family: inherit;' +
        'width: 100%;' +
      '}' +
      '.boost-reviews-box {' +
        'background: #f0fffb;' +
        'border-radius: 16px;' +
        'padding: 14px;' +
      '}' +
      '.boost-reviews-heading {' +
        'margin-bottom: 12px;' +
        'color: #111827;' +
        'font-size: 17px;' +
        'font-weight: 800;' +
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
        'width: 104px;' +
        'height: 104px;' +
        'overflow: hidden;' +
        'border-radius: 10px;' +
        'background: #e5e7eb;' +
      '}' +
      '.boost-review-media {' +
        'display: block;' +
        'width: 100%;' +
        'height: 100%;' +
        'object-fit: cover;' +
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

    var productInfo =
      form.closest(".product__info-container") ||
      form.parentNode
    var priceBlock =
      productInfo.querySelector('.no-js-hidden[id^="price-"]') ||
      productInfo.querySelector(".price")
    var productPaymentList = productInfo.querySelector(".list-payment-lm")
    var productPaymentBlock = productPaymentList
      ? productPaymentList.closest(".footer__payment")
      : null
    var description = productInfo.querySelector(".product__description")

    if (priceBlock && priceBlock.parentNode) {
      priceBlock.parentNode.insertBefore(summary, priceBlock)
    } else {
      productInfo.insertBefore(summary, productInfo.firstChild)
    }

    if (productPaymentBlock && productPaymentBlock.parentNode) {
      productPaymentBlock.parentNode.insertBefore(
        container,
        productPaymentBlock.nextSibling
      )
    } else if (description && description.parentNode) {
      description.parentNode.insertBefore(container, description)
    } else {
      productInfo.appendChild(container)
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
