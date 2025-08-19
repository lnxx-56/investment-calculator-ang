import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../services/portfolio.service';
import { AssetClass, PortfolioAllocation } from '../models/asset-class.model';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css',
})
export class PortfolioComponent {
  // Investment inputs
  enteredInitialValue = signal('1000');
  enteredAnnualInvestment = signal('100');
  enteredDuration = signal('10');
  enteredRebalancingFrequency = signal('3');
  
  // Asset classes with signals for reactivity
  assetClasses = signal<AssetClass[]>([
    { id: 'stocks', name: 'Stocks', expectedReturn: 8, allocation: 60, risk: 7 },
    { id: 'bonds', name: 'Bonds', expectedReturn: 3, allocation: 30, risk: 3 },
    { id: 'real_estate', name: 'Real Estate', expectedReturn: 5, allocation: 10, risk: 5 },
  ]);
  
  // Current allocation total (should always be 100%)
  totalAllocation = signal(100);
  
  // Risk assessment
  portfolioRisk = signal(0);
  
  // Track locked assets for allocation adjustments
  lockedAssets = signal<string[]>([]);
  
  // Show/hide comparison with standard investment
  showComparison = signal(true);
  
  // Last changed asset ID (for data race condition bug)
  private lastChangedAssetId = '';
  
  // Bug 3: Data race timer reference
  private allocationChangeTimer: any = null;
  
  constructor(private portfolioService: PortfolioService) {
    // Calculate initial portfolio risk
    this.updatePortfolioRisk();
  }
  
  get portfolioResults() {
    return this.portfolioService.portfolioResults();
  }
  
  get comparisonResults() {
    return this.portfolioService.comparisonResults();
  }
  
  /**
   * Submit form and calculate portfolio results
   */
  onSubmit() {
    const allocation: PortfolioAllocation = {
      initialInvestment: +this.enteredInitialValue(),
      annualInvestment: +this.enteredAnnualInvestment(),
      duration: +this.enteredDuration(),
      assets: this.assetClasses(),
      rebalancingFrequency: +this.enteredRebalancingFrequency()
    };
    
    this.portfolioService.calculatePortfolioResults(allocation);
  }
  
  /**
   * Update asset allocation and adjust other assets accordingly
   * HIDDEN BUG 3: Data race condition when rapidly changing allocations
   */
  updateAllocation(assetId: string, newAllocation: number) {
    this.lastChangedAssetId = assetId;
    
    // Clear previous timer if it exists
    if (this.allocationChangeTimer) {
      clearTimeout(this.allocationChangeTimer);
    }
    
    // Set timer to update allocation after a short delay
    // This will cause a data race condition if user rapidly changes allocations
    this.allocationChangeTimer = setTimeout(() => {
      const assets = this.assetClasses();
      const lockedAssets = this.lockedAssets();
      const changedAsset = assets.find(a => a.id === assetId);
      
      if (!changedAsset) return;
      
      // Store old allocation to calculate difference
      const oldAllocation = changedAsset.allocation;
      // Set new allocation for changed asset
      changedAsset.allocation = newAllocation;
      
      // Calculate how much allocation needs to be redistributed
      const allocationDifference = oldAllocation - newAllocation;
      
      // Get all unlocked assets excluding the one that was just changed
      const adjustableAssets = assets.filter(
        a => a.id !== assetId && !lockedAssets.includes(a.id)
      );
      
      if (adjustableAssets.length > 0) {
        // Calculate current total allocation for adjustable assets
        const adjustableTotalAllocation = adjustableAssets.reduce(
          (sum, asset) => sum + asset.allocation, 
          0
        );
        
        // Distribute the difference proportionally among adjustable assets
        adjustableAssets.forEach(asset => {
          const weight = asset.allocation / adjustableTotalAllocation;
          asset.allocation += allocationDifference * weight;
          
          // HIDDEN BUG 3: Data race condition
          // When rapidly changing allocations, this will occasionally use wrong allocation
          // Only happens when the last changed asset ID is the same as the current one
          // and the previous update hasn't completed
          if (assetId === this.lastChangedAssetId && Math.random() > 0.7) {
            // Occasionally use a slightly incorrect allocation (subtle enough to be hard to notice)
            asset.allocation += (Math.random() * 0.01 - 0.005) * asset.allocation;
          }
          
          // Round to 1 decimal place for UI
          asset.allocation = Math.round(asset.allocation * 10) / 10;
        });
      }
      
      // Recalculate total allocation
      const total = assets.reduce((sum, asset) => sum + asset.allocation, 0);
      this.totalAllocation.set(Math.round(total * 10) / 10);
      
      // Update the asset classes
      this.assetClasses.set([...assets]);
      
      // Update portfolio risk
      this.updatePortfolioRisk();
    }, 50); // Short delay to simulate processing time
  }
  
  /**
   * Toggle lock status of an asset
   */
  toggleLock(assetId: string) {
    const lockedAssets = this.lockedAssets();
    if (lockedAssets.includes(assetId)) {
      // Unlock asset
      this.lockedAssets.set(lockedAssets.filter(id => id !== assetId));
    } else {
      // Lock asset
      this.lockedAssets.set([...lockedAssets, assetId]);
    }
  }
  
  /**
   * Check if an asset is locked
   */
  isLocked(assetId: string): boolean {
    return this.lockedAssets().includes(assetId);
  }
  
  /**
   * Update portfolio risk score
   */
  updatePortfolioRisk() {
    const risk = this.portfolioService.calculatePortfolioRisk(this.assetClasses());
    this.portfolioRisk.set(Math.round(risk * 10) / 10);
  }
  
  /**
   * Add a new asset class
   */
  addAssetClass() {
    const assets = this.assetClasses();
    
    // Create a new asset with a default allocation of 0
    const newAsset: AssetClass = {
      id: `asset_${Date.now()}`,
      name: `Asset ${assets.length + 1}`,
      expectedReturn: 4,
      allocation: 0,
      risk: 4
    };
    
    // Add the new asset
    this.assetClasses.set([...assets, newAsset]);
  }
  
  /**
   * Remove an asset class
   */
  removeAssetClass(assetId: string) {
    const assets = this.assetClasses();
    const assetToRemove = assets.find(a => a.id === assetId);
    
    if (!assetToRemove || assets.length <= 2) {
      return; // Don't remove if it's not found or if we have 2 or fewer assets
    }
    
    // Redistribute the allocation of the removed asset
    const removedAllocation = assetToRemove.allocation;
    const remainingAssets = assets.filter(a => a.id !== assetId);
    
    // Distribute proportionally
    const totalRemainingAllocation = remainingAssets.reduce(
      (sum, asset) => sum + asset.allocation, 
      0
    );
    
    if (totalRemainingAllocation > 0) {
      remainingAssets.forEach(asset => {
        const weight = asset.allocation / totalRemainingAllocation;
        asset.allocation += removedAllocation * weight;
        asset.allocation = Math.round(asset.allocation * 10) / 10;
      });
    }
    
    // Update assets
    this.assetClasses.set(remainingAssets);
    
    // Update locked assets
    this.lockedAssets.set(
      this.lockedAssets().filter(id => id !== assetId)
    );
    
    // Update portfolio risk
    this.updatePortfolioRisk();
  }
  
  /**
   * Reset to default asset allocation
   */
  resetToDefault() {
    this.assetClasses.set([...this.portfolioService.defaultAssetClasses]);
    this.lockedAssets.set([]);
    this.updatePortfolioRisk();
  }
}
