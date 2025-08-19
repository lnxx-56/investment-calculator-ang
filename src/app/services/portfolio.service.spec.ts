import { TestBed } from '@angular/core/testing';
import { PortfolioService } from './portfolio.service';
import { AssetClass, PortfolioAllocation } from '../models/asset-class.model';

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PortfolioService],
    });
    service = TestBed.inject(PortfolioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate portfolio results correctly', () => {
    // Create test data
    const assets: AssetClass[] = [
      { id: 'stocks', name: 'Stocks', expectedReturn: 8, allocation: 60, risk: 7 },
      { id: 'bonds', name: 'Bonds', expectedReturn: 3, allocation: 30, risk: 3 },
      { id: 'real_estate', name: 'Real Estate', expectedReturn: 5, allocation: 10, risk: 5 },
    ];

    const allocation: PortfolioAllocation = {
      initialInvestment: 1000,
      annualInvestment: 100,
      duration: 5,
      assets: assets,
      rebalancingFrequency: 0, // No rebalancing
    };

    // Calculate portfolio results
    service.calculatePortfolioResults(allocation);
    
    // Verify results exist
    expect(service.portfolioResults()).toBeDefined();
    expect(service.comparisonResults()).toBeDefined();
    
    // Verify correct number of years
    if (service.portfolioResults()) {
      expect(service.portfolioResults()!.length).toBe(5);
    }
    
    // Verify final year values are positive
    if (service.portfolioResults() && service.portfolioResults()!.length > 0) {
      const finalYear = service.portfolioResults()![service.portfolioResults()!.length - 1];
      expect(finalYear.totalValue).toBeGreaterThan(0);
      expect(finalYear.totalInterest).toBeGreaterThan(0);
    }
  });

  it('should calculate portfolio risk correctly', () => {
    // Create test data
    const assets: AssetClass[] = [
      { id: 'stocks', name: 'Stocks', expectedReturn: 8, allocation: 60, risk: 7 },
      { id: 'bonds', name: 'Bonds', expectedReturn: 3, allocation: 40, risk: 3 },
    ];

    // Calculate weighted risk: (60% * 7) + (40% * 3) = 4.2 + 1.2 = 5.4
    const expectedRisk = 5.4;
    
    // Calculate portfolio risk
    const calculatedRisk = service.calculatePortfolioRisk(assets);
    
    // Verify risk calculation
    expect(calculatedRisk).toBe(expectedRisk);
  });

  it('should rebalance portfolio correctly when frequency is set', () => {
    // Create test data
    const assets: AssetClass[] = [
      { id: 'stocks', name: 'Stocks', expectedReturn: 8, allocation: 60, risk: 7 },
      { id: 'bonds', name: 'Bonds', expectedReturn: 3, allocation: 40, risk: 3 },
    ];

    const allocation: PortfolioAllocation = {
      initialInvestment: 1000,
      annualInvestment: 100,
      duration: 5,
      assets: assets,
      rebalancingFrequency: 2, // Rebalance every 2 years
    };

    // Calculate portfolio results
    service.calculatePortfolioResults(allocation);
    
    // Verify rebalancing occurred
    if (service.portfolioResults()) {
      // Year 2 should have rebalancing
      expect(service.portfolioResults()![1].rebalanced).toBe(true);
      // Year 4 should have rebalancing
      expect(service.portfolioResults()![3].rebalanced).toBe(true);
      // Year 1, 3, 5 should not have rebalancing
      expect(service.portfolioResults()![0].rebalanced).toBe(false);
      expect(service.portfolioResults()![2].rebalanced).toBe(false);
    }
  });
});
