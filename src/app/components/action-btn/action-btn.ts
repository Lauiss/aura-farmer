import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-action-btn',
  imports: [],
  templateUrl: './action-btn.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './action-btn.scss'
})
export class ActionBtn {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  /** 'ghost' : texte seul, avec un chevron au survol et au focus. */
  @Input() variant: 'solid' | 'ghost' = 'solid';

  @Output() click = new EventEmitter<Event>();

  onClick(event: Event) {
    event.stopPropagation();
    if (!this.disabled) {
      this.click.emit(event);
    }
  }
}
