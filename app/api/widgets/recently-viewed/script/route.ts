export async function GET() {
  const script = `
(() => {

  const STORAGE_KEY = "boost_recently_viewed";

  const currentProduct =
    window.location.pathname.includes("/products/")
      ? window.location.pathname
      : null;

  if (!currentProduct) return;

  let viewed =
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  viewed = viewed.filter(p => p !== currentProduct);

  viewed.unshift(currentProduct);

  viewed = viewed.slice(0, 8);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(viewed)
  );

})();
`

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
    },
  })
}