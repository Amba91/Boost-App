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
      var responses = await Promise.all([
        fetch(
          "https://boost-app-9e6w.vercel.app/api/reviews/list?shop=kiidiiz.com&product_handle=" +
            encodeURIComponent(productHandle)
        ),
        fetch(
          "https://boost-app-9e6w.vercel.app/api/reviews/widget-settings"
        ),
      ])
      var data = await responses[0].json()
      var settingsData = await responses[1].json()

      if (!data.success) {
        console.log("Boost Reviews: impossible de charger les avis", productHandle, data)
        return
      }

      var settings = normalizeSettings(settingsData.settings)
      var preparedReviews = await prepareReviewPhotos(
        (data.reviews || []).slice(0, settings.max_reviews)
      )
      renderReviews(preparedReviews, settings, productHandle)
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

  function safeColor(value, fallback) {
    var color = String(value || "").trim()
    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback
  }

  function normalizeSettings(value) {
    var settings = value || {}
    var maxReviews = Number(settings.max_reviews || 50)
    var photoSize = Number(settings.photo_size || 104)

    return {
      title: String(settings.title || "Avis de nos clients").slice(0, 80),
      background_color: safeColor(settings.background_color, "#f0fffb"),
      star_color: safeColor(settings.star_color, "#f59e0b"),
      text_color: safeColor(settings.text_color, "#111827"),
      photo_size: Math.min(Math.max(photoSize, 60), 220),
      max_reviews: Math.min(Math.max(maxReviews, 1), 100),
      show_arrows: settings.show_arrows !== false,
    }
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

  function renderReviews(reviews, settings, productHandle) {
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
    var average = total
      ? reviews.reduce(function (sum, item) {
          return sum + Number(item.rating || 0)
        }, 0) / total
      : 0

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
      var verifiedHtml = review.verified_purchase
        ? '<span class="boost-review-verified">✓ Achat vérifié</span>'
        : ''

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
              verifiedHtml +
            '</div>' +
            '<p>' + content + '</p>' +
            (mediaHtml ? '<div class="boost-review-medias">' + mediaHtml + '</div>' : '') +
          '</div>' +
        '</div>'
      )
    }

    if (total) {
      summary.innerHTML =
        '<span class="boost-rating-stars">★★★★★</span>' +
        '<strong>' + average.toFixed(1).replace(".", ",") + ' / 5</strong>' +
        '<span>(' + total + ' avis)</span>'
    } else {
      summary.style.display = "none"
    }

    container.innerHTML =
      '<div class="boost-reviews-box">' +
        '<div class="boost-reviews-heading">' + escapeHtml(settings.title) + '</div>' +
        (total ? '<div class="boost-review-slider">' +
          (settings.show_arrows
            ? '<button class="boost-review-arrow boost-prev" type="button">‹</button>'
            : '') +
          '<div class="boost-review-current">' +
            reviews.map(function (review, index) {
              return (
                '<div class="boost-review-panel' +
                (index === 0 ? ' is-active' : '') +
                '" data-review-index="' + index + '">' +
                  reviewHtml(review) +
                '</div>'
              )
            }).join("") +
          '</div>' +
          (settings.show_arrows
            ? '<button class="boost-review-arrow boost-next" type="button">›</button>'
            : '') +
        '</div>' : '<p class="boost-review-empty">Sois le premier à donner ton avis.</p>') +
        '<button class="boost-review-open-form" type="button">Écrire un avis</button>' +
        '<form class="boost-review-form" hidden>' +
          '<div class="boost-review-form-grid">' +
            '<label>Prénom *<input name="first_name" maxlength="60" required /></label>' +
            '<label>Nom<input name="last_name" maxlength="60" /></label>' +
          '</div>' +
          '<label>Note *<select name="rating">' +
            '<option value="5">5 étoiles</option>' +
            '<option value="4">4 étoiles</option>' +
            '<option value="3">3 étoiles</option>' +
            '<option value="2">2 étoiles</option>' +
            '<option value="1">1 étoile</option>' +
          '</select></label>' +
          '<label>Ton avis *<textarea name="review" minlength="10" maxlength="2000" required placeholder="Partage ton expérience avec ce produit..."></textarea></label>' +
          '<label>Ajouter une photo (facultatif)<input name="photo" type="file" accept="image/*" /></label>' +
          '<input class="boost-review-honeypot" name="website" tabindex="-1" autocomplete="off" />' +
          '<button class="boost-review-submit" type="submit">Envoyer mon avis</button>' +
          '<p class="boost-review-form-message" aria-live="polite"></p>' +
        '</form>' +
      '</div>'

    var style = document.createElement("style")
    style.id = "boost-reviews-style"
    style.innerHTML =
      '#boost-reviews-rating {' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 7px;' +
        'margin: 10px 0 8px;' +
        'color: ' + settings.text_color + ';' +
        'font-size: 14px;' +
        'line-height: 1.2;' +
      '}' +
      '.boost-rating-stars {' +
        'color: ' + settings.star_color + ';' +
        'font-size: 17px;' +
        'letter-spacing: 1px;' +
      '}' +
      '#boost-reviews-widget {' +
        'margin: 18px 0 22px;' +
        'font-family: inherit;' +
        'width: 100%;' +
      '}' +
      '.boost-reviews-box {' +
        'background: ' + settings.background_color + ';' +
        'border-radius: 16px;' +
        'padding: 14px;' +
      '}' +
      '.boost-reviews-heading {' +
        'margin-bottom: 12px;' +
        'color: ' + settings.text_color + ';' +
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
      '.boost-review-panel {' +
        'display: none;' +
      '}' +
      '.boost-review-panel.is-active {' +
        'display: block;' +
      '}' +
      '.boost-single-review {' +
        'display: flex;' +
        'gap: 12px;' +
        'align-items: flex-start;' +
        'background: ' + settings.background_color + ';' +
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
        'color: ' + settings.text_color + ';' +
      '}' +
      '.boost-review-title span {' +
        'color: ' + settings.star_color + ';' +
        'font-size: 12px;' +
        'white-space: nowrap;' +
      '}' +
      '.boost-review-title .boost-review-verified {' +
        'color: #047857;' +
        'font-size: 11px;' +
        'font-weight: 700;' +
      '}' +
      '.boost-review-content p {' +
        'margin: 5px 0 0;' +
        'color: ' + settings.text_color + ';' +
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
        'width: ' + settings.photo_size + 'px;' +
        'height: ' + settings.photo_size + 'px;' +
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
      '}' +
      '.boost-review-empty {' +
        'margin: 0 0 12px;' +
        'color: ' + settings.text_color + ';' +
        'font-size: 14px;' +
      '}' +
      '.boost-review-open-form, .boost-review-submit {' +
        'border: 0;' +
        'border-radius: 10px;' +
        'background: #111827;' +
        'color: #fff;' +
        'font: inherit;' +
        'font-weight: 700;' +
        'padding: 10px 16px;' +
        'cursor: pointer;' +
      '}' +
      '.boost-review-open-form {' +
        'margin-top: 14px;' +
      '}' +
      '.boost-review-form {' +
        'margin-top: 14px;' +
        'padding-top: 14px;' +
        'border-top: 1px solid rgba(0,0,0,.1);' +
      '}' +
      '.boost-review-form-grid {' +
        'display: grid;' +
        'grid-template-columns: repeat(2, minmax(0, 1fr));' +
        'gap: 10px;' +
      '}' +
      '.boost-review-form label {' +
        'display: block;' +
        'margin-bottom: 10px;' +
        'color: ' + settings.text_color + ';' +
        'font-size: 13px;' +
        'font-weight: 700;' +
      '}' +
      '.boost-review-form input, .boost-review-form select, .boost-review-form textarea {' +
        'display: block;' +
        'box-sizing: border-box;' +
        'width: 100%;' +
        'margin-top: 5px;' +
        'border: 1px solid rgba(0,0,0,.18);' +
        'border-radius: 8px;' +
        'background: #fff;' +
        'color: #111827;' +
        'font: inherit;' +
        'padding: 9px 10px;' +
      '}' +
      '.boost-review-form textarea {' +
        'min-height: 92px;' +
        'resize: vertical;' +
      '}' +
      '.boost-review-form .boost-review-honeypot {' +
        'position: absolute;' +
        'left: -9999px;' +
        'width: 1px;' +
        'height: 1px;' +
      '}' +
      '.boost-review-submit[disabled] {' +
        'cursor: wait;' +
        'opacity: .65;' +
      '}' +
      '.boost-review-form-message {' +
        'margin: 10px 0 0;' +
        'color: #047857;' +
        'font-size: 13px;' +
        'font-weight: 700;' +
      '}' +
      '@media (max-width: 560px) {' +
        '.boost-review-form-grid { grid-template-columns: 1fr; gap: 0; }' +
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
    var panels = current ? current.querySelectorAll(".boost-review-panel") : []

    function updateReview() {
      panels.forEach(function (panel, index) {
        if (index === currentIndex) {
          panel.classList.add("is-active")
        } else {
          panel.classList.remove("is-active")
        }
      })
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

    var openFormButton = container.querySelector(".boost-review-open-form")
    var reviewForm = container.querySelector(".boost-review-form")
    var formMessage = container.querySelector(".boost-review-form-message")
    var submitButton = container.querySelector(".boost-review-submit")

    openFormButton.addEventListener("click", function () {
      reviewForm.hidden = !reviewForm.hidden
      openFormButton.textContent = reviewForm.hidden ? "Écrire un avis" : "Fermer le formulaire"
    })

    reviewForm.addEventListener("submit", async function (event) {
      event.preventDefault()
      submitButton.disabled = true
      submitButton.textContent = "Envoi..."
      formMessage.style.color = "#047857"
      formMessage.textContent = ""

      try {
        var formData = new FormData(reviewForm)
        var photo = formData.get("photo")
        var imageUrl = ""

        if (photo && photo.size) {
          var uploadData = new FormData()
          uploadData.append("file", photo)
          var uploadResponse = await fetch(
            "https://boost-app-9e6w.vercel.app/api/reviews/upload-image",
            { method: "POST", body: uploadData }
          )
          var uploadResult = await uploadResponse.json()
          if (!uploadResult.success) throw new Error(uploadResult.error || "Photo invalide.")
          imageUrl = uploadResult.url
        }

        var response = await fetch(
          "https://boost-app-9e6w.vercel.app/api/reviews/submit",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_handle: productHandle,
              customer_first_name: formData.get("first_name"),
              customer_last_name: formData.get("last_name"),
              rating: formData.get("rating"),
              review: formData.get("review"),
              image_url: imageUrl,
              website: formData.get("website"),
            }),
          }
        )
        var result = await response.json()
        if (!result.success) throw new Error(result.error || "Envoi impossible.")

        reviewForm.reset()
        formMessage.textContent = result.message
      } catch (error) {
        formMessage.style.color = "#b91c1c"
        formMessage.textContent = error.message || "Une erreur est survenue."
      } finally {
        submitButton.disabled = false
        submitButton.textContent = "Envoyer mon avis"
      }
    })
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
