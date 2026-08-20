"use client";
import React from "react";
import dynamic from "next/dynamic";
const ProductDetails = dynamic(
  () => import("./ProductDetailsPresentational").then((mod) => mod.default),
  { ssr: false }
);
import { deleteProduct } from "@/app/services/products.api";
import { useRouter } from "next/navigation"; // tu función real
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {  Product } from "./models/Product";
function ProductDetailsContainer({
  title,
  product,
}: Readonly<{
  title: string;
  product?: Product;
}>) {
  const router = useRouter();

  const handleEdit = () => {
    if (product) {
      router.push(`/products/${product.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (product && confirm("¿Estás seguro de que deseas eliminarlo?")) {
      await deleteProduct(String(product.id));
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {product && (
            <ProductDetails
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductDetailsContainer;
