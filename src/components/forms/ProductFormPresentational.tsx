"use client";

import React from "react";
import { Button, buttonVariants } from "../ui/button";
import Link from "next/link";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Label } from "../ui/label";

interface ProductFormData {
  name: string;
  marca: string;
  description: string;
  price: string | number;
  image: string;
  stock: string | number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  isNew?: boolean;
}

type ProductFormRegister = UseFormRegister<ProductFormData>;
type ProductFormErrors = FieldErrors<ProductFormData>;

export default function ProductFormPresentational({
  register,
  onSubmit,
  isEditing,
  errors,
}: {
  register: ProductFormRegister;
  onSubmit: () => void;
  isEditing: boolean;
  errors: ProductFormErrors;
}) {
  return (
    <form onSubmit={onSubmit} className="max-w-xl mx-auto space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label className="block mb-1 font-medium">Nombre</Label>
          <input
            placeholder="Nombre"
            {...register("name", { required: "El nombre es obligatorio" })}
            className="w-full border rounded p-2"
          />
          {errors.name?.message && <p className="text-red-500 text-sm">{errors.name.message as string}</p>}
        </div>
        <div>
          <Label className="block mb-1 font-medium">Marca</Label>
          <textarea
            placeholder="Marca"
            {...register("marca", { required: "La marca es obligatoria" })}
            className="w-full border rounded p-2"
          />
          {errors.marca?.message && <p className="text-red-500 text-sm">{errors.marca.message as string}</p>}
        </div>
        <div>
          <Label className="block mb-1 font-medium">Descripción</Label>
          <textarea
            placeholder="Descripción"
            {...register("description", { required: "La descripción es obligatoria" })}
            className="w-full border rounded p-2"
          />
          {errors.description?.message && <p className="text-red-500 text-sm">{errors.description.message as string}</p>}
        </div>
        <div>
          <Label className="block mb-1 font-medium">Precio</Label>
          <input
            placeholder="Precio"
            type="number"
            {...register("price", { valueAsNumber: true, required: "El precio es obligatorio" })}
            className="w-full border rounded p-2"
          />
          {errors.price?.message && <p className="text-red-500 text-sm">{errors.price.message as string}</p>}
        </div>
        <div>
          <Label className="block mb-1 font-medium">URL de Imagen</Label>
          <input
            placeholder="URL de Imagen"
            {...register("image", { required: "La URL de imagen es obligatoria" })}
            className="w-full border rounded p-2"
          />
          {errors.image?.message && <p className="text-red-500 text-sm">{errors.image.message as string}</p>}
        </div>
        <div>
          <Label className="block mb-1 font-medium">Stock</Label>
          <input
            placeholder="Stock"
            type="number"
            {...register("stock", { valueAsNumber: true, required: "El stock es obligatorio" })}
            className="w-full border rounded p-2"
          />
          {errors.stock?.message && <p className="text-red-500 text-sm">{errors.stock.message as string}</p>}
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" {...register("isFeatured")} id="isFeatured" />
          <Label htmlFor="isFeatured" className="font-medium">
            Destacado
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" {...register("isOnSale")} id="isOnSale" />
          <Label htmlFor="isOnSale" className="font-medium">
            En Oferta
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" {...register("isNew")} id="isNew" />
          <Label htmlFor="isNew" className="font-medium">
            Es Nuevo
          </Label>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button type="submit">
          {isEditing ? "Actualizar Producto" : "Crear Producto"}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
    </form>
  );
}
