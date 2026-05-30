import { NextResponse } from "next/server";

export async function GET() {
  const script = `
(function(){

if(window.BOOST_REVIEWS_LOADED) return;
window.BOOST_REVIEWS_LOADED = true;

const shop = window.location.hostname;

function getProductHandle() {
  const parts = window.location.pathname.split("/");
  const index = parts.indexOf("products");

  if(index === -1) return null;

  return parts[index + 1];
}

async function loadReviews() {

  const productHandle = getProductHandle();

  if(!productHandle) return;

  try {

    const response = await fetch(
      "https://boost-app-9e6w.vercel.app/api/reviews/list?shop=" +
      encodeURIComponent(shop) +
      "&product_handle=" +
      encodeURIComponent(productHandle)
    );

    const data = await response.json();

    if(!data.success) return;

    renderReviews(data.reviews);

  } catch(e) {
    console.error("Boost Reviews Error", e);
  }
}

function renderReviews(reviews) {

  const form =
    document.querySelector('form[action*="/cart/add"]') ||
    document.querySelector('product-form');

  if(!form) return;

  const oldWidget = document.getElementById("boost-reviews-widget");

  if(oldWidget) oldWidget.remove();

  const container = document.createElement("div");

  container.id = "boost-reviews-widget";

  container.style.marginTop = "30px";
  container.style.padding = "20px";
  container.style.border = "1px solid #e5e5e5";
  container.style.borderRadius = "12px";
  container.style.background = "#fff";

  const total = reviews.length;

  let average = 0;

  if(total > 0){
    average =
      reviews.reduce((a,b)=>a + Number(b.rating || 0),0)
      / total;
  }

  container.innerHTML = \`
    <h2 style="margin-bottom:15px">
      ⭐ \${average.toFixed(1)} / 5
      (\${total} avis)
    </h2>

    <div id="boost-review-list"></div>
  \`;

  form.parentNode.insertBefore(container, form.nextSibling);

  const list = container.querySelector("#boost-review-list");

  reviews.forEach(review => {

    const item = document.createElement("div");

    item.style.borderTop = "1px solid #eee";
    item.style.padding = "15px 0";

    item.innerHTML = \`
      <div style="font-weight:bold">
        \${review.customer_first_name || ""}
        \${review.customer_last_name || ""}
      </div>

      <div style="margin:5px 0">
        \${"⭐".repeat(review.rating)}
      </div>

      <div>
        \${review.review || ""}
      </div>
    \`;

    list.appendChild(item);
  });
}

loadReviews();

})();
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
    },
  });
}