export interface PriceStrategy {
  getPrice(basePrice: number): number;
}

export class CompositePriceStrategy implements PriceStrategy {
  constructor(private readonly strategies: PriceStrategy[]) {}

  getPrice(basePrice: number): number {
    return this.strategies.reduce(
      (price, strategy) => strategy.getPrice(price),
      basePrice
    );
  }
}

export class DiscountPrice implements PriceStrategy {
  constructor(private readonly discount: number) {}

  getPrice(basePrice: number): number {
    return basePrice * (1 - this.discount);
  }
}

export class InstallmentPrice implements PriceStrategy {
  constructor(private readonly months: number = 6) {}

  getPrice(basePrice: number): number {
    return parseFloat((basePrice / this.months).toFixed(2)); // precio por cuota
  }
}

export class InterestPrice implements PriceStrategy {
  constructor(private readonly interestRate: number = 0.1) {}

  getPrice(basePrice: number): number {
    return basePrice * (1 + this.interestRate);
  }
}