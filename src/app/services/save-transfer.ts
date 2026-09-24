import { Injectable, inject } from '@angular/core';
import { SaveLocation, SaveManager } from './save-manager';

/**
 * Export et import de la partie sous forme d'un code chiffré, pour la
 * transporter d'un navigateur à l'autre.
 *
 * Le code réunit **toutes** les clés de progression (partie, garde-robe,
 * collection, battles…), pas seulement `AURA_FARMER_SAVE` : les managers ont
 * chacun la leur, et n'exporter que la principale aurait rendu une partie
 * amputée de ses gemmes et de ses décors. Les options restent sur l'appareil.
 *
 * Chiffrement AES-GCM, clé dérivée par PBKDF2 d'une phrase embarquée et d'un
 * sel tiré à chaque export. La phrase est dans le code du jeu : c'est une
 * protection contre la retouche à la main, pas un secret. GCM authentifie le
 * contenu, si bien qu'un code modifié d'un seul caractère est refusé.
 */

/** Préfixe de version : un format futur pourra être reconnu et converti. */
const PREFIX = 'AURA1.';
const PASSPHRASE = 'chad-aura-farmer/🗿/mog-or-be-mogged';
const SALT_BYTES = 16;
const IV_BYTES = 12;
const ITERATIONS = 100_000;

/** Clés exportées : toute la progression, hors options de l'appareil. */
const EXPORTED_KEYS: readonly string[] = Object.values(SaveLocation).filter(
  key => key !== SaveLocation.Settings
);

export type ImportError = 'format' | 'corrupted';

@Injectable({
  providedIn: 'root'
})
export class SaveTransfer {

  private readonly saveManager = inject(SaveManager);

  /** Chiffre l'état courant de la sauvegarde. */
  async exportCode(): Promise<string> {
    const payload: Record<string, string> = {};
    for (const key of EXPORTED_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) payload[key] = value;
    }

    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await SaveTransfer.deriveKey(salt);
    const plain = new TextEncoder().encode(JSON.stringify({ exportedAt: Date.now(), payload }));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));

    const packed = new Uint8Array(salt.length + iv.length + cipher.length);
    packed.set(salt, 0);
    packed.set(iv, salt.length);
    packed.set(cipher, salt.length + iv.length);
    return PREFIX + SaveTransfer.toBase64(packed);
  }

  /**
   * Déchiffre un code et vérifie qu'il contient une partie. N'écrit rien :
   * l'écrasement de la partie en cours attend la confirmation du joueur.
   */
  async decode(code: string): Promise<Record<string, string> | ImportError> {
    const trimmed = code.trim();
    if (!trimmed.startsWith(PREFIX)) return 'format';

    let packed: Uint8Array;
    try {
      packed = SaveTransfer.fromBase64(trimmed.slice(PREFIX.length));
    } catch {
      return 'format';
    }
    if (packed.length <= SALT_BYTES + IV_BYTES) return 'format';

    try {
      const salt = packed.slice(0, SALT_BYTES);
      const iv = packed.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
      const key = await SaveTransfer.deriveKey(salt);
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        packed.slice(SALT_BYTES + IV_BYTES)
      );
      const data = JSON.parse(new TextDecoder().decode(plain));
      const payload = data?.payload;
      if (!payload || typeof payload !== 'object' || !(SaveLocation.GameSave in payload)) {
        return 'corrupted';
      }
      // On ne réécrit que des clés connues : un code ne doit pas pouvoir
      // semer n'importe quoi dans le stockage du site.
      const accepted: Record<string, string> = {};
      for (const k of EXPORTED_KEYS) {
        if (typeof payload[k] === 'string') accepted[k] = payload[k];
      }
      return accepted;
    } catch {
      // Clé fausse ou contenu altéré : GCM refuse de déchiffrer.
      return 'corrupted';
    }
  }

  /**
   * Remplace la partie par celle du code, puis recharge la page.
   *
   * Le rechargement est le seul moyen sûr : chaque manager a lu sa clé à sa
   * création et la tient en mémoire. La sauvegarde est gelée juste avant,
   * sinon la sauvegarde automatique pouvait réécrire l'ancienne partie entre
   * l'import et le rechargement.
   */
  apply(payload: Record<string, string>): void {
    this.saveManager.freeze();
    for (const key of EXPORTED_KEYS) {
      if (key in payload) localStorage.setItem(key, payload[key]);
      else localStorage.removeItem(key);
    }
    location.reload();
  }

  private static async deriveKey(salt: Uint8Array): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PASSPHRASE),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private static toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  private static fromBase64(text: string): Uint8Array {
    const binary = atob(text.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}
