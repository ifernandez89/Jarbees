//patron de diseño: Factory Method
import { Product } from "../models/Product";
import { StrategyResolver } from "../models/StrategyResolver";

interface ProductOptions {
  name: string;
  marca: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  id?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isOnSale?: boolean;
}

export class ProductFactory {
  static createProduct(options: ProductOptions): Product {
    const {
      name,
      marca,
      description,
      price,
      image,
      stock,
      id,
      isNew,
      isFeatured,
      isOnSale,
    } = options;

    const product = new Product(name, marca, description, price, image, stock, {
      id,
      isNew,
      isFeatured,
      isOnSale,
    });

    product.strategy = StrategyResolver.resolve({
      isNew: product.isNew,
      isOnSale: product.isOnSale,
      isFeatured: product.isFeatured,
      stock: product.stock,
    });

    return product;
  }
}
