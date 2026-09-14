import { booleanAttribute, Directive, Input } from '@angular/core';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

@Directive({
  selector: 'button[appButton], a[appButton]',
  standalone: true,
  host: {
    class: 'ui-button',
    '[attr.data-variant]': 'variant',
    '[attr.aria-busy]': 'loading',
    '[class.is-loading]': 'loading',
  },
})
export class AppButton {
  @Input() variant: AppButtonVariant = 'primary';
  @Input({ transform: booleanAttribute }) loading = false;
}
