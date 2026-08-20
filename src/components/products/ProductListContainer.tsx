"use client";

import dynamic from "next/dynamic";
import { Product } from "./models/Product";

const ProductCardContainer = dynamic(
  () => import("./ProductCardContainer").then((mod) => mod.ProductCardContainer),
  { ssr: false }
);

export function ProductListContainer({ products }: Readonly<{ products: Product[] }>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCardContainer key={product.id} product={product} />
      ))}
    </div>
  );
}
