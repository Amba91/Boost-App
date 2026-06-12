import { NextResponse } from "next/server"

const APP_URL = "https://boost-app-9e6w.vercel.app"

export async function GET() {
  const script = String.raw`
(function () {
  if (window.__BOOST_TRACKING_WIDGET_LOADED__) return;
  window.__BOOST_TRACKING_WIDGET_LOADED__ = true;

  var APP_URL = "${APP_URL}";

  function normalizePath(path) {
    return String(path || "/").replace(/\/+$/, "") || "/";
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date(value));
    } catch (_) {
      return "";
    }
  }

  function addStyles(settings) {
    if (document.getElementById("boost-tracking-styles")) return;
    var style = document.createElement("style");
    style.id = "boost-tracking-styles";
    style.textContent = [
      "#boost-tracking-widget{box-sizing:border-box;max-width:900px;margin:42px auto;padding:34px;border-radius:24px;background:" + settings.background_color + ";color:" + settings.text_color + ";font-family:inherit;box-shadow:0 12px 40px rgba(15,23,42,.08)}",
      "#boost-tracking-widget *{box-sizing:border-box}",
      ".boost-track-heading{margin:0 0 8px;font-size:clamp(25px,4vw,38px);line-height:1.15;color:inherit}",
      ".boost-track-subtitle{margin:0 0 24px;opacity:.72;font-size:16px;line-height:1.5}",
      ".boost-track-form{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end}",
      ".boost-track-field{display:flex;flex-direction:column;gap:7px;font-size:14px;font-weight:700}",
      ".boost-track-field input{width:100%;min-height:50px;padding:12px 14px;border:1px solid rgba(15,23,42,.2);border-radius:12px;background:#fff;color:#111827;font:inherit}",
      ".boost-track-submit{min-height:50px;padding:12px 22px;border:0;border-radius:12px;background:" + settings.primary_color + ";color:#fff;font:inherit;font-weight:800;cursor:pointer}",
      ".boost-track-submit:disabled{opacity:.65;cursor:wait}",
      ".boost-track-error{display:none;margin:16px 0 0;padding:12px 14px;border-radius:10px;background:#fee2e2;color:#991b1b;font-weight:700}",
      ".boost-track-result{display:none;margin-top:26px;padding-top:24px;border-top:1px solid rgba(15,23,42,.12)}",
      ".boost-track-order-line{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:24px}",
      ".boost-track-order-name{font-size:20px;font-weight:800}",
      ".boost-track-status{padding:7px 11px;border-radius:999px;background:" + settings.primary_color + ";color:#fff;font-size:13px;font-weight:800}",
      ".boost-track-steps{display:grid;grid-template-columns:repeat(4,1fr);position:relative;margin:20px 0 26px}",
      ".boost-track-steps:before{content:\"\";position:absolute;top:15px;left:12.5%;right:12.5%;height:3px;background:rgba(15,23,42,.15)}",
      ".boost-track-step{position:relative;text-align:center;font-size:12px;font-weight:700;z-index:1}",
      ".boost-track-dot{display:flex;width:32px;height:32px;margin:0 auto 9px;align-items:center;justify-content:center;border:3px solid rgba(15,23,42,.18);border-radius:50%;background:" + settings.background_color + ";color:transparent}",
      ".boost-track-step.is-done .boost-track-dot{border-color:" + settings.primary_color + ";background:" + settings.primary_color + ";color:#fff}",
      ".boost-track-details{padding:17px;border-radius:14px;background:rgba(255,255,255,.7);line-height:1.6}",
      ".boost-track-details p{margin:4px 0}",
      ".boost-track-link{display:inline-block;margin-top:11px;color:" + settings.primary_color + ";font-weight:800;text-decoration:underline}",
      ".boost-track-security{margin:14px 0 0;font-size:12px;opacity:.6}",
      "@media(max-width:720px){#boost-tracking-widget{margin:25px 16px;padding:24px 18px}.boost-track-form{grid-template-columns:1fr}.boost-track-submit{width:100%}.boost-track-order-line{align-items:flex-start;flex-direction:column}.boost-track-step{font-size:10px}.boost-track-dot{width:28px;height:28px}.boost-track-steps:before{top:13px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function insertWidget(widget) {
    var headings = document.querySelectorAll("h1");
    var heading = Array.prototype.find.call(headings, function (node) {
      return /suivre\s+(ma|votre)\s+commande/i.test(node.textContent || "");
    });
    var section = heading && heading.closest(".shopify-section");
    if (section && section.parentNode) {
      section.insertAdjacentElement("afterend", widget);
      return;
    }
    var main = document.querySelector("main") || document.body;
    main.insertBefore(widget, main.firstChild);
  }

  function render(settings) {
    if (document.getElementById("boost-tracking-widget")) return;
    addStyles(settings);

    var widget = document.createElement("section");
    widget.id = "boost-tracking-widget";

    var title = document.createElement("h2");
    title.className = "boost-track-heading";
    title.textContent = settings.title;
    widget.appendChild(title);

    var subtitle = document.createElement("p");
    subtitle.className = "boost-track-subtitle";
    subtitle.textContent = settings.subtitle;
    widget.appendChild(subtitle);

    var form = document.createElement("form");
    form.className = "boost-track-form";
    form.innerHTML = '<label class="boost-track-field">Numéro de commande<input name="order_number" type="text" placeholder="#1234" autocomplete="off" required maxlength="40"></label><label class="boost-track-field">E-mail de la commande<input name="email" type="email" placeholder="client@exemple.com" autocomplete="email" required maxlength="160"></label><button class="boost-track-submit" type="submit"></button>';
    form.querySelector("button").textContent = settings.button_text;
    widget.appendChild(form);

    var errorBox = document.createElement("p");
    errorBox.className = "boost-track-error";
    widget.appendChild(errorBox);

    var resultBox = document.createElement("div");
    resultBox.className = "boost-track-result";
    widget.appendChild(resultBox);

    var security = document.createElement("p");
    security.className = "boost-track-security";
    security.textContent = "L’e-mail sert uniquement à vérifier que cette commande t’appartient.";
    widget.appendChild(security);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      errorBox.style.display = "none";
      resultBox.style.display = "none";
      var button = form.querySelector("button");
      var initialText = button.textContent;
      button.disabled = true;
      button.textContent = "Recherche...";

      try {
        var formData = new FormData(form);
        var response = await fetch(APP_URL + "/api/tracking/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_number: formData.get("order_number"),
            email: formData.get("email")
          })
        });
        var data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Suivi indisponible.");

        var order = data.order;
        resultBox.innerHTML = "";
        var top = document.createElement("div");
        top.className = "boost-track-order-line";
        var orderName = document.createElement("div");
        orderName.className = "boost-track-order-name";
        orderName.textContent = "Commande " + order.name;
        var status = document.createElement("span");
        status.className = "boost-track-status";
        status.textContent = order.status.label;
        top.appendChild(orderName);
        top.appendChild(status);
        resultBox.appendChild(top);

        if (order.status.step > 0) {
          var labels = ["Confirmée", "Expédiée", "En transit", "Livrée"];
          var steps = document.createElement("div");
          steps.className = "boost-track-steps";
          labels.forEach(function (label, index) {
            var step = document.createElement("div");
            step.className = "boost-track-step" + (index + 1 <= order.status.step ? " is-done" : "");
            step.innerHTML = '<span class="boost-track-dot">✓</span><span></span>';
            step.querySelector("span:last-child").textContent = label;
            steps.appendChild(step);
          });
          resultBox.appendChild(steps);
        }

        var details = document.createElement("div");
        details.className = "boost-track-details";
        if (order.created_at) {
          var created = document.createElement("p");
          created.textContent = "Commande passée le " + formatDate(order.created_at);
          details.appendChild(created);
        }
        if (order.estimated_delivery_at && !order.delivered_at) {
          var estimated = document.createElement("p");
          estimated.textContent = "Livraison estimée : " + formatDate(order.estimated_delivery_at);
          details.appendChild(estimated);
        }
        if (order.delivered_at) {
          var delivered = document.createElement("p");
          delivered.textContent = "Livrée le " + formatDate(order.delivered_at);
          details.appendChild(delivered);
        }
        if (order.tracking && (order.tracking.company || order.tracking.number)) {
          var carrier = document.createElement("p");
          carrier.textContent = [order.tracking.company, order.tracking.number].filter(Boolean).join(" · ");
          details.appendChild(carrier);
        }
        var linkUrl = order.tracking && order.tracking.url ? order.tracking.url : order.status_page_url;
        if (linkUrl) {
          var link = document.createElement("a");
          link.className = "boost-track-link";
          link.href = linkUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Ouvrir le suivi détaillé";
          details.appendChild(link);
        }
        resultBox.appendChild(details);
        resultBox.style.display = "block";
      } catch (error) {
        errorBox.textContent = error && error.message ? error.message : "Suivi indisponible.";
        errorBox.style.display = "block";
      } finally {
        button.disabled = false;
        button.textContent = initialText;
      }
    });

    insertWidget(widget);
  }

  fetch(APP_URL + "/api/tracking/settings", { cache: "no-store" })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (!data.success || !data.settings) return;
      if (normalizePath(window.location.pathname) !== normalizePath(data.settings.page_path)) return;
      render(data.settings);
    })
    .catch(function (error) { console.error("Boost tracking widget error:", error); });
})();
`

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  })
}
