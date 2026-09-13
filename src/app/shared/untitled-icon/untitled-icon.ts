import { Component, HostBinding, Input } from '@angular/core';

/**
 * Angular adapter for the free Untitled UI SVG set.
 * Icons stay as external assets so this project remains Angular-only.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  template: '',
  styles: [
    `
      :host {
        display: inline-block;
        width: var(--icon-size, 1.25rem);
        height: var(--icon-size, 1.25rem);
        flex: 0 0 auto;
        background: currentColor;
        -webkit-mask: var(--icon-url) center / contain no-repeat;
        mask: var(--icon-url) center / contain no-repeat;
      }
    `,
  ],
})
export class UntitledIcon {
  @Input({ required: true }) name = 'help-circle';
  @Input() label = '';
  @Input() size = 20;

  @HostBinding('style.--icon-url')
  get iconUrl(): string {
    return `url('/assets/untitled-icons/${this.name}.svg')`;
  }

  @HostBinding('style.--icon-size')
  get iconSize(): string {
    return `${this.size}px`;
  }

  @HostBinding('attr.role')
  get role(): string | null {
    return this.label ? 'img' : null;
  }

  @HostBinding('attr.aria-label')
  get ariaLabel(): string | null {
    return this.label || null;
  }

  @HostBinding('attr.aria-hidden')
  get ariaHidden(): string | null {
    return this.label ? null : 'true';
  }
}
