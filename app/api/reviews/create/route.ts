import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      shop,
      product_handle,
      customer_first_name,
      customer_last_name,
      rating,
      review,
      image_url,
      video_url,
      verified,
      verified_parent,
      verified_purchase,
    } = body;

    const result = await sql`
      INSERT INTO product_reviews (
        shop,
        product_handle,
        customer_first_name,
        customer_last_name,
        rating,
        review,
        image_url,
        video_url,
        verified,
        verified_parent,
        verified_purchase
      )
      VALUES (
        ${shop},
        ${product_handle},
        ${customer_first_name},
        ${customer_last_name},
        ${rating},
        ${review},
        ${image_url},
        ${video_url},
        ${verified || false},
        ${verified_parent || false},
        ${verified_purchase || false}
      )
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      review: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la création de l'avis",
      },
      { status: 500 }
    );
  }
}