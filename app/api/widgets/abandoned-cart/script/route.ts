export async function GET() {
  const script = `
(function () {
  if (window.BOOST_ABANDONED_CART_LOADED) return;
  window.BOOST_ABANDONED_CART_LOADED = true;

  var APP_URL = "https://boost-app-9e6w.vercel.app";
  var STORAGE_EMAIL = "boost_cart_email";
  var STORAGE_SENT = "boost_cart_last_sent";

  function isEmail(value) {
    return /^\\S+@\\S+\\.\\S+$/.test(String(value || "").trim());
  }

  function normalizeCartItem(item) {
    return {
      title: item.product_title || item.title || "Produit",
      handle: item.handle || "",
      image: item.image || item.featured_image?.url || item.featured_image || "",
      quantity: item.quantity || 1,
      price: item.final_line_price ? String(item.final_line_price / 100) : ""
    };
  }

  async function getCart() {
    try {
      var response = await fetch("/cart.js", { credentials: "same-origin" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  function buildCartUrl(cart) {
    if (cart && cart.token) return window.location.origin + "/cart?boost_cart=" + encodeURIComponent(cart.token);
    return window.location.origin + "/cart";
  }

  async function sendCart(email) {
    var cart = await getCart();
    if (!cart || !cart.items || !cart.items.length) return;

    var signature = email + "::" + cart.item_count + "::" + cart.total_price;
    if (sessionStorage.getItem(STORAGE_SENT) === signature) return;

    try {
      await fetch(APP_URL + "/api/mail/abandoned-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          cart_token: cart.token || "",
          cart_url: buildCartUrl(cart),
          total_price: cart.total_price ? String(cart.total_price / 100) : "",
          currency: cart.currency || "EUR",
          items: cart.items.map(normalizeCartItem)
        })
      });
      sessionStorage.setItem(STORAGE_SENT, signature);
    } catch (error) {
      console.error("Boost abandoned cart error:", error);
    }
  }

  function rememberEmailFromPage() {
    var input = document.querySelector('input[type="email"], input[name="email"], input[name="checkout[email]"]');
    if (!input) return "";
    var email = String(input.value || "").trim();
    if (isEmail(email)) {
      localStorage.setItem(STORAGE_EMAIL, email);
      sendCart(email);
      return email;
    }
    return "";
  }

  function createEmailBox() {
    if (document.getElementById("boost-cart-email-box")) return;
    if (localStorage.getItem(STORAGE_EMAIL)) return;
    if (window.location.pathname.includes("/checkout")) return;

    var box = document.createElement("div");
    box.id = "boost-cart-email-box";
    box.innerHTML =
      '<button id="boost-cart-email-close" type="button">×</button>' +
      '<strong>Garde ton panier au chaud</strong>' +
      '<p>Entre ton e-mail pour retrouver ton panier si tu quittes la page.</p>' +
      '<form id="boost-cart-email-form">' +
      '<input type="email" placeholder="ton@email.com" required>' +
      '<button type="submit">Sauvegarder</button>' +
      '</form>';

    var style = document.createElement("style");
    style.innerHTML =
      '#boost-cart-email-box{position:fixed;right:18px;bottom:18px;width:330px;max-width:calc(100% - 36px);padding:18px;border-radius:18px;background:#111827;color:#fff;z-index:999999;box-shadow:0 16px 45px rgba(0,0,0,.28);font-family:Arial,sans-serif}' +
      '#boost-cart-email-box strong{display:block;font-size:17px;margin-bottom:6px}' +
      '#boost-cart-email-box p{margin:0 0 12px;color:#cbd5e1;line-height:1.35;font-size:13px}' +
      '#boost-cart-email-form{display:grid;grid-template-columns:1fr auto;gap:8px}' +
      '#boost-cart-email-form input{min-width:0;border:0;border-radius:10px;padding:11px 12px;font:inherit}' +
      '#boost-cart-email-form button{border:0;border-radius:10px;background:#7c3aed;color:#fff;font-weight:800;padding:11px 12px;cursor:pointer}' +
      '#boost-cart-email-close{position:absolute;top:8px;right:10px;border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}';

    document.head.appendChild(style);
    document.body.appendChild(box);

    document.getElementById("boost-cart-email-close")?.addEventListener("click", function () {
      box.remove();
    });

    document.getElementById("boost-cart-email-form")?.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = box.querySelector('input[type="email"]');
      var email = String(input?.value || "").trim();
      if (!isEmail(email)) return;
      localStorage.setItem(STORAGE_EMAIL, email);
      sendCart(email);
      box.innerHTML = '<strong>Panier sauvegardé</strong><p>Merci, tu pourras retrouver ton panier plus facilement.</p>';
      setTimeout(function () { box.remove(); }, 2200);
    });
  }

  async function maybeCaptureCart() {
    var cart = await getCart();
    if (!cart || !cart.items || !cart.items.length) return;

    var email = rememberEmailFromPage() || localStorage.getItem(STORAGE_EMAIL);
    if (isEmail(email)) {
      sendCart(email);
      return;
    }

    setTimeout(createEmailBox, 2500);
  }

  document.addEventListener("change", function (event) {
    if (event.target && event.target.matches && event.target.matches('input[type="email"], input[name="email"], input[name="checkout[email]"]')) {
      rememberEmailFromPage();
    }
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('form[action*="/cart/add"] button, button[name="add"], .product-form__submit, .sticky-atc-button')) {
      setTimeout(maybeCaptureCart, 1200);
    }
  });

  maybeCaptureCart();
})();
`

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  })
}
