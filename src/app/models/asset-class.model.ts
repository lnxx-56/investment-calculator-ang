export interface AssetClass {
  id: string;
  name: string;
  expectedReturn: number;
  allocation: number; // Percentage of total portfolio (0-100)
  risk: number; // Risk level (1-10)
}

export interface PortfolioAllocation {
  initialInvestment: number;
  annualInvestment: number;
  duration: number;
  assets: AssetClass[];
  rebalancingFrequency: number; // 0 for no rebalancing, or number of years between rebalancing
}
