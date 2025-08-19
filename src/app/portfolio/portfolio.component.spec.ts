import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { PortfolioComponent } from './portfolio.component';
import { PortfolioService } from '../services/portfolio.service';

describe('PortfolioComponent', () => {
  let component: PortfolioComponent;
  let fixture: ComponentFixture<PortfolioComponent>;
  let portfolioService: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    const portfolioServiceSpy = jasmine.createSpyObj('PortfolioService', [
      'calculatePortfolioResults',
      'calculatePortfolioRisk'
    ]);

    await TestBed.configureTestingModule({
      imports: [FormsModule, PortfolioComponent],
      providers: [
        { provide: PortfolioService, useValue: portfolioServiceSpy }
      ]
    }).compileComponents();

    portfolioService = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
    fixture = TestBed.createComponent(PortfolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate portfolio risk on initialization', () => {
    portfolioService.calculatePortfolioRisk.and.returnValue(5.5);
    component.updatePortfolioRisk();
    expect(portfolioService.calculatePortfolioRisk).toHaveBeenCalled();
  });

  it('should call calculatePortfolioResults when form is submitted', () => {
    component.onSubmit();
    expect(portfolioService.calculatePortfolioResults).toHaveBeenCalled();
  });

  it('should update allocation when asset allocation is changed', () => {
    // Initial setup
    const initialAllocation = component.assetClasses()[0].allocation;
    
    // Update allocation for the first asset
    component.updateAllocation('stocks', 70);
    
    // Allow the timeout to complete
    jasmine.clock().install();
    jasmine.clock().tick(100);
    jasmine.clock().uninstall();
    
    // Check if allocation was updated
    expect(component.assetClasses()[0].allocation).toBe(70);
    expect(component.totalAllocation()).toBe(100);
  });

  it('should toggle lock status correctly', () => {
    // Initially no assets should be locked
    expect(component.isLocked('stocks')).toBeFalse();
    
    // Lock an asset
    component.toggleLock('stocks');
    expect(component.isLocked('stocks')).toBeTrue();
    
    // Unlock the asset
    component.toggleLock('stocks');
    expect(component.isLocked('stocks')).toBeFalse();
  });

  it('should add a new asset class', () => {
    const initialLength = component.assetClasses().length;
    component.addAssetClass();
    expect(component.assetClasses().length).toBe(initialLength + 1);
  });

  it('should remove an asset class and redistribute allocation', () => {
    // Save initial state
    const initialLength = component.assetClasses().length;
    const initialAllocation = component.assetClasses()[0].allocation;
    
    // Try to remove an asset
    component.removeAssetClass(component.assetClasses()[2].id);
    
    // Should have one fewer asset
    expect(component.assetClasses().length).toBe(initialLength - 1);
    
    // Total allocation should still be 100%
    expect(component.totalAllocation()).toBe(100);
  });
});
