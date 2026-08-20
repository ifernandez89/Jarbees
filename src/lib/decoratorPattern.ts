//patron de diseño: Decorator
import { Product } from "@/components/products/models/Product";

export interface ProductDisplay {
  render(): string;
}

export class BaseProductDisplay implements ProductDisplay {
  constructor(protected product: Product) {}
  render() {
    return this.product.name;
  }
}

export class FeaturedProduct implements ProductDisplay {
  constructor(private readonly decorated: ProductDisplay) {}
  render() {
    return `${this.decorated.render()} ⭐`;//destacado
  }
}

export class OnSaleProduct implements ProductDisplay {
  constructor(private readonly decorated: ProductDisplay) {}
  render() {
    return `${this.decorated.render()} 💸`;//en oferta
  }
}

export class NewProduct implements ProductDisplay {
  constructor(private readonly decorated: ProductDisplay) {}
  render() {
    return `${this.decorated.render()} 🆕`;//producto nuevo
  }
}

export class LimitedStockProduct implements ProductDisplay {
  constructor(private readonly decorated: ProductDisplay) {}
  render() {
    return `${this.decorated.render()} ⏳`; //pocas unidades
  }
}
