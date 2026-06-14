const DEFAULT_BOOST_URL = "https://boost-app-9e6w.vercel.app"

const boostUrlInput = document.getElementById("boostUrl")
const productHandleInput = document.getElementById("productHandle")
const sendButton = document.getElementById("sendButton")
const reviewsButton = document.getElementById("reviewsButton")
const openBoostButton = document.getElementById("openBoostButton")
const statusEl = document.getElementById("status")

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.classList.toggle("error", isError)
}

function cleanBoostUrl(value) {
  const raw = String(value || DEFAULT_BOOST_URL).trim().replace(/\/+$/, "")
  try {
    const url = new URL(raw)
    if (!["http:", "https:"].includes(url.protocol)) return DEFAULT_BOOST_URL
    return url.toString().replace(/\/+$/, "")
  } catch {
    return DEFAULT_BOOST_URL
  }
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0]
}

async function askContentScriptForProduct(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "BOOST_EXTRACT_ALIEXPRESS_PRODUCT" })
  } catch {
    await chrome.scripting?.executeScript?.({
      target: { tabId },
      files: ["content.js"],
    })
    return chrome.tabs.sendMessage(tabId, { type: "BOOST_EXTRACT_ALIEXPRESS_PRODUCT" })
  }
}

async function askContentScriptForReviews(tabId, productHandle) {
  const message = { type: "BOOST_EXTRACT_ALIEXPRESS_REVIEWS", productHandle }
  try {
    return await chrome.tabs.sendMessage(tabId, message)
  } catch {
    await chrome.scripting?.executeScript?.({
      target: { tabId },
      files: ["content.js"],
    })
    return chrome.tabs.sendMessage(tabId, message)
  }
}

async function saveBoostUrl(boostUrl) {
  await chrome.storage.local.set({ boostUrl, productHandle: productHandleInput.value.trim() })
}

async function loadBoostUrl() {
  const saved = await chrome.storage.local.get(["boostUrl", "productHandle"])
  boostUrlInput.value = cleanBoostUrl(saved.boostUrl || DEFAULT_BOOST_URL)
  productHandleInput.value = saved.productHandle || ""
}

async function sendProductToBoost() {
  const boostUrl = cleanBoostUrl(boostUrlInput.value)
  await saveBoostUrl(boostUrl)

  sendButton.disabled = true
  setStatus("Lecture de la fiche AliExpress...")

  try {
    const tab = await getCurrentTab()
    if (!tab?.id || !/aliexpress\./i.test(tab.url || "")) {
      throw new Error("Ouvre d'abord une fiche produit AliExpress.")
    }

    const product = await askContentScriptForProduct(tab.id)
    if (!product?.success) {
      throw new Error(product?.error || "Impossible de lire la fiche AliExpress.")
    }

    setStatus(`Produit lu : ${product.payload.variants.length} variante(s). Envoi vers Boost...`)

    const response = await fetch(`${boostUrl}/api/suppliers/extension-import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product.payload),
    })
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Boost n'a pas pu enregistrer ce produit.")
    }

    const openUrl = `${boostUrl}/suppliers?extension_product_id=${data.product.id}&extension_import=${Date.now()}`
    setStatus(`Import terminé : ${data.variants_count} variante(s) envoyée(s). Ouverture de Boost...`)
    await chrome.tabs.create({ url: openUrl })
  } catch (error) {
    setStatus(error.message || String(error), true)
  } finally {
    sendButton.disabled = false
  }
}

async function importReviewsToBoost() {
  const boostUrl = cleanBoostUrl(boostUrlInput.value)
  const productHandle = productHandleInput.value.trim()
  await saveBoostUrl(boostUrl)

  reviewsButton.disabled = true
  setStatus("Lecture des avis AliExpress visibles...")

  try {
    const tab = await getCurrentTab()
    if (!tab?.id || !/aliexpress\./i.test(tab.url || "")) {
      throw new Error("Ouvre d'abord la fiche AliExpress avec les avis visibles.")
    }
    if (!productHandle) {
      throw new Error("Ajoute le handle du produit Shopify/Boost pour classer les avis.")
    }

    const result = await askContentScriptForReviews(tab.id, productHandle)

    if (!result?.success) {
      throw new Error(result?.error || "Impossible de lire les avis visibles.")
    }

    if (!result.reviews.length) {
      throw new Error("Aucun avis visible détecté. Ouvre l'onglet avis AliExpress puis réessaie.")
    }

    setStatus(`${result.reviews.length} avis lu(s). Envoi vers Boost Reviews...`)

    const response = await fetch(`${boostUrl}/api/reviews/import-smart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviews: result.reviews }),
    })
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Boost n'a pas pu importer les avis.")
    }

    setStatus(`${data.imported} avis importé(s) dans Boost Reviews.`)
    await chrome.tabs.create({
      url: `${boostUrl}/widgets/reviews?product_handle=${encodeURIComponent(productHandle)}&extension_reviews=${Date.now()}`,
    })
  } catch (error) {
    setStatus(error.message || String(error), true)
  } finally {
    reviewsButton.disabled = false
  }
}

async function openBoostSuppliers() {
  const boostUrl = cleanBoostUrl(boostUrlInput.value)
  await saveBoostUrl(boostUrl)
  await chrome.tabs.create({ url: `${boostUrl}/suppliers` })
}

sendButton.addEventListener("click", sendProductToBoost)
reviewsButton.addEventListener("click", importReviewsToBoost)
openBoostButton.addEventListener("click", openBoostSuppliers)
loadBoostUrl()
