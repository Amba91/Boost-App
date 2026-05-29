export async function GET() {
  const script = `
(() => {
  const addToCartButton = document.querySelector(
    'button[name="add"], button[type="submit"][name="add"], form[action*="/cart/add"] button[type="submit"]'
  )

  if (!addToCartButton) return

  const title = document.querySelector("h1")?.innerText || "Produit"

  const price =
    document.querySelector('[class*="price"]')?.innerText ||
    ""

  const image =
    document.querySelector('img[src*="/products/"]')?.src ||
    document.querySelector("img")?.src ||
    ""

  const old = document.getElementById("boost-sticky-cart")
  if (old) old.remove()

  const sticky = document.createElement("div")
  sticky.id = "boost-sticky-cart"

  sticky.innerHTML = \`
    <div class="boost-sticky-left">
      \${image ? \`<img src="\${image}" class="boost-sticky-img" />\` : ""}
      <div class="boost-sticky-info">
        <div class="boost-sticky-title">\${title}</div>
        <div class="boost-sticky-price">\${price}</div>
      </div>
    </div>

    <button id="boost-sticky-add">
      Ajouter au panier
    </button>
  \`

  const style = document.createElement("style")
  style.innerHTML = \`
    #boost-sticky-cart {
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%) translateY(120%);
      width: calc(100% - 32px);
      max-width: 760px;
      background: rgba(17, 24, 39, 0.96);
      color: white;
      padding: 10px 12px;
      border-radius: 18px;
      z-index: 999998;
      box-shadow: 0 12px 35px rgba(0,0,0,.28);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      font-family: Arial, sans-serif;
      opacity: 0;
      transition: all .28s ease;
      backdrop-filter: blur(10px);
    }

    #boost-sticky-cart.boost-show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    .boost-sticky-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .boost-sticky-img {
      width: 46px;
      height: 46px;
      object-fit: cover;
      border-radius: 12px;
      flex-shrink: 0;
    }

    .boost-sticky-info {
      min-width: 0;
    }

    .boost-sticky-title {
      font-size: 14px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 360px;
    }

    .boost-sticky-price {
      font-size: 13px;
      opacity: .8;
      margin-top: 2px;
    }

    #boost-sticky-add {
      background: #7c3aed;
      color: white;
      border: none;
      padding: 11px 18px;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      font-size: 14px;
    }

    #boost-sticky-add:hover {
      opacity: .92;
    }

    @media (max-width: 600px) {
      #boost-sticky-cart {
        left: 10px;
        right: 10px;
        bottom: 14px;
        transform: translateY(120%);
        width: auto;
        max-width: none;
        border-radius: 16px;
      }

      #boost-sticky-cart.boost-show {
        transform: translateY(0);
      }

      .boost-sticky-title {
        max-width: 170px;
        font-size: 13px;
      }

      .boost-sticky-img {
        width: 42px;
        height: 42px;
      }

      #boost-sticky-add {
        padding: 10px 12px;
        font-size: 13px;
      }
    }
  \`

  document.head.appendChild(style)
  document.body.appendChild(sticky)

  const stickyButton = document.getElementById("boost-sticky-add")

  function toggleSticky() {
    if (window.scrollY > 450) {
      sticky.classList.add("boost-show")
    } else {
      sticky.classList.remove("boost-show")
    }
  }

  window.addEventListener("scroll", toggleSticky)
  toggleSticky()

  stickyButton.addEventListener("click", () => {
    addToCartButton.click()
  })
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