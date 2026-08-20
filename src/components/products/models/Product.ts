import { PriceStrategy } from "./PriceStrategies";

export class Product {
  id?: number;
  name: string;
  marca: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  isNew?: boolean;

  strategy: PriceStrategy = {
    getPrice: (basePrice) => basePrice,
  };

  constructor(
    name: string,
    marca: string,
    description: string,
    price: number,
    image: string,
    stock: number,
    options?: {
      id?: number;
      isFeatured?: boolean;
      isOnSale?: boolean;
      isNew?: boolean;
    }
  ) {
    this.name = name;
    this.marca = marca;
    this.description = description;
    this.price = price;
    this.image = image;
    this.stock = stock;

    this.id = options?.id;
    this.isFeatured = options?.isFeatured;
    this.isOnSale = options?.isOnSale;
    this.isNew = options?.isNew;
  }

  getFinalPrice(): number {
    return this.strategy.getPrice(this.price);
  }
}
