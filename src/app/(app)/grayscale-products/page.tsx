import { listGrayscaleProducts } from "@/lib/dal/grayscaleProducts";
import { listAllGrayscaleRequests } from "@/lib/dal/grayscaleRequests";
import { StoreData } from "@/terminal/store";
import { GrayScale } from "@/terminal/screens/Catalog";

const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d);

// The catalogue shown in the client portal's GrayScale widget (requests are
// validated against it), plus every client's requests. Rendered by the
// terminal concept's GrayScale screen.
export default async function GrayscaleProductsPage() {
  const [products, requests] = await Promise.all([listGrayscaleProducts(), listAllGrayscaleRequests()]);
  return (
    <StoreData
      data={{
        grayscaleProducts: products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category || "Other",
          desc: p.description ?? "",
          monthly: p.monthlyPriceNzd ? Number(p.monthlyPriceNzd) : null,
          sortOrder: p.sortOrder,
        })),
        grayscaleRequests: requests.map(({ request: r, clientName }) => ({
          id: r.id,
          clientId: r.clientId,
          client: clientName,
          product: r.products.join(", "),
          note: r.note ?? "",
          at: day(r.createdAt),
          status: r.status,
        })),
      }}
    >
      <GrayScale />
    </StoreData>
  );
}
