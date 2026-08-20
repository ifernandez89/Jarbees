import {
  CompositePriceStrategy,
  DiscountPrice,
  InstallmentPrice,
  InterestPrice,
  PriceStrategy,
} from "./PriceStrategies";

export class StrategyResolver {
  static resolve({
    isNew,
    isOnSale,
    isFeatured,
    stock,
  }: {
    isNew?: boolean;
    isOnSale?: boolean;
    isFeatured?: boolean;
    stock?: number;
  }): PriceStrategy {
    const strategies: PriceStrategy[] = [];

     const hasLowStock = typeof stock === "number" && stock < 10;

    // Estrategias basadas en condiciones
    // 1. Nuevo y destacado → 12 cuotas + interés 2%
    if (isNew && isFeatured) {
      strategies.push(new InterestPrice(0.02), new InstallmentPrice(12));
      return new CompositePriceStrategy(strategies);
    }

    // 2. Nuevo + bajo stock (sin destacado) → interés 5% + 12 cuotas
    if (isNew && hasLowStock) {
      strategies.push(new InterestPrice(0.05), new InstallmentPrice(12));
      return new CompositePriceStrategy(strategies);
    }

    // 3. Solo nuevo → interés 10% + 12 cuotas
    if (isNew) {
      strategies.push(new InterestPrice(0.1), new InstallmentPrice(12));
      return new CompositePriceStrategy(strategies);
    }

    // 4. Solo bajo stock (sin nuevo/destacado/oferta) → descuento 5%
    if (hasLowStock && !isOnSale && !isFeatured) {
      strategies.push(new DiscountPrice(0.05));
      return new CompositePriceStrategy(strategies);
    }

    // 5. Destacado solo → 6 cuotas sin interés
    if (isFeatured && !hasLowStock) {
      strategies.push(new InstallmentPrice(6));
    }

    // 6. Destacado + bajo stock → 6 cuotas sin interés + 5% descuento
    if (isFeatured && hasLowStock) {
      strategies.push(new InstallmentPrice(6), new DiscountPrice(0.05));
    }

    // 7. Oferta (sin nuevo) → 10% descuento
    if (isOnSale) {
      strategies.push(new DiscountPrice(0.1));
    }

    return strategies.length
      ? new CompositePriceStrategy(strategies)
      : { getPrice: (base: number) => base };
  }
}
