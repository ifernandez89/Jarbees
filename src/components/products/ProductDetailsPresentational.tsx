import { Button } from "../ui/button";
import { CardFooter } from "../ui/card";
import { ProductFactory } from "./factories/ProductFactory";
import { Product } from "./models/Product";
import { applyDecorators } from "@/utils/productDecorators";
import Image from "next/image";

type Props = {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ProductDetails({
  product,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const p = ProductFactory.createProduct(product);
  const decoratedName = applyDecorators(p).render();
  return (
    <div className="space-y-2">
      <div>
        <strong>Nombre:</strong> {decoratedName}
      </div>
      <div>
        <strong>Marca:</strong> {product.marca}
      </div>
      <div>
        <strong>Descripcion:</strong> {product.description}
      </div>

      <div>
        <strong>Precio base:</strong> ${product.price.toFixed(2)}
      </div>

      {/* Solo stock bajo y sin otras condiciones */}
      {p.stock < 10 && !p.isNew && !p.isOnSale && !p.isFeatured && (
        <div>
          <strong>Descuento por pocas unidades (5%):</strong> $
          {p.getFinalPrice().toFixed(2)}
        </div>
      )}

      {/* Nuevo y con stock bajo */}
      {p.isNew && p.stock < 10 && (
        <div>
          <strong>En 12 cuotas con interés del 5%:</strong> $
          {p.getFinalPrice().toFixed(2)} <small>(c/u)</small>
        </div>
      )}

      {p.isNew && p.isFeatured && (
        <div>
          <strong>12 cuotas con interés del 2%:</strong> $
          {p.getFinalPrice().toFixed(2)} <small>(c/u)</small>
        </div>
      )}

      {/* Nuevo sin destacado y con stock normal */}
      {p.isNew && !p.isFeatured && p.stock >= 10 && (
        <div>
          <strong>En 12 cuotas con interés del 10%:</strong> $
          {p.getFinalPrice().toFixed(2)} <small>(c/u)</small>
        </div>
      )}

      {/* Descuento si está en oferta y no es nuevo */}
      {p.isOnSale && !p.isNew && (
        <div>
          <strong>Descuento del 10%:</strong> ${p.getFinalPrice().toFixed(2)}
        </div>
      )}

      {/* Destacado sin nuevo */}
      {p.isFeatured && !p.isNew && (
        <div>
          <strong>6 cuotas sin interés:</strong> ${p.getFinalPrice().toFixed(2)}{" "}
          <small>(c/u)</small>
        </div>
      )}

      {/* Destacado con pocas unidades */}
      {p.isFeatured && !p.isNew && p.stock < 10 && (
        <div>
          <strong>6 cuotas sin interés + Descuento 5%:</strong> $
          {p.getFinalPrice().toFixed(2)} <small>(c/u)</small>
        </div>
      )}

      <div>
        <strong></strong>
        <div className="mt-2">
          <Image
            src={product.image}
            alt={product.name}
            width={320}
            height={240}
            className="max-w-xs h-auto w-auto rounded border-none shadow-none"
          />
        </div>
      </div>

      <CardFooter className="flex justify-between">
        <Button
          className="mt-5"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Editar
        </Button>
        <Button
          className="mt-5"
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Eliminar
        </Button>
      </CardFooter>
    </div>
  );
}
