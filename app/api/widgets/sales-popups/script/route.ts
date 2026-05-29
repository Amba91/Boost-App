export async function GET() {
  const script = `
(() => {

const names = [
  "Sarah",
  "Emma",
  "Lucas",
  "Nadia",
  "Camille",
  "Yanis",
  "Lina",
  "Adam"
]

function randomItem(items){
  return items[Math.floor(Math.random()*items.length)]
}

async function loadProducts(){
  try{
    const res = await fetch("/products.json?limit=20")
    const data = await res.json()
    return data.products || []
  }catch(error){
    console.error(error)
    return []
  }
}

function createPopup(product){

  const old = document.getElementById("boost-sales-popup")
  if(old) old.remove()

  const popup = document.createElement("div")

  popup.id = "boost-sales-popup"

  const customer = randomItem(names)

  popup.innerHTML = \`
    <div style="display:flex;gap:12px;align-items:center;">
      <img
        src="\${product.images?.[0]?.src || ""}"
        style="
          width:60px;
          height:60px;
          object-fit:cover;
          border-radius:10px;
        "
      />

      <div>
        <div style="font-weight:bold">
          🔥 \${customer} a acheté
        </div>

        <div style="font-size:13px;margin-top:4px;">
          \${product.title}
        </div>
      </div>
    </div>
  \`

  popup.style.position = "fixed"
  popup.style.bottom = "20px"
  popup.style.left = "20px"
  popup.style.background = "#111827"
  popup.style.color = "white"
  popup.style.padding = "14px"
  popup.style.borderRadius = "14px"
  popup.style.zIndex = "999999"
  popup.style.maxWidth = "360px"
  popup.style.boxShadow = "0 10px 30px rgba(0,0,0,.35)"

  document.body.appendChild(popup)

  setTimeout(() => {
    popup.remove()
  }, 5000)
}

async function start(){

  const products = await loadProducts()

  if(!products.length){
    return
  }

  setTimeout(() => {
    createPopup(randomItem(products))
  }, 3000)

  setInterval(() => {
    createPopup(randomItem(products))
  }, 30000)
}

start()

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