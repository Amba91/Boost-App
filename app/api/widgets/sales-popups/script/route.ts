export async function GET() {
  const script = `
    (() => {
      const popup = document.createElement("div")

      popup.innerHTML = \`
        <div id="boost-sales-popup">
          🔥 Quelqu’un vient d’acheter un produit sur cette boutique
        </div>
      \`

      document.body.appendChild(popup)

      const style = document.createElement("style")

      style.innerHTML = \`
        #boost-sales-popup{
          position:fixed;
          bottom:20px;
          left:20px;
          background:#111827;
          color:white;
          padding:16px 22px;
          border-radius:14px;
          z-index:999999;
          font-family:Arial;
          box-shadow:0 10px 30px rgba(0,0,0,0.4);
          animation:boostPopup 0.5s ease;
        }

        @keyframes boostPopup{
          from{
            transform:translateY(30px);
            opacity:0;
          }

          to{
            transform:translateY(0);
            opacity:1;
          }
        }
      \`

      document.head.appendChild(style)
    })();
  `

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
    },
  })
}