import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { UntitledIcon } from '../untitled-icon/untitled-icon';

@Component({
  selector: 'app-ui-state',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatRippleModule, UntitledIcon],
  template: `
    @if (type === 'loading') {
      <div class="loading-state" role="status" aria-label="Loading">
        <mat-spinner diameter="34" />
        <span>Loading live data…</span>
      </div>
      <div class="skeleton" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    } @else {
      <div class="state" [class.error]="type === 'error'">
        <span><app-icon [name]="type === 'error' ? 'help-circle' : 'ticket-01'" [size]="24" /></span>
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        @if (actionLabel) {
          <button matRipple type="button" class="ev-interactive" (click)="action.emit()">{{ actionLabel }}</button>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .skeleton {
        display: grid;
        gap: 10px;
        padding: 16px;
      }
      .loading-state {
        padding: 28px 16px 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #58717a;
        font-size: 14px;
        font-weight: 700;
      }
      .skeleton i {
        height: 54px;
        border-radius: 12px;
        background: linear-gradient(90deg, #e4e8e2 20%, #f7f8f4 50%, #e4e8e2 80%);
        background-size: 200% 100%;
        animation: shimmer 1.25s infinite;
      }
      .state {
        padding: 42px 20px;
        text-align: center;
        color: #58717a;
      }
      .state > span {
        width: 52px;
        height: 52px;
        margin: auto;
        display: grid;
        place-items: center;
        border-radius: 15px;
        background: #e7f2f1;
        color: #028991;
        font-size: 22px;
      }
      .state.error > span {
        background: #ffeded;
        color: #d84b4b;
      }
      .state h3 {
        margin: 12px 0 5px;
        color: #0d2d53;
      }
      .state p {
        margin: 0 auto 14px;
        max-width: 430px;
        font-size: 14px;
      }
      .state button {
        padding: 9px 14px;
        border: 0;
        border-radius: 10px;
        background: linear-gradient(135deg, #028991, #02597b 58%, #0d2d53);
        color: #fff;
        font-size: 13px;
        font-weight: 800;
      }
      @keyframes shimmer {
        to {
          background-position: -200% 0;
        }
      }
    `,
  ],
})
export class UiState {
  @Input() type: 'loading' | 'empty' | 'error' = 'empty';
  @Input() title = 'Nothing here yet';
  @Input() message = 'There is no data to display.';
  @Input() actionLabel = '';
  @Output() readonly action = new EventEmitter<void>();
}
