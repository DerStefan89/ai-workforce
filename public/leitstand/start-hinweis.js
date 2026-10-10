/**
 * Datei: public/leitstand/start-hinweis.js
 *
 * Zweck: Start-Hinweis des Leitstands (F45 B0, F-986 a). Läuft der Leitstand nicht aus dem Ordner,
 * an den der Wirksamkeitsnachweis gebunden ist, verweigert die Startfreigabe jeden Lauf (E-188). Der
 * Server meldet das lesend in GET /api/zustand (Feld startHinweis); dieses Modul zeigt es als Band
 * oben (#start-hinweis) und liefert denselben Text für den Hinweis im Chat über dem Eingabefeld
 * (views/chat.js, #chat-start-hinweis).
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

/** Abonniert den Poll und blendet das Band #start-hinweis ein oder aus. */
export function initStartHinweisBand() {
  abonniere((zustand) => {
    const band = document.getElementById('start-hinweis')
    const text = startHinweisText(zustand?.startHinweis)
    band.textContent = text
    band.hidden = text === ''
  })
}
