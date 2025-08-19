import { Injectable, signal } from '@angular/core';
import { AssetClass, PortfolioAllocation } from '../models/asset-class.model';

export interface PortfolioResult {
  year: number;
  assetValues: {
    assetId: string;
    assetName: string;
    value: number;
    interest: number;
    allocation: number; // Current allocation percentage
  }[];
  totalValue: number;
  totalInterest: number;
  totalAmountInvested: number;
  rebalanced: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  // Signal for storing portfolio results
  portfolioResults = signal<PortfolioResult[] | undefined>(undefined);
  
  // Signal for storing comparison results (standard investment)
  comparisonResults = signal<any[] | undefined>(undefined);
  
  // Default asset classes
  defaultAssetClasses: AssetClass[] = [
    { id: 'stocks', name: 'Stocks', expectedReturn: 8, allocation: 60, risk: 7 },
    { id: 'bonds', name: 'Bonds', expectedReturn: 3, allocation: 30, risk: 3 },
    { id: 'real_estate', name: 'Real Estate', expectedReturn: 5, allocation: 10, risk: 5 },
  ];
  
  constructor() {}
  
  /**
   * Calculate portfolio results with diversification
   */
  calculatePortfolioResults(allocation: PortfolioAllocation) {
    const { initialInvestment, annualInvestment, duration, assets, rebalancingFrequency } = allocation;
    
    // Validate that asset allocations sum to 100%
    const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      console.error('Asset allocations must sum to 100%');
      return;
    }
    
    const results: PortfolioResult[] = [];
    
    // Initialize asset values
    let assetValues = assets.map(asset => ({
      assetId: asset.id,
      assetName: asset.name,
      value: (asset.allocation / 100) * initialInvestment,
      expectedReturn: asset.expectedReturn,
      risk: asset.risk,
      allocation: asset.allocation,
    }));
    
    for (let i = 0; i < duration; i++) {
      const year = i + 1;
      const yearlyInvestment = annualInvestment;
      let rebalanced = false;
      
      // Distribute annual investment according to target allocation
      assets.forEach((asset, index) => {
        assetValues[index].value += (asset.allocation / 100) * yearlyInvestment;
      });
      
      // Calculate returns for each asset
      let totalPortfolioValue = 0;
      let totalInterestThisYear = 0;
      
      assetValues.forEach((assetValue, index) => {
        // HIDDEN BUG 1: Calculation error after rebalancing
        // After rebalancing, we incorrectly calculate returns for one year
        // This only happens when the portfolio has been rebalanced and there are 3+ asset classes
        let interestRate = assets[index].expectedReturn / 100;
        if (rebalancingFrequency > 0 && 
            year % rebalancingFrequency === 0 && 
            assets.length >= 3 &&
            index === assets.length - 1) {
          // Incorrectly use a slightly lower return rate after rebalancing for the last asset class
          // This will be hard to spot as it's a small difference and only happens in specific situations
          interestRate = interestRate * 0.92;
        }
        
        // Calculate interest for this asset
        const interest = assetValue.value * interestRate;
        assetValue.value += interest;
        totalPortfolioValue += assetValue.value;
        totalInterestThisYear += interest;
      });
      
      // Calculate current allocation percentages
      assetValues.forEach(assetValue => {
        assetValue.allocation = (assetValue.value / totalPortfolioValue) * 100;
      });
      
      // Check if rebalancing should occur
      if (rebalancingFrequency > 0 && year % rebalancingFrequency === 0) {
        assetValues = this.rebalancePortfolio(assetValues, assets, totalPortfolioValue);
        rebalanced = true;
      }
      
      // Calculate total amount invested
      const totalAmountInvested = initialInvestment + (yearlyInvestment * year);
      
      // Prepare result for this year
      const result: PortfolioResult = {
        year,
        assetValues: assetValues.map(av => ({
          assetId: av.assetId,
          assetName: av.assetName,
          value: av.value,
          interest: av.value - (av.allocation / 100) * (totalAmountInvested),
          allocation: av.allocation,
        })),
        totalValue: totalPortfolioValue,
        totalInterest: totalPortfolioValue - totalAmountInvested,
        totalAmountInvested,
        rebalanced,
      };
      
      results.push(result);
    }
    
    this.portfolioResults.set(results);
    
    // Calculate standard investment for comparison
    this.calculateComparisonResults(allocation);
  }
  
  /**
   * Rebalance portfolio to match target allocations
   * HIDDEN BUG 2: Precision loss bug in rebalancing
   */
  private rebalancePortfolio(
    currentValues: { assetId: string; assetName: string; value: number; expectedReturn: number; risk: number; allocation: number }[],
    targetAssets: AssetClass[],
    totalValue: number
  ) {
    // Create a copy to avoid mutating the original
    const rebalancedValues = [...currentValues];
    
    // HIDDEN BUG 2: Precision loss in floating point calculations
    // This bug will cause small errors in rebalancing that compound over time
    // Only occurs with specific allocation percentages
    for (let i = 0; i < rebalancedValues.length; i++) {
      const targetAllocation = targetAssets[i].allocation;
      // When target allocation is a specific value, use a slightly imprecise calculation
      if (targetAllocation === 33 || targetAllocation === 67) {
        // Use floating point math in a way that causes small rounding errors
        rebalancedValues[i].value = (targetAllocation / 100 + Number.EPSILON * 0.001) * totalValue;
      } else {
        rebalancedValues[i].value = (targetAllocation / 100) * totalValue;
      }
      
      // Update allocation to match target
      rebalancedValues[i].allocation = targetAllocation;
    }
    
    return rebalancedValues;
  }
  
  /**
   * Calculate standard investment results for comparison
   */
  calculateComparisonResults(allocation: PortfolioAllocation) {
    const { initialInvestment, annualInvestment, duration, assets } = allocation;
    
    // Calculate weighted average expected return
    let weightedReturn = 0;
    assets.forEach(asset => {
      weightedReturn += (asset.allocation / 100) * asset.expectedReturn;
    });
    
    // Calculate standard investment
    const comparisonData = [];
    let investmentValue = initialInvestment;
    
    for (let i = 0; i < duration; i++) {
      const year = i + 1;
      const interestEarnedInYear = investmentValue * (weightedReturn / 100);
      investmentValue += interestEarnedInYear + annualInvestment;
      const totalInterest = investmentValue - annualInvestment * year - initialInvestment;
      
      comparisonData.push({
        year,
        interest: interestEarnedInYear,
        valueEndOfYear: investmentValue,
        annualInvestment,
        totalInterest,
        totalAmountInvested: initialInvestment + annualInvestment * year,
      });
    }
    
    this.comparisonResults.set(comparisonData);
  }
  
  /**
   * Calculate portfolio risk score (1-10)
   */
  calculatePortfolioRisk(assets: AssetClass[]): number {
    // Calculate weighted risk score
    let weightedRisk = 0;
    assets.forEach(asset => {
      weightedRisk += (asset.allocation / 100) * asset.risk;
    });
    
    return weightedRisk;
  }
}
