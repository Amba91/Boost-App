export async function GET() {
  const script = `
(() => {
  const addToCartButton = document.querySelector(
    'button[name="add"], button[type="submit"][name="add"], form[action*="/cart/add"] button[type="submit"]'
  )

  if (!addToCartButton) return

  const title =
    document.querySelector("h1")?.innerText ||
    "Produit"

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
    <div style="display:flex;align-items:center;gap:12px;">
      \${image ? \`<img src="\${image}" style="width:54px;height:54px;object-fit:cover;border-radius:10px;" />\` : ""}
      <div>
        <div style="font-weight:700;font-size:14px;line-height:1.3;">\${title}</div>
        <div style="opacity:.85;font-size:13px;margin-top:3px;">\${price}</div>
      </div>
    </div>

    <button id="boost-sticky-add">
      Ajouter au panier
    </button>
  \`

  sticky.style.position = "fixed"
  sticky.style.left = "16px"
  sticky.style.right = "16px"
  sticky.style.bottom = "16px"
  sticky.style.background = "#111827"
  sticky.style.color = "white"
  sticky.style.padding = "14px"
  sticky.style.borderRadius = "18px"
  sticky.style.zIndex = "999999"
  sticky.style.boxShadow = "0 10px 35px rgba(0,0,0,.35)"
  sticky.style.display = "none"
  sticky.style.alignItems = "center"
  sticky.style.justifyContent = "space-between"
  sticky.style.gap = "14px"
  sticky.style.fontFamily = "Arial, sans-serif"

  document.body.appendChild(sticky)

  const stickyButton = document.getElementById("boost-sticky-add")
  stickyButton.style.background = "#7c3aed"
  stickyButton.style.color = "white"
  stickyButton.style.border = "none"
  stickyButton.style.padding = "12px 18px"
  stickyButton.style.borderRadius = "12px"
  stickyButton.style.fontWeight = "700"
  stickyButton.style.cursor = "pointer"
  stickyButton.style.whiteSpace = "nowrap"

  function toggleSticky() {
    sticky.style.display = window.scrollY > 450 ? "flex" : "none"
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