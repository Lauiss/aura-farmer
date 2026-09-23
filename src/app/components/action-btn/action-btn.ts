import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { Sound, SoundManager } from '../../services/sound-manager';

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

  private readonly soundManager = inject(SoundManager);

  onClick(event: Event) {
    event.stopPropagation();
    if (this.disabled) return;
    // Hauteur légèrement tirée au sort : une série d'appuis ne doit pas
    // sonner comme un métronome.
    this.soundManager.playPitched(Sound.Plop, 1.35 + Math.random() * 0.12);
    this.click.emit(event);
  }
}
