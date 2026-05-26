(function () {
  if (document.getElementById("boost-sticky-cart")) return

  function getProductInfo() {
    const title =
      document.querySelector("h1")?.innerText ||
      document.querySelector(".product__title")?.innerText ||
      document.title ||
      "Produit"

    const price =
      document.querySelector("[class*='price']")?.innerText ||
      ""

    const image =
      document.querySelector(".product img")?.src ||
      document.querySelector("img")?.src ||
      ""

    return { title, price, image }
  }

  function findVariantId() {
    const input =
      document.querySelector("form[action*='/cart/add'] input[name='id']") ||
      document.querySelector("input[name='id']")

    return input ? input.value : null
  }

  const product = getProductInfo()

  const bar = document.createElement("div")
  bar.id = "boost-sticky-cart"

  bar.innerHTML = `
    <div class="boost-sticky-inner">
      <div class="boost-product">
        ${
          product.image
            ? `<img src="${product.image}" class="boost-image" alt="${product.title}" />`
            : ""
        }

        <div class="boost-info">
          <strong class="boost-title">${product.title}</strong>
          <span class="boost-price">${product.price}</span>
        </div>
      </div>

      <button class="boost-add-button">
        Ajouter au panier
      </button>
    </div>
  `

  const style = document.createElement("style")
  style.innerHTML = `
    #boost-sticky-cart {
      position: fixed;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 760px;
      background: rgba(255,255,255,0.96);
      color: #111827;
      border: 1px solid rgba(15,23,42,0.12);
      padding: 12px;
      border-radius: 999px;
      z-index: 999999;
      box-shadow: 0 18px 50px rgba(15,23,42,0.25);
      font-family: Arial, sans-serif;
      backdrop-filter: blur(12px);
      animation: boost-slide-up 0.35s ease-out;
    }

    .boost-sticky-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .boost-product {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .boost-image {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    .boost-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .boost-title {
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 340px;
    }

    .boost-price {
      font-size: 13px;
      color: #475569;
      margin-top: 3px;
    }

    .boost-add-button {
      background: #020617;
      color: white;
      border: none;
      padding: 14px 22px;
      border-radius: 999px;
      font-weight: 800;
      cursor: pointer;
      transition: transform 0.15s ease, opacity 0.15s ease;
      white-space: nowrap;
    }

    .boost-add-button:hover {
      transform: translateY(-1px);
      opacity: 0.92;
    }

    .boost-add-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @keyframes boost-slide-up {
      from {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }

    @media (max-width: 640px) {
      #boost-sticky-cart {
        bottom: 12px;
        border-radius: 22px;
      }

      .boost-sticky-inner {
        gap: 10px;
      }

      .boost-title {
        max-width: 150px;
        font-size: 13px;
      }

      .boost-add-button {
        padding: 12px 16px;
        font-size: 13px;
      }
    }
  `

  document.head.appendChild(style)
  document.body.appendChild(bar)

  const button = bar.querySelector(".boost-add-button")

  button.addEventListener("click", async function () {
    const variantId = findVariantId()

    if (!variantId) {
      const nativeButton =
        document.querySelector("form[action*='/cart/add'] button[type='submit']") ||
        document.querySelector("button[name='add']")

      if (nativeButton) {
        nativeButton.click()
        return
      }

      alert("Impossible de trouver le produit à ajouter.")
      return
    }

    button.disabled = true
    button.innerText = "Ajout..."

    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: variantId,
          quantity: 1,
        }),
      })

      if (!response.ok) throw new Error("Cart error")

      button.innerText = "Ajouté ✓"

      setTimeout(() => {
        button.innerText = "Ajouter au panier"
        button.disabled = false
      }, 1800)
    } catch (error) {
      button.innerText = "Erreur"
      setTimeout(() => {
        button.innerText = "Ajouter au panier"
        button.disabled = false
      }, 1800)
    }
  })
})()