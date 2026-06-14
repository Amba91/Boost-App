"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Review = {
  id: number
  shop: string
  product_handle: string
  customer_first_name: string
  customer_last_name: string
  rating: number
  review: string
  image_url: string
  video_url: string
  verified: boolean
  verified_parent: boolean
  verified_purchase: boolean
  visible: boolean
  merchant_reply: string
  featured: boolean
  source?: string
  created_at?: string
}

type ReviewWithVisualNumber = Review & {
  visualNumber: number
}

type ShopifyProduct = {
  id: string
  title: string
  handle: string
  status?: string
  image_url?: string
  price?: string
}

type ImportJob = {
  id: number
  product_handle: string
  source_url: string
  platform: string
  status: string
  imported_count: number
  error_message?: string | null
  created_at: string
  updated_at: string
}

type ExtensionReviewImport = {
  id: number
  source_url: string
  product_title: string
  reviews: Review[]
  status: string
  product_handle?: string
  imported_count?: number
}

type WidgetSettings = {
  title: string
  background_color: string
  star_color: string
  text_color: string
  photo_size: number
  max_reviews: number
  show_arrows: boolean
}

const defaultWidgetSettings: WidgetSettings = {
  title: "Avis de nos clients",
  background_color: "#f0fffb",
  star_color: "#f59e0b",
  text_color: "#111827",
  photo_size: 104,
  max_reviews: 50,
  show_arrows: true,
}

export default function ReviewsPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [smartImporting, setSmartImporting] = useState(false)
  const [urlImporting, setUrlImporting] = useState(false)
  const [importJobsLoading, setImportJobsLoading] = useState(false)
  const [deletingImportJobId, setDeletingImportJobId] = useState<number | null>(
    null
  )
  const [processingImportJobId, setProcessingImportJobId] = useState<
    number | null
  >(null)
  const [savingReviewId, setSavingReviewId] = useState<number | null>(null)
  const [savedReviewIds, setSavedReviewIds] = useState<Record<number, boolean>>(
    {}
  )

  const [importMessage, setImportMessage] = useState("")
  const [smartImportMessage, setSmartImportMessage] = useState("")
  const [urlImportMessage, setUrlImportMessage] = useState("")
  const [reviewUrl, setReviewUrl] = useState("")
  const [importPlatform, setImportPlatform] = useState("auto")
  const [extractionCount, setExtractionCount] = useState(10)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [targetLanguage, setTargetLanguage] = useState("fr")
  const [search, setSearch] = useState("")
  const [visibilityFilter, setVisibilityFilter] = useState("all")
  const [ratingFilter, setRatingFilter] = useState("all")
  const [mediaFilter, setMediaFilter] = useState("all")
  const [activeSection, setActiveSection] = useState<
    "reviews" | "sources" | "customize"
  >("reviews")
  const [reviews, setReviews] = useState<Review[]>([])
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [importJobs, setImportJobs] = useState<ImportJob[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [targetProductHandle, setTargetProductHandle] = useState("")
  const [targetProductTitle, setTargetProductTitle] = useState("")
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(
    defaultWidgetSettings
  )
  const [savingWidgetSettings, setSavingWidgetSettings] = useState(false)
  const [widgetSettingsMessage, setWidgetSettingsMessage] = useState("")
  const [extensionImport, setExtensionImport] =
    useState<ExtensionReviewImport | null>(null)
  const [extensionImporting, setExtensionImporting] = useState(false)
  const [extensionImportMessage, setExtensionImportMessage] = useState("")

  const [form, setForm] = useState({
    product_handle: "",
    customer_first_name: "",
    customer_last_name: "",
    rating: 5,
    review: "",
    merchant_reply: "",
    image_url: "",
    video_url: "",
    verified: true,
    verified_parent: true,
    verified_purchase: true,
  })

  const selectedProduct = products.find(
    (product) => product.handle === targetProductHandle
  )

  const displayedProductTitle =
    selectedProduct?.title || targetProductTitle || targetProductHandle

  const normalizeHandle = (value: string = "") =>
    value
      .toLowerCase()
      .replace(/™/g, "")
      .replace(/â„¢/g, "")
      .trim()

  const productReviews = reviews.filter((item) => {
    const matchesSelectedProduct = targetProductHandle
      ? normalizeHandle(item.product_handle) ===
        normalizeHandle(targetProductHandle)
      : true

    return matchesSelectedProduct
  })

  const numberedProductReviews: ReviewWithVisualNumber[] = productReviews.map(
    (review, index) => ({
      ...review,
      visualNumber: index + 1,
    })
  )

  const publishedReviewsCount = productReviews.filter(
    (item) => item.visible
  ).length
  const hiddenReviewsCount = productReviews.length - publishedReviewsCount
  const featuredReviewsCount = productReviews.filter(
    (item) => item.featured
  ).length
  const storefrontReviews = reviews.filter(
    (item) => item.source === "storefront"
  )
  const pendingStorefrontReviews = storefrontReviews.filter(
    (item) => item.source === "storefront" && !item.visible
  )

  const platformOrder = [
    "storefront",
    "aliexpress",
    "amazon",
    "loox",
    "judge_me",
    "ryviu",
    "manual",
    "other",
  ]

  function getPlatformKey(item: Review) {
    const source = String(item.source || "").toLowerCase()
    if (source.includes("storefront")) return "storefront"
    if (source.includes("aliexpress")) return "aliexpress"
    if (source.includes("amazon")) return "amazon"
    if (source.includes("loox")) return "loox"
    if (source.includes("judge")) return "judge_me"
    if (source.includes("ryviu")) return "ryviu"
    if (source.includes("manual")) return "manual"
    return "other"
  }

  function platformLabel(platform: string) {
    const labels: Record<string, string> = {
      storefront: "Avis boutique",
      aliexpress: "AliExpress",
      amazon: "Amazon",
      loox: "Loox",
      judge_me: "Judge.me",
      ryviu: "Ryviu",
      manual: "Ajout manuel / CSV",
      other: "Autres imports",
    }

    return labels[platform] || platform
  }

  const filteredReviews = numberedProductReviews.filter((item) => {
    const query = search.toLowerCase().trim()

    if (visibilityFilter === "published" && !item.visible) return false
    if (visibilityFilter === "hidden" && item.visible) return false
    if (visibilityFilter === "featured" && !item.featured) return false
    if (ratingFilter !== "all" && item.rating !== Number(ratingFilter)) {
      return false
    }
    if (mediaFilter === "with_media" && !item.image_url && !item.video_url) {
      return false
    }
    if (mediaFilter === "without_media" && (item.image_url || item.video_url)) {
      return false
    }

    if (!query) return true

    const matchesSearch =
      String(item.visualNumber).includes(query) ||
      String(item.id).includes(query) ||
      item.product_handle?.toLowerCase().includes(query) ||
      item.customer_first_name?.toLowerCase().includes(query) ||
      item.customer_last_name?.toLowerCase().includes(query) ||
      item.review?.toLowerCase().includes(query)

    return matchesSearch
  })

  const groupedFilteredReviews = platformOrder
    .map((platform) => ({
      platform,
      reviews: filteredReviews.filter(
        (review) => getPlatformKey(review) === platform
      ),
    }))
    .filter((group) => group.reviews.length > 0)

  const filteredImportJobs = importJobs.filter((job) => {
    if (!targetProductHandle) return true

    return (
      normalizeHandle(job.product_handle) === normalizeHandle(targetProductHandle)
    )
  })

  function selectTargetProduct(handle: string) {
    const product = products.find((item) => item.handle === handle)

    setTargetProductHandle(handle)
    setTargetProductTitle(product?.title || "")
    setForm((current) => ({
      ...current,
      product_handle: handle,
    }))
  }

  function formatDate(value: string) {
    if (!value) return "Date inconnue"

    try {
      return new Date(value).toLocaleString("fr-FR")
    } catch {
      return value
    }
  }

  async function loadWidget() {
    const res = await fetch("/api/widgets/reviews")
    const data = await res.json()
    setActive(data.active)
  }

  async function loadWidgetSettings() {
    try {
      const res = await fetch("/api/reviews/widget-settings")
      const data = await res.json()

      if (data.success && data.settings) {
        setWidgetSettings({
          ...defaultWidgetSettings,
          ...data.settings,
        })
      }
    } catch (error) {
      console.error("LOAD WIDGET SETTINGS ERROR:", error)
    }
  }

  async function saveWidgetSettings() {
    setSavingWidgetSettings(true)
    setWidgetSettingsMessage("")

    try {
      const res = await fetch("/api/reviews/widget-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(widgetSettings),
      })
      const data = await res.json()

      if (!data.success) {
        setWidgetSettingsMessage(data.error || "Erreur pendant l’enregistrement.")
      } else {
        setWidgetSettings({ ...defaultWidgetSettings, ...data.settings })
        setWidgetSettingsMessage("Personnalisation enregistrée.")
      }
    } catch (error) {
      console.error("SAVE WIDGET SETTINGS ERROR:", error)
      setWidgetSettingsMessage("Erreur pendant l’enregistrement.")
    }

    setSavingWidgetSettings(false)
  }

  async function loadReviews() {
    const res = await fetch("/api/reviews/admin")
    const data = await res.json()
    setReviews(data.reviews || [])
  }

  async function loadImportJobs() {
    setImportJobsLoading(true)

    try {
      const res = await fetch("/api/reviews/import-jobs")
      const data = await res.json()

      if (data.success && Array.isArray(data.jobs)) {
        setImportJobs(data.jobs)
      } else {
        setImportJobs([])
      }
    } catch (error) {
      console.error("LOAD IMPORT JOBS ERROR:", error)
      setImportJobs([])
    }

    setImportJobsLoading(false)
  }

  async function loadProducts() {
    setProductsLoading(true)

    try {
      const res = await fetch("/api/products/list")
      const data = await res.json()

      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error("LOAD PRODUCTS ERROR:", error)
      setProducts([])
    }

    setProductsLoading(false)
  }

  async function loadExtensionImport(id: number) {
    setExtensionImportMessage("")

    try {
      const res = await fetch(`/api/reviews/extension-import?id=${id}`, {
        cache: "no-store",
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setExtensionImportMessage(
          data.error || "Impossible de retrouver les avis envoyés par l’extension."
        )
        return
      }

      setExtensionImport(data.import)
      setExtensionImportMessage(
        `${data.import.reviews?.length || 0} avis AliExpress récupéré(s). Choisis le produit Shopify puis importe.`
      )
    } catch (error) {
      console.error("LOAD EXTENSION REVIEWS ERROR:", error)
      setExtensionImportMessage(
        "Impossible de charger les avis envoyés par l’extension."
      )
    }
  }

  async function confirmExtensionReviewsImport() {
    if (!extensionImport?.id) return

    if (!targetProductHandle) {
      setExtensionImportMessage(
        "Choisis d’abord le produit Shopify qui doit recevoir ces avis."
      )
      return
    }

    setExtensionImporting(true)
    setExtensionImportMessage("Import des avis sur le produit sélectionné...")

    try {
      const res = await fetch("/api/reviews/extension-import", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: extensionImport.id,
          product_handle: targetProductHandle,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setExtensionImportMessage(
          data.error || "Impossible d’importer ces avis."
        )
        return
      }

      setExtensionImport(null)
      setExtensionImportMessage(
        `${data.imported} avis importé(s) sur ${displayedProductTitle}.`
      )
      await loadReviews()
    } catch (error) {
      console.error("CONFIRM EXTENSION REVIEWS ERROR:", error)
      setExtensionImportMessage("Impossible d’importer ces avis.")
    } finally {
      setExtensionImporting(false)
    }
  }

  async function toggleWidget() {
    setLoading(true)
    const newState = !active

    await fetch("/api/widgets/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newState }),
    })

    setActive(newState)
    setLoading(false)
  }

  async function uploadImage(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/reviews/upload-image", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    if (!data.success) {
      alert("Erreur upload image")
      return ""
    }

    return data.url
  }

  async function handleNewImageUpload(file?: File) {
    if (!file) return
    setUploading(true)

    const url = await uploadImage(file)

    if (url) {
      setForm({ ...form, image_url: url })
    }

    setUploading(false)
  }

  async function handleExistingImageUpload(id: number, file?: File) {
    if (!file) return
    setUploading(true)

    const url = await uploadImage(file)

    if (url) {
      updateLocalReview(id, "image_url", url)
    }

    setUploading(false)
  }

  async function importCSV(file?: File) {
    if (!file) return

    if (!targetProductHandle.trim()) {
      alert("Choisis un produit depuis la page Produits avant d’importer les avis.")
      return
    }

    setImporting(true)
    setImportMessage("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("target_product_handle", targetProductHandle.trim())

    const res = await fetch("/api/reviews/import", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    if (data.success) {
      setImportMessage(
        `${data.imported} avis importé(s) avec succès. ${data.skipped || 0} avis ignoré(s).`
      )
      await loadReviews()
    } else {
      setImportMessage("Erreur pendant l’import CSV.")
    }

    setImporting(false)
  }

  async function importSmartJSON(file?: File) {
    if (!file) return

    if (!targetProductHandle.trim()) {
      alert("Choisis un produit depuis la page Produits avant d’importer les avis.")
      return
    }

    setSmartImporting(true)
    setSmartImportMessage("")

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      const reviewsToImport = Array.isArray(parsed) ? parsed : parsed.reviews

      if (!Array.isArray(reviewsToImport)) {
        setSmartImportMessage(
          "Format invalide. Le fichier doit contenir un tableau d’avis ou un objet { reviews: [...] }."
        )
        setSmartImporting(false)
        return
      }

      const reviewsWithTargetProduct = reviewsToImport.map((review: any) => ({
        ...review,
        product_handle: review.product_handle || targetProductHandle,
      }))

      const res = await fetch("/api/reviews/import-smart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviews: reviewsWithTargetProduct,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSmartImportMessage(
          `${data.imported} avis importé(s) avec succès. ${data.skipped || 0} avis ignoré(s).`
        )
        await loadReviews()
      } else {
        setSmartImportMessage(
          data.error || "Erreur pendant l’import intelligent."
        )
      }
    } catch (error) {
      console.error("SMART IMPORT JSON ERROR:", error)
      setSmartImportMessage("Erreur : le fichier JSON est invalide.")
    }

    setSmartImporting(false)
  }
    async function importFromUrl() {
    if (!targetProductHandle.trim()) {
      alert("Choisis un produit depuis la page Produits avant d’importer les avis.")
      return
    }

    if (!reviewUrl.trim()) {
      alert("Colle d’abord un lien Amazon, AliExpress ou autre.")
      return
    }

    setUrlImporting(true)
    setUrlImportMessage("")

    try {
      const res = await fetch("/api/reviews/import-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_handle: targetProductHandle,
          url: reviewUrl,
          platform: importPlatform,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setUrlImportMessage("")
        setReviewUrl("")
        await loadImportJobs()
      } else {
        setUrlImportMessage(data.error || "Erreur pendant l’analyse du lien.")
      }
    } catch (error) {
      console.error("IMPORT URL ERROR:", error)
      setUrlImportMessage("Erreur pendant l’import par lien.")
    }

    setUrlImporting(false)
  }

  async function createReview() {
    const productHandle = targetProductHandle || form.product_handle

    if (!productHandle || !form.review) {
      alert("Produit et avis obligatoires")
      return
    }

    await fetch("/api/reviews/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "kiidiiz.com",
        ...form,
        product_handle: productHandle,
      }),
    })

    setForm({
      product_handle: productHandle,
      customer_first_name: "",
      customer_last_name: "",
      rating: 5,
      review: "",
      merchant_reply: "",
      image_url: "",
      video_url: "",
      verified: true,
      verified_parent: true,
      verified_purchase: true,
    })

    loadReviews()
  }

  async function updateReview(review: Review) {
    setSavingReviewId(review.id)

    try {
      const res = await fetch("/api/reviews/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      })

      const data = await res.json()

      if (!data.success) {
        alert(data.error || "Erreur pendant l’enregistrement.")
      } else {
        setSavedReviewIds((current) => ({
          ...current,
          [review.id]: true,
        }))
        await loadReviews()
      }
    } catch (error) {
      console.error("UPDATE REVIEW ERROR:", error)
      alert("Erreur pendant l’enregistrement.")
    }

    setSavingReviewId(null)
  }

  async function publishStorefrontReview(review: Review) {
    await updateReview({ ...review, visible: true })
  }

  async function deleteReview(id: number) {
    if (!confirm("Supprimer cet avis définitivement ?")) return

    await fetch("/api/reviews/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    })

    loadReviews()
  }

  async function bulkReviewAction(
    action: "show_all" | "hide_all" | "delete_hidden"
  ) {
    if (!targetProductHandle) {
      alert("Choisis d’abord un produit.")
      return
    }

    if (
      action === "delete_hidden" &&
      !confirm("Supprimer tous les avis masqués de ce produit ?")
    ) {
      return
    }

    try {
      const res = await fetch("/api/reviews/bulk-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_handle: targetProductHandle,
          action,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        alert(data.error || "Erreur pendant l’action groupée.")
        return
      }

      alert(data.message)
      await loadReviews()
    } catch (error) {
      console.error("BULK REVIEW ACTION ERROR:", error)
      alert("Erreur pendant l’action groupée.")
    }
  }

  async function deleteImportJob(jobId: number) {
    if (
      !confirm(
        "Supprimer cet import et tous les avis associés à cet import ?"
      )
    ) {
      return
    }

    setDeletingImportJobId(jobId)

    try {
      const res = await fetch("/api/reviews/import-jobs/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: jobId }),
      })

      const data = await res.json()

      if (!data.success) {
        alert(data.error || "Erreur pendant la suppression de l’import.")
      }

      await loadImportJobs()
      await loadReviews()
    } catch (error) {
      console.error("DELETE IMPORT JOB ERROR:", error)
      alert("Erreur pendant la suppression de l’import.")
    }

    setDeletingImportJobId(null)
  }

  async function processImportJob(jobId: number) {
    setProcessingImportJobId(jobId)

    try {
      const res = await fetch("/api/reviews/import-jobs/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: jobId,
          count: extractionCount,
          ai_enabled: aiEnabled,
          target_language: targetLanguage,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        alert(data.error || "Erreur pendant l’extraction.")
      }

      await loadImportJobs()
      await loadReviews()
    } catch (error) {
      console.error("PROCESS IMPORT JOB ERROR:", error)
      alert("Erreur pendant l’extraction.")
    }

    setProcessingImportJobId(null)
  }

  function updateLocalReview(id: number, field: keyof Review, value: any) {
    setSavedReviewIds((current) => ({
      ...current,
      [id]: false,
    }))

    setReviews((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  function getReviewButtonText(id: number) {
    if (savingReviewId === id) return "Enregistrement..."
    if (savedReviewIds[id]) return "Modifications enregistrées"
    return "Enregistrer les modifications"
  }

  useEffect(() => {
    document.documentElement.style.height = "auto"
    document.documentElement.style.overflowY = "auto"
    document.body.style.height = "auto"
    document.body.style.overflowY = "auto"

    return () => {
      document.documentElement.style.height = ""
      document.documentElement.style.overflowY = ""
      document.body.style.height = ""
      document.body.style.overflowY = ""
    }
  }, [])

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search)
      const productHandle = params.get("product_handle") || ""
      const productTitle = params.get("product_title") || ""
      const extensionReviewsId = Number(params.get("extension_reviews_id") || 0)

      if (productHandle) {
        setTargetProductHandle(productHandle)
        setTargetProductTitle(productTitle)
        setForm((current) => ({
          ...current,
          product_handle: productHandle,
        }))
      }

      await loadWidget()
      await loadWidgetSettings()
      await loadReviews()
      await loadProducts()
      if (extensionReviewsId) {
        setActiveSection("sources")
        await loadExtensionImport(extensionReviewsId)
      }
      await loadImportJobs()
      setLoading(false)
    }

    init()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/products" style={styles.back}>
        ← Retour aux produits
      </Link>

      <h1 style={styles.title}>Avis clients</h1>

      <div style={styles.sectionTabs}>
        {[
          ["reviews", "Avis"],
          ["sources", "Sources / imports"],
          ["customize", "Personnalisation"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveSection(key as typeof activeSection)}
            style={{
              ...styles.sectionTab,
              ...(activeSection === key ? styles.sectionTabActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {targetProductHandle && (
        <div style={styles.selectedProductCard}>
          <p style={styles.selectedLabel}>Produit sélectionné</p>
          <h2 style={styles.selectedTitle}>{displayedProductTitle}</h2>
          <p style={styles.handle}>{targetProductHandle}</p>
          <p style={styles.muted}>
            Avis associés à ce produit : <strong>{productReviews.length}</strong>
          </p>
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <strong style={{ color: "#22c55e" }}>{publishedReviewsCount}</strong>
              <span>Publiés</span>
            </div>
            <div style={styles.statBox}>
              <strong style={{ color: "#f59e0b" }}>{hiddenReviewsCount}</strong>
              <span>Masqués</span>
            </div>
            <div style={styles.statBox}>
              <strong style={{ color: "#a78bfa" }}>{featuredReviewsCount}</strong>
              <span>Mis en premier</span>
            </div>
          </div>
        </div>
      )}

      {activeSection === "sources" && (extensionImport || extensionImportMessage) && (
        <div style={styles.extensionImportCard}>
          <p style={styles.pendingLabel}>AVIS ALIEXPRESS</p>
          <h2 style={{ margin: "6px 0" }}>
            Avis envoyés par l’extension Boost
          </h2>
          <p style={styles.muted}>
            Choisis simplement le produit Shopify qui doit recevoir ces avis.
            Boost s’occupe du reste.
          </p>

          {extensionImport && (
            <>
              <div style={styles.extensionImportInfo}>
                <strong>{extensionImport.reviews?.length || 0} avis prêts</strong>
                <span>
                  Produit AliExpress :{" "}
                  {extensionImport.product_title || "titre non détecté"}
                </span>
                {extensionImport.source_url && (
                  <a
                    href={extensionImport.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.inlineLink}
                  >
                    Voir la page source
                  </a>
                )}
              </div>

              {products.length > 0 ? (
                <select
                  value={targetProductHandle}
                  onChange={(e) => selectTargetProduct(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Choisir le produit Shopify à lier</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.handle}>
                      {product.title} — {product.handle}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  placeholder={
                    productsLoading
                      ? "Chargement des produits Shopify..."
                      : "Produit Shopify à lier"
                  }
                  value={targetProductHandle}
                  onChange={(e) => selectTargetProduct(e.target.value)}
                  style={styles.input}
                />
              )}

              <button
                onClick={confirmExtensionReviewsImport}
                disabled={extensionImporting || !targetProductHandle}
                style={styles.button}
              >
                {extensionImporting
                  ? "Import en cours..."
                  : "Importer ces avis sur ce produit"}
              </button>
            </>
          )}

          {extensionImportMessage && (
            <p
              style={
                extensionImportMessage.toLowerCase().includes("impossible") ||
                extensionImportMessage.toLowerCase().includes("choisis")
                  ? styles.error
                  : styles.success
              }
            >
              {extensionImportMessage}
            </p>
          )}
        </div>
      )}

      {activeSection === "reviews" && (
      <div style={styles.pendingReviewsCard}>
        <div style={styles.pendingReviewsHeader}>
          <div>
            <p style={styles.pendingLabel}>À TRAITER EN PRIORITÉ</p>
            <h2 style={{ margin: "6px 0" }}>Avis clients de la boutique</h2>
            <p style={{ ...styles.muted, margin: 0 }}>
              Ces avis viennent directement du formulaire de ta fiche produit.
            </p>
          </div>
          <strong style={styles.pendingCount}>
            {pendingStorefrontReviews.length} à traiter
          </strong>
        </div>

        {storefrontReviews.length === 0 ? (
          <p style={styles.pendingEmpty}>Aucun avis reçu depuis la boutique.</p>
        ) : (
          storefrontReviews.map((item) => (
            <div key={item.id} style={styles.pendingReviewItem}>
              <div style={styles.reviewHeader}>
                <span>
                  {item.customer_first_name} {item.customer_last_name} ·{" "}
                  {item.rating}/5
                </span>
                <span>
                  {item.visible ? "Publié" : "En attente"} · {item.product_handle}
                </span>
              </div>

              <p style={styles.pendingReviewText}>{item.review}</p>

              {item.image_url && (
                <a href={item.image_url} target="_blank" rel="noreferrer">
                  <img
                    src={item.image_url}
                    alt="Photo envoyée avec l’avis"
                    style={styles.preview}
                  />
                </a>
              )}

              <div style={styles.pendingActions}>
                <button
                  onClick={() =>
                    item.visible
                      ? updateReview({ ...item, visible: false })
                      : publishStorefrontReview(item)
                  }
                  disabled={savingReviewId === item.id}
                  style={
                    item.visible ? styles.unpublishButton : styles.publishButton
                  }
                >
                  {savingReviewId === item.id
                    ? "Enregistrement..."
                    : item.visible
                    ? "Masquer cet avis"
                    : "Publier cet avis"}
                </button>
                <button
                  onClick={() => deleteReview(item.id)}
                  style={styles.rejectButton}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {activeSection === "customize" && (
      <div style={styles.card}>
        <p style={styles.muted}>
          Active ou désactive l’affichage des avis sur les fiches produits.
        </p>

        <p style={{ ...styles.status, color: active ? "#22c55e" : "#ef4444" }}>
          Statut : {active ? "ACTIF" : "INACTIF"}
        </p>

        <button
          onClick={toggleWidget}
          disabled={loading}
          style={{
            ...styles.button,
            background: active ? "#dc2626" : "#7c3aed",
          }}
        >
          {loading
            ? "Chargement..."
            : active
            ? "Désactiver Reviews"
            : "Activer Reviews"}
        </button>
      </div>
      )}

      {activeSection === "customize" && (
      <div style={styles.cardWide}>
        <h2>Personnaliser l’affichage</h2>
        <p style={styles.muted}>
          Ces choix s’appliquent automatiquement aux fiches produits Shopify.
        </p>

        <label style={styles.fieldLabel}>Titre du bloc</label>
        <input
          value={widgetSettings.title}
          onChange={(e) =>
            setWidgetSettings({ ...widgetSettings, title: e.target.value })
          }
          style={styles.input}
        />

        <div style={styles.settingsGrid}>
          <label style={styles.colorField}>
            <span>Couleur du fond</span>
            <input
              type="color"
              value={widgetSettings.background_color}
              onChange={(e) =>
                setWidgetSettings({
                  ...widgetSettings,
                  background_color: e.target.value,
                })
              }
              style={styles.colorInput}
            />
          </label>

          <label style={styles.colorField}>
            <span>Couleur des étoiles</span>
            <input
              type="color"
              value={widgetSettings.star_color}
              onChange={(e) =>
                setWidgetSettings({
                  ...widgetSettings,
                  star_color: e.target.value,
                })
              }
              style={styles.colorInput}
            />
          </label>

          <label style={styles.colorField}>
            <span>Couleur du texte</span>
            <input
              type="color"
              value={widgetSettings.text_color}
              onChange={(e) =>
                setWidgetSettings({
                  ...widgetSettings,
                  text_color: e.target.value,
                })
              }
              style={styles.colorInput}
            />
          </label>
        </div>

        <div style={styles.settingsGrid}>
          <label style={styles.fieldLabel}>
            Taille des photos
            <select
              value={widgetSettings.photo_size}
              onChange={(e) =>
                setWidgetSettings({
                  ...widgetSettings,
                  photo_size: Number(e.target.value),
                })
              }
              style={styles.input}
            >
              <option value={80}>Petite</option>
              <option value={104}>Moyenne</option>
              <option value={140}>Grande</option>
            </select>
          </label>

          <label style={styles.fieldLabel}>
            Nombre maximum d’avis
            <input
              type="number"
              min={1}
              max={100}
              value={widgetSettings.max_reviews}
              onChange={(e) =>
                setWidgetSettings({
                  ...widgetSettings,
                  max_reviews: Number(e.target.value),
                })
              }
              style={styles.input}
            />
          </label>
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={widgetSettings.show_arrows}
            onChange={(e) =>
              setWidgetSettings({
                ...widgetSettings,
                show_arrows: e.target.checked,
              })
            }
          />{" "}
          Afficher les flèches du carrousel
        </label>

        <div
          style={{
            ...styles.widgetPreview,
            background: widgetSettings.background_color,
            color: widgetSettings.text_color,
          }}
        >
          <strong>{widgetSettings.title || "Avis de nos clients"}</strong>
          <div style={{ color: widgetSettings.star_color }}>★★★★★</div>
          <p style={{ marginBottom: 0 }}>Très bon produit, je recommande.</p>
        </div>

        <button
          onClick={saveWidgetSettings}
          disabled={savingWidgetSettings}
          style={styles.button}
        >
          {savingWidgetSettings
            ? "Enregistrement..."
            : "Enregistrer la personnalisation"}
        </button>

        {widgetSettingsMessage && (
          <p
            style={
              widgetSettingsMessage.toLowerCase().includes("erreur")
                ? styles.error
                : styles.success
            }
          >
            {widgetSettingsMessage}
          </p>
        )}
      </div>
      )}

      {activeSection === "sources" && (
      <div style={styles.card}>
        <h2>Import / Export CSV</h2>

        <p style={styles.muted}>
          Les avis importés seront associés automatiquement au produit sélectionné.
        </p>

        {products.length > 0 ? (
          <select
            value={targetProductHandle}
            onChange={(e) => selectTargetProduct(e.target.value)}
            style={styles.input}
          >
            <option value="">Choisir un produit Shopify</option>
            {products.map((product) => (
              <option key={product.id} value={product.handle}>
                {product.title} — {product.handle}
              </option>
            ))}
          </select>
        ) : (
          <input
            placeholder={
              productsLoading
                ? "Chargement des produits Shopify..."
                : "Handle du produit cible"
            }
            value={targetProductHandle}
            onChange={(e) => selectTargetProduct(e.target.value)}
            style={styles.input}
          />
        )}

        <p style={styles.helper}>
          Produit cible actuel :{" "}
          <strong>{targetProductHandle || "aucun produit sélectionné"}</strong>
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => importCSV(e.target.files?.[0])}
          style={styles.file}
        />

        {importMessage && (
          <p
            style={
              importMessage.toLowerCase().includes("erreur")
                ? styles.error
                : styles.success
            }
          >
            {importMessage}
          </p>
        )}

        <a href="/api/reviews/export" style={styles.exportLink}>
          Télécharger les avis en CSV
        </a>

        {importing && <p style={styles.muted}>Import en cours...</p>}
      </div>
      )}

      {activeSection === "sources" && (
      <div style={styles.card}>
        <h2>Import intelligent JSON</h2>

        <p style={styles.muted}>
          Importe des avis venant d’Amazon, AliExpress, Loox, Judge.me ou Ryviu
          à partir d’un fichier JSON normalisé.
        </p>

        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => importSmartJSON(e.target.files?.[0])}
          style={styles.file}
        />

        {smartImportMessage && (
          <p
            style={
              smartImportMessage.toLowerCase().includes("erreur") ||
              smartImportMessage.toLowerCase().includes("invalide")
                ? styles.error
                : styles.success
            }
          >
            {smartImportMessage}
          </p>
        )}

        {smartImporting && (
          <p style={styles.muted}>Import intelligent en cours...</p>
        )}
      </div>
      )}

      {activeSection === "sources" && (
      <div style={styles.card}>
        <h2>Import par lien</h2>

        <p style={styles.muted}>
          Pour Amazon et AliExpress, colle le lien du produit. Pour Loox,
          Judge.me ou Ryviu, colle la page publique du produit où les avis sont
          visibles.
        </p>

        <select
          value={importPlatform}
          onChange={(e) => setImportPlatform(e.target.value)}
          style={styles.input}
        >
          <option value="auto">Détection automatique</option>
          <option value="amazon">Amazon</option>
          <option value="aliexpress">AliExpress</option>
          <option value="loox">Loox</option>
          <option value="judge_me">Judge.me</option>
          <option value="ryviu">Ryviu</option>
        </select>

        <input
          placeholder="Colle ici le lien du produit ou des avis..."
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={importFromUrl}
          disabled={urlImporting}
          style={styles.button}
        >
          {urlImporting ? "Analyse du lien..." : "Importer depuis ce lien"}
        </button>

        {urlImportMessage && (
          <p style={styles.error}>{urlImportMessage}</p>
        )}
      </div>
      )}

      {activeSection === "sources" && (
      <div style={styles.cardWide}>
        <h2>Historique des imports par lien</h2>

        {targetProductHandle && (
          <div style={styles.aiBox}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
              />{" "}
              Utiliser l’IA OpenAI pour traduire, corriger et améliorer les avis
            </label>

            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={!aiEnabled}
              style={styles.input}
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="es">Espagnol</option>
              <option value="de">Allemand</option>
              <option value="it">Italien</option>
              <option value="ar">Arabe</option>
            </select>
          </div>
        )}

        {importJobsLoading && (
          <p style={styles.muted}>Chargement de l’historique...</p>
        )}

        {!importJobsLoading && filteredImportJobs.length === 0 && (
          <p style={styles.muted}>Aucun import par lien pour ce produit.</p>
        )}

        {filteredImportJobs.map((job) => (
          <div key={job.id} style={styles.jobCard}>
            <div style={styles.jobHeader}>
              <span>Import #{job.id}</span>

              <span
                style={{
                  ...styles.statusBadge,
                  background:
                    job.status === "completed"
                      ? "#16a34a"
                      : job.status === "failed"
                      ? "#dc2626"
                      : job.status === "processing"
                      ? "#2563eb"
                      : "#7c3aed",
                }}
              >
                {job.status}
              </span>
            </div>

            <p style={styles.helper}>
              Plateforme : <strong>{job.platform}</strong>
            </p>

            <p style={styles.helper}>
              Produit : <strong>{job.product_handle}</strong>
            </p>

            <p style={styles.helper}>
              Avis importés : <strong>{job.imported_count || 0}</strong>
            </p>

            <p style={styles.helper}>
              Date : <strong>{formatDate(job.created_at)}</strong>
            </p>

            {job.error_message && (
              <p style={styles.error}>Erreur : {job.error_message}</p>
            )}

            {job.status !== "completed" && (
              <select
                value={extractionCount}
                onChange={(e) => setExtractionCount(Number(e.target.value))}
                style={styles.input}
              >
                <option value={10}>Extraire 10 avis</option>
                <option value={20}>Extraire 20 avis</option>
                <option value={50}>Extraire 50 avis</option>
                <option value={100}>Extraire 100 avis</option>
              </select>
            )}

            <button
              onClick={() => processImportJob(job.id)}
              disabled={
                processingImportJobId === job.id || job.status === "completed"
              }
              style={{
                ...styles.processButton,
                background:
                  job.status === "completed"
                    ? "#16a34a"
                    : job.status === "processing"
                    ? "#2563eb"
                    : "#2563eb",
              }}
            >
              {processingImportJobId === job.id
                ? "Extraction..."
                : job.status === "completed"
                ? "Extraction terminée"
                : "Lancer l’extraction"}
            </button>

            <a
              href={job.source_url}
              target="_blank"
              rel="noreferrer"
              style={styles.sourceLink}
            >
              Ouvrir le lien source
            </a>

            <button
              onClick={() => deleteImportJob(job.id)}
              disabled={deletingImportJobId === job.id}
              style={styles.deleteImportButton}
            >
              {deletingImportJobId === job.id
                ? "Suppression..."
                : "Supprimer cet import et ses avis"}
            </button>
          </div>
        ))}
      </div>
      )}

      {activeSection === "reviews" && (
      <div style={styles.card}>
        <h2>Ajouter un avis</h2>

        <input
          placeholder="Produit sélectionné automatiquement"
          value={targetProductHandle || form.product_handle}
          onChange={(e) =>
            setForm({ ...form, product_handle: e.target.value })
          }
          disabled={Boolean(targetProductHandle)}
          style={styles.input}
        />

        <input
          placeholder="Prénom"
          value={form.customer_first_name}
          onChange={(e) =>
            setForm({ ...form, customer_first_name: e.target.value })
          }
          style={styles.input}
        />

        <input
          placeholder="Nom"
          value={form.customer_last_name}
          onChange={(e) =>
            setForm({ ...form, customer_last_name: e.target.value })
          }
          style={styles.input}
        />

        <select
          value={form.rating}
          onChange={(e) =>
            setForm({ ...form, rating: Number(e.target.value) })
          }
          style={styles.input}
        >
          <option value={5}>5 étoiles</option>
          <option value={4}>4 étoiles</option>
          <option value={3}>3 étoiles</option>
          <option value={2}>2 étoiles</option>
          <option value={1}>1 étoile</option>
        </select>

        <textarea
          placeholder="Texte de l’avis"
          value={form.review}
          onChange={(e) => setForm({ ...form, review: e.target.value })}
          style={styles.textarea}
        />

        <textarea
          placeholder="Réponse du marchand"
          value={form.merchant_reply}
          onChange={(e) =>
            setForm({ ...form, merchant_reply: e.target.value })
          }
          style={styles.textarea}
        />

        <input
          placeholder="URL image client"
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          style={styles.input}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleNewImageUpload(e.target.files?.[0])}
          style={styles.file}
        />

        {form.image_url && (
          <img src={form.image_url} alt="Aperçu" style={styles.preview} />
        )}

        <button onClick={createReview} style={styles.button}>
          {uploading ? "Upload en cours..." : "Ajouter l’avis"}
        </button>
      </div>
      )}

      {activeSection === "reviews" && (
      <div style={styles.cardWide}>
        <h2>
          Avis existants{" "}
          {targetProductHandle && `— ${productReviews.length} avis`}
        </h2>

        {targetProductHandle && (
          <div style={styles.bulkActions}>
            <button
              onClick={() => bulkReviewAction("show_all")}
              style={styles.bulkButton}
            >
              Tout afficher
            </button>

            <button
              onClick={() => bulkReviewAction("hide_all")}
              style={{
                ...styles.bulkButton,
                background: "#7c3aed",
              }}
            >
              Tout masquer
            </button>

            <button
              onClick={() => bulkReviewAction("delete_hidden")}
              style={{
                ...styles.bulkButton,
                background: "#dc2626",
              }}
            >
              Supprimer les avis masqués
            </button>
          </div>
        )}

        <input
          placeholder="Rechercher par numéro, prénom, nom, produit ou texte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        <div style={styles.filtersGrid}>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            style={styles.input}
          >
            <option value="all">Tous les avis</option>
            <option value="published">Publiés seulement</option>
            <option value="hidden">Masqués seulement</option>
            <option value="featured">Mis en premier</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={styles.input}
          >
            <option value="all">Toutes les notes</option>
            <option value="5">5 étoiles</option>
            <option value="4">4 étoiles</option>
            <option value="3">3 étoiles</option>
            <option value="2">2 étoiles</option>
            <option value="1">1 étoile</option>
          </select>

          <select
            value={mediaFilter}
            onChange={(e) => setMediaFilter(e.target.value)}
            style={styles.input}
          >
            <option value="all">Avec ou sans média</option>
            <option value="with_media">Avec photo ou vidéo</option>
            <option value="without_media">Sans média</option>
          </select>
        </div>

        <p style={styles.helper}>
          {filteredReviews.length} avis affiché(s) avec ces filtres.
        </p>

        {filteredReviews.length === 0 && (
          <p style={styles.muted}>Aucun avis trouvé pour ce produit.</p>
        )}

        {groupedFilteredReviews.map((group) => (
          <section key={group.platform} style={styles.platformSection}>
            <div style={styles.platformHeader}>
              <h3 style={styles.platformTitle}>{platformLabel(group.platform)}</h3>
              <span style={styles.platformCount}>
                {group.reviews.length} avis
              </span>
            </div>

            {group.reviews.map((item) => (
          <div key={item.id} style={styles.reviewCard}>
            <div style={styles.reviewHeader}>
              <span>
                Avis #{item.visualNumber} {item.featured ? "· En premier" : ""}
              </span>
              <span>
                {item.visible ? "Visible" : "Masqué"} ·{" "}
                {item.customer_first_name} {item.customer_last_name}
              </span>
            </div>

            <input
              value={item.product_handle || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "product_handle", e.target.value)
              }
              style={styles.input}
            />

            <div style={styles.row}>
              <input
                value={item.customer_first_name || ""}
                onChange={(e) =>
                  updateLocalReview(
                    item.id,
                    "customer_first_name",
                    e.target.value
                  )
                }
                style={styles.input}
              />

              <input
                value={item.customer_last_name || ""}
                onChange={(e) =>
                  updateLocalReview(
                    item.id,
                    "customer_last_name",
                    e.target.value
                  )
                }
                style={styles.input}
              />
            </div>

            <select
              value={item.rating || 5}
              onChange={(e) =>
                updateLocalReview(item.id, "rating", Number(e.target.value))
              }
              style={styles.input}
            >
              <option value={5}>5 étoiles</option>
              <option value={4}>4 étoiles</option>
              <option value={3}>3 étoiles</option>
              <option value={2}>2 étoiles</option>
              <option value={1}>1 étoile</option>
            </select>

            <textarea
              value={item.review || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "review", e.target.value)
              }
              style={styles.textarea}
            />

            <textarea
              placeholder="Réponse du marchand"
              value={item.merchant_reply || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "merchant_reply", e.target.value)
              }
              style={styles.textarea}
            />

            <input
              placeholder="URL image"
              value={item.image_url || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "image_url", e.target.value)
              }
              style={styles.input}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleExistingImageUpload(item.id, e.target.files?.[0])
              }
              style={styles.file}
            />

            {item.image_url && (
              <a
                href={item.image_url}
                target="_blank"
                rel="noreferrer"
                style={styles.mediaLink}
              >
                <img
                  src={item.image_url}
                  alt="Photo de l’avis client"
                  style={styles.preview}
                />
              </a>
            )}

            <input
              placeholder="URL vidéo"
              value={item.video_url || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "video_url", e.target.value)
              }
              style={styles.input}
            />

            {item.video_url && (
              <video
                src={item.video_url}
                controls
                preload="metadata"
                style={styles.videoPreview}
              />
            )}

            <div style={styles.checkboxRow}>
              <label>
                <input
                  type="checkbox"
                  checked={item.verified}
                  onChange={(e) =>
                    updateLocalReview(item.id, "verified", e.target.checked)
                  }
                />{" "}
                Vérifié
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={item.verified_parent}
                  onChange={(e) =>
                    updateLocalReview(
                      item.id,
                      "verified_parent",
                      e.target.checked
                    )
                  }
                />{" "}
                Parent vérifié
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={item.verified_purchase}
                  onChange={(e) =>
                    updateLocalReview(
                      item.id,
                      "verified_purchase",
                      e.target.checked
                    )
                  }
                />{" "}
                Achat confirmé
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(e) =>
                    updateLocalReview(item.id, "visible", e.target.checked)
                  }
                />{" "}
                Visible
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={item.featured || false}
                  onChange={(e) =>
                    updateLocalReview(item.id, "featured", e.target.checked)
                  }
                />{" "}
                Mettre en premier
              </label>
            </div>

            <button
              onClick={() => updateReview(item)}
              disabled={savingReviewId === item.id}
              style={{
                ...styles.button,
                background: savedReviewIds[item.id] ? "#16a34a" : "#7c3aed",
              }}
            >
              {getReviewButtonText(item.id)}
            </button>

            <button
              onClick={() => deleteReview(item.id)}
              style={{
                ...styles.button,
                background: "#dc2626",
                marginTop: "10px",
              }}
            >
              Supprimer l’avis
            </button>
          </div>
            ))}
          </section>
        ))}
      </div>
      )}
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#050816",
    color: "white",
    padding: "40px",
    fontFamily: "Arial",
    overflowY: "visible",
  },
  back: {
    color: "#a78bfa",
    textDecoration: "none",
  },
  title: {
    fontSize: "48px",
    marginTop: "30px",
  },
  sectionTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    maxWidth: "900px",
    marginTop: "18px",
  },
  sectionTab: {
    width: "auto",
    marginTop: 0,
    background: "#111827",
    border: "1px solid #1f2937",
    color: "#cbd5e1",
    padding: "12px 18px",
    borderRadius: "999px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  sectionTabActive: {
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    color: "white",
    borderColor: "#7c3aed",
  },
  selectedProductCard: {
    background: "linear-gradient(135deg, #111827, #064e3b)",
    border: "1px solid #16a34a",
    padding: "28px",
    borderRadius: "24px",
    maxWidth: "650px",
    marginTop: "30px",
  },
  selectedLabel: {
    color: "#22c55e",
    fontWeight: "bold",
    margin: 0,
  },
  selectedTitle: {
    fontSize: "26px",
    marginTop: "10px",
    marginBottom: "8px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "12px",
    marginTop: "18px",
  },
  statBox: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    background: "rgba(5, 8, 22, 0.65)",
    padding: "14px",
    borderRadius: "14px",
    color: "#cbd5e1",
  },
  card: {
    background: "#111827",
    padding: "32px",
    borderRadius: "24px",
    maxWidth: "650px",
    marginTop: "30px",
  },
  cardWide: {
    background: "#111827",
    padding: "32px",
    borderRadius: "24px",
    maxWidth: "900px",
    marginTop: "30px",
  },
  pendingReviewsCard: {
    background: "linear-gradient(135deg, #451a03, #111827)",
    border: "2px solid #f59e0b",
    padding: "28px",
    borderRadius: "24px",
    maxWidth: "900px",
    marginTop: "30px",
  },
  extensionImportCard: {
    background: "linear-gradient(135deg, #052e25, #111827)",
    border: "2px solid #22c55e",
    padding: "28px",
    borderRadius: "24px",
    maxWidth: "900px",
    marginTop: "30px",
  },
  extensionImportInfo: {
    display: "grid",
    gap: "8px",
    background: "#050816",
    color: "#cbd5e1",
    border: "1px solid #1e293b",
    padding: "16px",
    borderRadius: "14px",
    marginTop: "16px",
  },
  inlineLink: {
    color: "#93c5fd",
    fontWeight: "bold",
    textDecoration: "none",
  },
  pendingReviewsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },
  pendingLabel: {
    color: "#fbbf24",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "1px",
    margin: 0,
  },
  pendingCount: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "110px",
    height: "48px",
    borderRadius: "999px",
    background: "#f59e0b",
    color: "#111827",
    fontSize: "15px",
    padding: "0 14px",
  },
  pendingEmpty: {
    margin: "20px 0 0",
    padding: "16px",
    borderRadius: "14px",
    background: "rgba(5, 8, 22, 0.55)",
    color: "#cbd5e1",
  },
  pendingReviewItem: {
    marginTop: "18px",
    padding: "20px",
    borderRadius: "16px",
    background: "#050816",
  },
  pendingReviewText: {
    color: "white",
    fontSize: "16px",
    lineHeight: 1.5,
  },
  pendingActions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
    marginTop: "16px",
  },
  publishButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "13px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  unpublishButton: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "13px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  rejectButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "13px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  muted: {
    color: "#94a3b8",
  },
  helper: {
    color: "#cbd5e1",
    fontSize: "13px",
    marginTop: "10px",
    wordBreak: "break-word",
  },
  handle: {
    color: "#a78bfa",
    fontSize: "13px",
    marginTop: "6px",
  },
  status: {
    marginTop: "20px",
    fontSize: "22px",
    fontWeight: "bold",
  },
  success: {
    color: "#22c55e",
    fontWeight: "bold",
    marginTop: "12px",
  },
  error: {
    color: "#ef4444",
    fontWeight: "bold",
    marginTop: "12px",
  },
  aiBox: {
    background: "#050816",
    border: "1px solid #1e293b",
    borderRadius: "18px",
    padding: "18px",
    marginTop: "18px",
    marginBottom: "18px",
  },
  checkboxLabel: {
    color: "#cbd5e1",
    fontWeight: "bold",
    display: "block",
    marginBottom: "8px",
  },
  fieldLabel: {
    color: "#cbd5e1",
    fontWeight: "bold",
    display: "block",
    marginTop: "16px",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginTop: "12px",
  },
  colorField: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    background: "#050816",
    color: "#cbd5e1",
    padding: "14px",
    borderRadius: "12px",
    fontWeight: "bold",
  },
  colorInput: {
    width: "52px",
    height: "38px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  widgetPreview: {
    marginTop: "18px",
    padding: "18px",
    borderRadius: "16px",
  },
  exportLink: {
    display: "block",
    width: "100%",
    marginTop: "18px",
    background: "#16a34a",
    color: "white",
    textAlign: "center",
    textDecoration: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    fontSize: "16px",
  },
  sourceLink: {
    display: "inline-block",
    marginTop: "12px",
    background: "#16a34a",
    color: "white",
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "14px",
  },
  processButton: {
    display: "block",
    width: "100%",
    marginTop: "14px",
    color: "white",
    border: "none",
    padding: "12px 14px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
  deleteImportButton: {
    display: "block",
    width: "100%",
    marginTop: "12px",
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "12px 14px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
  bulkActions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "18px",
    marginBottom: "18px",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "12px",
  },
  bulkButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px 14px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
  button: {
    width: "100%",
    marginTop: "18px",
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
  input: {
    width: "100%",
    marginTop: "12px",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    fontSize: "15px",
  },
  textarea: {
    width: "100%",
    marginTop: "12px",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    fontSize: "15px",
    minHeight: "100px",
  },
  file: {
    width: "100%",
    marginTop: "12px",
    color: "#cbd5e1",
  },
  preview: {
    width: "90px",
    height: "90px",
    objectFit: "cover",
    borderRadius: "12px",
    marginTop: "12px",
  },
  mediaLink: {
    display: "inline-block",
  },
  videoPreview: {
    display: "block",
    width: "100%",
    maxWidth: "320px",
    maxHeight: "240px",
    borderRadius: "12px",
    marginTop: "12px",
    background: "#000",
  },
  reviewCard: {
    background: "#050816",
    padding: "24px",
    borderRadius: "18px",
    marginTop: "18px",
  },
  platformSection: {
    marginTop: "24px",
    paddingTop: "8px",
  },
  platformHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #1e1b4b, #111827)",
    border: "1px solid #312e81",
  },
  platformTitle: {
    margin: 0,
    fontSize: "22px",
  },
  platformCount: {
    background: "#312e81",
    color: "#ddd6fe",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #1e293b",
    color: "#a78bfa",
    fontWeight: "bold",
    fontSize: "15px",
  },
  jobCard: {
    background: "#050816",
    padding: "22px",
    borderRadius: "18px",
    marginTop: "16px",
    border: "1px solid #1e293b",
  },
  jobHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    color: "#a78bfa",
    fontWeight: "bold",
    fontSize: "15px",
    marginBottom: "12px",
  },
  statusBadge: {
    color: "white",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  checkboxRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "16px",
    color: "#cbd5e1",
  },
}
