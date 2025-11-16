import { Component, Input, Output, EventEmitter, signal } from '@angular/core';

@Component({
  selector: 'app-action-btn',
  imports: [],
  templateUrl: './action-btn.html',
  styleUrl: './action-btn.scss'
})
export class ActionBtn {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;

  @Output() click = new EventEmitter<Event>();

  onClick(event: Event) {
    event.stopPropagation();
    if (!this.disabled) {
      this.click.emit(event);
    }
  }
}
