const DEFAULT_BOOST_URL = "https://boost-app-9e6w.vercel.app"

const boostUrlInput = document.getElementById("boostUrl")
const sendButton = document.getElementById("sendButton")
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

async function saveBoostUrl(boostUrl) {
  await chrome.storage.local.set({ boostUrl })
}

async function loadBoostUrl() {
  const saved = await chrome.storage.local.get("boostUrl")
  boostUrlInput.value = cleanBoostUrl(saved.boostUrl || DEFAULT_BOOST_URL)
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

async function openBoostSuppliers() {
  const boostUrl = cleanBoostUrl(boostUrlInput.value)
  await saveBoostUrl(boostUrl)
  await chrome.tabs.create({ url: `${boostUrl}/suppliers` })
}

sendButton.addEventListener("click", sendProductToBoost)
openBoostButton.addEventListener("click", openBoostSuppliers)
loadBoostUrl()
