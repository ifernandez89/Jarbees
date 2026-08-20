import { Product } from "@/components/products/models/Product";
import {
  BaseProductDisplay,
  FeaturedProduct,
  OnSaleProduct,
  NewProduct,
  LimitedStockProduct,
  ProductDisplay,
} from "../lib/decoratorPattern"; // ejemplo de ruta

export function applyDecorators(product: Product): ProductDisplay {
  let display: ProductDisplay = new BaseProductDisplay(product);

  if (product.isFeatured) {
    display = new FeaturedProduct(display);
  }

  if (product.isOnSale) {
    display = new OnSaleProduct(display);
  }

  if (product.isNew) {
    display = new NewProduct(display);
  }

  if (product.stock < 10) {
    display = new LimitedStockProduct(display);
  }

  return display;
}

