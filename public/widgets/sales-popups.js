(function () {
  if (document.getElementById("boost-sales-popup")) return

  const names = ["Sarah", "Lucas", "Emma", "Nina", "Yanis"]
  const cities = ["Lyon", "Paris", "Marseille", "Toulouse", "Nice"]

  const popup = document.createElement("div")
  popup.id = "boost-sales-popup"

  const style = document.createElement("style")
  style.innerHTML = `
    #boost-sales-popup {
      position: fixed;
      left: 20px;
      bottom: 110px;
      background: white;
      color: #111827;
      border-radius: 18px;
      padding: 16px 18px;
      box-shadow: 0 18px 45px rgba(0,0,0,0.22);
      z-index: 999998;
      font-family: Arial, sans-serif;
      max-width: 320px;
      display: none;
      animation: boost-pop 0.35s ease;
      border: 1px solid rgba(15,23,42,0.12);
    }

    #boost-sales-popup strong {
      display: block;
      font-size: 14px;
      margin-bottom: 4px;
    }

    #boost-sales-popup span {
      font-size: 13px;
      color: #475569;
    }

    @keyframes boost-pop {
      from {
        opacity: 0;
        transform: translateY(15px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      #boost-sales-popup {
        left: 12px;
        right: 12px;
        bottom: 105px;
        max-width: none;
      }
    }
  `

  function showPopup() {
    const name = names[Math.floor(Math.random() * names.length)]
    const city = cities[Math.floor(Math.random() * cities.length)]

    popup.innerHTML = `
      <strong>🔥 ${name} vient d’acheter un produit</strong>
      <span>Commande récente depuis ${city}</span>
    `

    popup.style.display = "block"

    setTimeout(function () {
      popup.style.display = "none"
    }, 4500)
  }

  document.head.appendChild(style)
  document.body.appendChild(popup)

  setTimeout(showPopup, 2500)
  setInterval(showPopup, 12000)
})()