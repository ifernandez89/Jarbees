"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Image from "next/image";
import { applyDecorators } from "@/utils/productDecorators";
import { Product } from "./models/Product";

const formatPrice = (price: number) =>
  price.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export function ProductCard({
  product,
  onView,
}: Readonly<{
  product: Product;
  onView: () => void;
}>) {
  const decoratedName = applyDecorators(product).render();
  return (
    <Card onClick={onView} className="max-w-sm">
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>{decoratedName}</span>
          <span className="text-sm font-bold text-gray-500">
            ${formatPrice(product.price)}
          </span>
        </CardTitle>
      </CardHeader>
      <div className="relative w-full aspect-[3/4] overflow-hidden rounded-md">
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority
          className="object-cover transition-transform duration-300 ease-in-out hover:scale-110"
        />
      </div>
      <CardContent>
        <p>{product.description}</p>
        <p>{product.marca}</p>
      </CardContent>
    </Card>
  );
}
