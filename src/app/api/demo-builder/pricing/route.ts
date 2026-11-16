import { NextResponse } from "next/server";
import { withCaller } from "@/lib/dal/auth";
import { assertRole } from "@/lib/dal/session";
import { listGrayscaleProducts } from "@/lib/dal/grayscaleProducts";
import { isNewProduct } from "@/lib/grayscaleNew";

/**
 * Feeds the Demo Builder (public/demo-builder.html, framed at /demo-builder) with the
 * GrayScale catalogue from /grayscale-products, so every demo's "Your plan" quotes live
 * list prices. Discounts, free months and setup fees are set per demo in the builder.
 * Same-origin fetch from the frame carries the admin's session cookie, like /api/apexus-pricing.
 */
export async function GET() {
  return withCaller(async (caller) => {
    assertRole(caller, "admin");
    const products = await listGrayscaleProducts();
    return NextResponse.json({
      at: new Date().toISOString(),
      products: products.map((p) => ({
        name: p.name,
        category: p.category ?? "",
        desc: p.description ?? "",
        monthly: p.monthlyPriceNzd === null ? null : Number(p.monthlyPriceNzd),
        isNew: isNewProduct(p.createdAt),
      })),
    });
  });
}
