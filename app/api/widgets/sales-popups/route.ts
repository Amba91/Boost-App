export async function GET() {
  const script = `
    (() => {
      const names = ["Sarah", "Amadou", "Camille", "Nadia", "Yanis", "Emma", "Lucas", "Inès"];

      async function loadProducts() {
        try {
          const res = await fetch("/products.json?limit=20");
          const data = await res.json();
          return data.products || [];
        } catch (error) {
          console.error("Boost Sales Popup products error:", error);
          return [];
        }
      }

      function randomItem(items) {
        return items[Math.floor(Math.random() * items.length)];
      }

      function showPopup(product) {
        const old = document.getElementById("boost-sales-popup");
        if (old) old.remove();

        const name = randomItem(names);
        const title = product?.title || "un produit";
        const image = product?.images?.[0]?.src || "";

        const popup = document.createElement("div");
        popup.id = "boost-sales-popup";

        popup.innerHTML = \`
          <div style="display:flex;align-items:center;gap:12px;">
            \${image ? \`<img src="\${image}" style="width:54px;height:54px;object-fit:cover;border-radius:10px;" />\` : ""}
            <div>
              <div style="font-weight:bold;font-size:14px;">
                🔥 \${name} a acheté
              </div>
              <div style="font-size:13px;opacity:.9;margin-top:3px;">
                "\${title}"
              </div>
            </div>
          </div>
        \`;

        popup.style.position = "fixed";
        popup.style.bottom = "20px";
        popup.style.left = "20px";
        popup.style.background = "#111827";
        popup.style.color = "white";
        popup.style.padding = "14px 16px";
        popup.style.borderRadius = "14px";
        popup.style.zIndex = "999999";
        popup.style.fontFamily = "Arial, sans-serif";
        popup.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
        popup.style.maxWidth = "360px";
        popup.style.animation = "boostPopupIn .4s ease";

        const style = document.createElement("style");
        style.innerHTML = \`
          @keyframes boostPopupIn {
            from { transform: translateY(25px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        \`;

        document.head.appendChild(style);
        document.body.appendChild(popup);

        setTimeout(() => {
          popup.remove();
        }, 6000);
      }

      async function start() {
        const products = await loadProducts();

        if (!products.length) return;

        setTimeout(() => {
          showPopup(randomItem(products));
        }, 3000);

        setInterval(() => {
          showPopup(randomItem(products));
        }, 12000);
      }

      start();
    })();
  `;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
    },
  });
}