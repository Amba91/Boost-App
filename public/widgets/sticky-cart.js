(function () {
  if (document.getElementById("boost-sticky-cart")) return

  const bar = document.createElement("div")
  bar.id = "boost-sticky-cart"

  bar.innerHTML = `
    <div class="boost-content">
      <span class="boost-text">
        🚀 Produit prêt à être ajouté au panier
      </span>

      <button class="boost-button">
        Ajouter au panier
      </button>
    </div>
  `

  const style = document.createElement("style")

  style.innerHTML = `
    #boost-sticky-cart {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 700px;
      background: #7c3aed;
      color: white;
      padding: 18px 24px;
      border-radius: 20px;
      z-index: 999999;
      box-shadow: 0 10px 40px rgba(0,0,0,0.35);
      font-family: sans-serif;
    }

    .boost-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .boost-text {
      font-size: 16px;
      font-weight: bold;
    }

    .boost-button {
      background: white;
      color: black;
      border: none;
      padding: 12px 18px;
      border-radius: 12px;
      font-weight: bold;
      cursor: pointer;
    }
  `

  document.head.appendChild(style)
  document.body.appendChild(bar)
})()