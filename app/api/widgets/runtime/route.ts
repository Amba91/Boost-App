import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    shop: "kiidiiz.myshopify.com",
    widgets: {
      sticky_cart: {
        enabled: true,
        config: {
          text: "Ajouter au panier",
          color: "#7c3aed",
          radius: "16px",
        },
      },
      sales_popup: {
        enabled: true,
        config: {
          delay: 5,
          position: "bottom-left",
        },
      },
      wishlist: {
        enabled: true,
        config: {},
      },
    },
  })
}