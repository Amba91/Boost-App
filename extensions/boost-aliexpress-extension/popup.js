const DEFAULT_BOOST_URL = "https://boost-app-9e6w.vercel.app"

const boostUrlInput = document.getElementById("boostUrl")
const sendButton = document.getElementById("sendButton")
const downloadMediaButton = document.getElementById("downloadMediaButton")
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

async function askContentScriptForReviews(tabId) {
  const message = { type: "BOOST_EXTRACT_ALIEXPRESS_REVIEWS" }
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
  await chrome.storage.local.set({ boostUrl })
}

async function loadBoostUrl() {
  const saved = await chrome.storage.local.get(["boostUrl"])
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

function safeFilePart(value, fallback = "produit-aliexpress") {
  return String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || fallback
}

function extensionFromUrl(url, fallback) {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i)
    return match?.[1]?.toLowerCase() || fallback
  } catch {
    return fallback
  }
}

function downloadUrl(url, filename) {
  return chrome.downloads.download({
    url,
    filename,
    saveAs: false,
    conflictAction: "uniquify",
  })
}

async function downloadProductMedia() {
  downloadMediaButton.disabled = true
  setStatus("Lecture des photos, vidéos et description...")

  try {
    const tab = await getCurrentTab()
    if (!tab?.id || !/aliexpress\./i.test(tab.url || "")) {
      throw new Error("Ouvre d'abord une fiche produit AliExpress.")
    }

    const product = await askContentScriptForProduct(tab.id)
    if (!product?.success) {
      throw new Error(product?.error || "Impossible de lire la fiche AliExpress.")
    }

    const payload = product.payload || {}
    const baseName = safeFilePart(payload.title || payload.external_id)
    const folder = `Boost-AliExpress/${baseName}`
    const images = Array.isArray(payload.image_urls) ? payload.image_urls : []
    const videos = Array.isArray(payload.video_urls) ? payload.video_urls : []
    const description = [
      payload.title || "Produit AliExpress",
      "",
      payload.source_url || tab.url || "",
      "",
      payload.description || "Aucune description détectée.",
    ].join("\n")

    const descriptionUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(description)}`
    await downloadUrl(descriptionUrl, `${folder}/description.txt`)

    for (const [index, imageUrl] of images.entries()) {
      await downloadUrl(
        imageUrl,
        `${folder}/photos/photo-${String(index + 1).padStart(2, "0")}.${extensionFromUrl(imageUrl, "jpg")}`
      )
    }

    for (const [index, videoUrl] of videos.entries()) {
      await downloadUrl(
        videoUrl,
        `${folder}/videos/video-${String(index + 1).padStart(2, "0")}.${extensionFromUrl(videoUrl, "mp4")}`
      )
    }

    setStatus(
      `Téléchargement lancé : ${images.length} photo(s), ${videos.length} vidéo(s) et la description.`
    )
  } catch (error) {
    setStatus(error.message || String(error), true)
  } finally {
    downloadMediaButton.disabled = false
  }
}

async function importReviewsToBoost() {
  const boostUrl = cleanBoostUrl(boostUrlInput.value)
  await saveBoostUrl(boostUrl)

  reviewsButton.disabled = true
  setStatus("Lecture des avis AliExpress visibles...")

  try {
    const tab = await getCurrentTab()
    if (!tab?.id || !/aliexpress\./i.test(tab.url || "")) {
      throw new Error("Ouvre d'abord la fiche AliExpress avec les avis visibles.")
    }

    const result = await askContentScriptForReviews(tab.id)

    if (!result?.success) {
      throw new Error(result?.error || "Impossible de lire les avis visibles.")
    }

    if (!result.reviews.length) {
      throw new Error("Aucun avis visible détecté. Ouvre l'onglet avis AliExpress puis réessaie.")
    }

    setStatus(`${result.reviews.length} avis lu(s). Ouverture de Boost Reviews...`)

    const response = await fetch(`${boostUrl}/api/reviews/extension-import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_url: tab.url,
        product_title: result.productTitle || "",
        reviews: result.reviews,
      }),
    })
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Boost n'a pas pu préparer les avis.")
    }

    setStatus(`${data.reviews_count} avis prêt(s). Choisis le produit dans Boost.`)
    await chrome.tabs.create({
      url: `${boostUrl}/widgets/reviews?extension_reviews_id=${data.import.id}&extension_reviews=${Date.now()}`,
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
downloadMediaButton.addEventListener("click", downloadProductMedia)
reviewsButton.addEventListener("click", importReviewsToBoost)
openBoostButton.addEventListener("click", openBoostSuppliers)
loadBoostUrl()
