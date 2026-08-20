"use client";

import { useForm } from "react-hook-form";
import { createProduct, updateProduct } from "../../app/services/products.api";
import { useParams, useRouter } from "next/navigation";

import ProductFormPresentational from "@/components/forms/ProductFormPresentational";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Product } from "../products/models/Product";

export default function ProductsForm({
  title,
  product,
}: Readonly<{
  title: string;
  product?: Product;
}>) {
  const { register, handleSubmit, formState: { errors }, } = useForm({
    defaultValues: {
      name: product?.name ?? "",
      marca: product?.marca ?? "",
      description: product?.description ?? "",
      price: product?.price ?? "",
      image: product?.image ?? "",
      stock: product?.stock ?? "",
      isFeatured: product?.isFeatured ?? false,
      isOnSale: product?.isOnSale ?? false,
      isNew: product?.isNew ?? true,
    },
  });

  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const onSubmit = handleSubmit(async (data) => {
    const cleanedPrice = parseFloat(
      data.price.toString().replace(/[^0-9.-]+/g, "")
    );

    const payload = {
      ...data,
      price: cleanedPrice,
    };

    if (isEditing) {
      await updateProduct(id, payload);
    } else {
      await createProduct(payload);
    }

    router.push("/");
    router.refresh();
  });

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductFormPresentational
            register={register}
            onSubmit={onSubmit}
            isEditing={isEditing}
            errors={errors}
          />
        </CardContent>
      </Card>
    </div>
  );
}
