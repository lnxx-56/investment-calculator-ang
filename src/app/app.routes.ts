import { Routes } from '@angular/router';
import { UserInputComponent } from './user-input/user-input.component';
import { InvestmentResultsComponent } from './investment-results/investment-results.component';
import { PortfolioComponent } from './portfolio/portfolio.component';

export const routes: Routes = [
  {
    path: '',
    component: UserInputComponent,
    children: [
      {
        path: '',
        component: InvestmentResultsComponent,
      }
    ]
  },
  {
    path: 'portfolio',
    component: PortfolioComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
