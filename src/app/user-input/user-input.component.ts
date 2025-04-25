import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-input.component.html',
  styleUrl: './user-input.component.css'
})
export class UserInputComponent {
  enteredInitialValue: string = '0';
  enteredAnnualInvestment: string = '0';
  enteredExpectedReturn: string = '5';
  enteredDuration: string = '10';


  onSubmit() {
    // Handle form submission logic here
    console.log(this.enteredInitialValue);
    console.log(this.enteredAnnualInvestment);
    console.log(this.enteredExpectedReturn);
    console.log(this.enteredDuration);
  }
}
