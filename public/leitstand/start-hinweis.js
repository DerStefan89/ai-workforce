/**
 * Datei: public/leitstand/start-hinweis.js
 *
 * Zweck: Start-Hinweis des Leitstands (F45 B0, F-986 a). Läuft der Leitstand nicht aus dem Ordner,
 * an den der Wirksamkeitsnachweis gebunden ist, verweigert die Startfreigabe jeden Lauf (E-188). Der
 * Server meldet das lesend in GET /api/zustand (Feld startHinweis); dieses Modul zeigt es als Band
 * oben (#start-hinweis) und liefert denselben Text für den Hinweis im Chat über dem Eingabefeld
 * (views/chat.js, #chat-start-hinweis).
 *
 * F45 B1b-2 (F-1044): zweiter Hinweis cliHinweis — die installierte Claude-Code-Version weicht von
 * werkzeugVersionDeklariert der Startvorlage ab („CLI-Version geändert — Startfreigabe neu erzeugen“, mit Verweis auf
 * docs/harness/startfreigabe-erneuern.md). Nur im Band (Läufe werden dadurch nicht verweigert); stehen beide an, je
 * eine Zeile.
 *
 * F45 B2b-3b-2b-2b-2b-2 (F-1136 (10) = B): dritte Zeile projektCliHinweis — in einer Projektinstanz weicht die installierte Version von
 * der Projekt-Startvorlage ab (Text aus projekt-cli-hinweis.js); nur Warnung, Läufe starten unverändert.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initStartHinweisBand vor initZustandPoll)
 * - public/leitstand/views/chat.js (startHinweisText)
 * - public/leitstand/start-hinweis.test.mjs (node:test)
 *
 * Wichtig:
 * - Nur Anzeige: Senden bleibt möglich, der Server bleibt Durchsetzungsort (E-188 unverändert streng).
 * - Kein eigener Timer und kein fetch — nur der eine Poll (zustand.js, check-f20-zustand-poll).
 * - Keine Live-Region (eine Live-Region im Leitstand: die Persona); die Pfade kommen roh vom Server
 *   und gehen nur über textContent in die Seite.
 */

import { t } from './i18n.js'
import { istCliHinweis, projektCliHinweisText } from './projekt-cli-hinweis.js'
import { abonniere } from './zustand.js'

/**
 * Text des Start-Hinweises in der aktuellen Sprache.
 * @param hinweis - zustand.startHinweis ({ art: 'falscherOrdner', istPfad, sollPfad }) oder null/undefined
 * @returns Anzeigetext, oder '' ohne (bekannten) Hinweis
 */
export function startHinweisText(hinweis) {
  if (hinweis?.art !== 'falscherOrdner' || typeof hinweis.istPfad !== 'string' || typeof hinweis.sollPfad !== 'string') return ''
  return t('start.hinweis.falscherOrdner', { ist: hinweis.istPfad, soll: hinweis.sollPfad })
}

/**
 * Text des CLI-Hinweises in der aktuellen Sprache.
 * @param hinweis - zustand.cliHinweis ({ art: 'cliVersionGeaendert', installiert, deklariert, anleitung }) oder null/undefined
 * @returns Anzeigetext, oder '' ohne (bekannten) Hinweis
 */
export function cliHinweisText(hinweis) {
  if (!istCliHinweis(hinweis)) return ''
  return t('start.hinweis.cliVersion', { installiert: hinweis.installiert, deklariert: hinweis.deklariert, anleitung: hinweis.anleitung })
}

/**
 * Die Zeilen des Bands: falscher Ordner, CLI-Version und CLI-Version des Projekts, je eine Zeile, leere weggelassen.
 * @param zustand - Poll-Aggregat oder null
 * @returns Texte
 */
export function startBandZeilen(zustand) {
  return [startHinweisText(zustand?.startHinweis), cliHinweisText(zustand?.cliHinweis), projektCliHinweisText(zustand?.projektCliHinweis)].filter((text) => text !== '')
}

/** Abonniert den Poll und blendet das Band #start-hinweis ein oder aus (je Hinweis eine Zeile, nur über textContent). */
export function initStartHinweisBand() {
  let zuletzt = null
  abonniere((zustand) => {
    const band = document.getElementById('start-hinweis')
    const zeilen = startBandZeilen(zustand)
    const schluessel = zeilen.join('\n')
    band.hidden = zeilen.length === 0
    // Nur CLI-Hinweise: eine Warnung (Läufe laufen weiter) — gelb statt rot.
    band.dataset.art = startHinweisText(zustand?.startHinweis) === '' && zeilen.length > 0 ? 'warnung' : 'sperre'
    if (schluessel === zuletzt) return
    zuletzt = schluessel
    band.replaceChildren(
      ...zeilen.map((text) => {
        const zeile = document.createElement('div')
        zeile.textContent = text
        return zeile
      })
    )
  })
}
