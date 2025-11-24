import { Injectable, signal } from '@angular/core';

export enum Sound {
  Buy = 'assets/sounds/buy.wav',
  Game = 'assets/sounds/background.mp3',
  Plop = 'assets/sounds/plop.wav',
  Menu = 'assets/sounds/menu.mp3'
}

@Injectable({
  providedIn: 'root'
})

export class SoundManager {

  public ambianceVolume = signal(1);
  public fxVolume = signal(1);

  private currentMusic: HTMLAudioElement | null = null;

  private sounds: { [key in Sound] : HTMLAudioElement } = {
    [Sound.Buy]: new Audio(Sound.Buy),
    [Sound.Game]: new Audio(Sound.Game),
    [Sound.Plop]: new Audio(Sound.Plop),
    [Sound.Menu]: new Audio(Sound.Menu)
  };

  public playFX(sound: Sound): void {
    const audio = this.sounds[sound];
    audio.volume = this.fxVolume();
    this.sounds[sound].play();
  }

  public changeMusic(newSound: Sound): void {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
    }
    this.currentMusic = this.sounds[newSound];
    this.currentMusic.volume = this.ambianceVolume();
    this.currentMusic.loop = true;
    this.currentMusic.play();
  }

  public updateAmbianceVolume(volume: number): void {
    this.ambianceVolume.set(volume);
    if (this.currentMusic) {
      this.currentMusic.volume = volume;
    }
  }
}
