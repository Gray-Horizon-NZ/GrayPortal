import ApexusBuilder from "./ApexusBuilder";

// Curates a package from the pricing catalogue and GrayScale products, then
// exports a client-facing quote. Prices flow through on next load. Rendered
// as the terminal concept's Apexus screen.
export default function ApexusPage() {
  return <ApexusBuilder />;
}
