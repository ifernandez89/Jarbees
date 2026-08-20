"use client";

import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/products/ProductCardPresentational";
import { Product } from "./models/Product";

export function ProductCardContainer({ product }: Readonly<{ product: Product }>) {
  const router = useRouter();

  const handleView = () => {
    router.push(`/products/${product.id}`);
  };

  return (
    <ProductCard
      product={product}
      onView={handleView}
    />
  );
}
