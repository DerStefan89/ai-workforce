/**
 * Datei: public/leitstand/vormerken-ablauf.js
 *
 * Zweck: Anlegen und Routen eines Vormerken-Auftrags (F27 WS-2, AK12) — gemeinsam für den Scout (views/capabilities.js) und
 * seit F45 F-2b-2c für die Sammlung (views/sammlung.js). Kein neuer Schreibweg: POST /api/auftraege → POST
 * …/auftraege/<id>/routen; freigegeben wird wie jeder Auftrag am ZWINGEND-Schritt des Ablaufs. „Erneut versuchen“ nach einem
 * schon angelegten Auftrag reicht DENSELBEN Auftrag erneut zum Routen ein (kein zweiter, verwaister Auftrag; Muster
 * views/workboard.js wiederholeRouten).
 *
 * Wird aufgerufen von: public/leitstand/views/capabilities.js, public/leitstand/views/sammlung.js
 *
 * Wichtig: Fehler werden als Zustand zurückgegeben (phase 'fehler' mit übersetzter Meldung), nie geworfen.
 */

import { legeAuftragAn, routeAuftrag } from './api.js'
import { t } from './i18n.js'

/**
 * Legt den Auftrag an (falls noch keiner) und routet ihn.
 * @param eingabe - { titel, auftragstext, auftragId (aus einem vorherigen Fehlversuch oder null) }
 * @returns { phase: 'geroutet', auftragId, workflowId } | { phase: 'fehler', auftragId, meldung }
 */
export async function legeVormerkenAnUndRoute({ titel, auftragstext, auftragId = null }) {
  let id = auftragId
  try {
    if (id === null) {
      const auftragAntwort = await legeAuftragAn({ titel, auftragstext })
      const auftragInhalt = await auftragAntwort.json().catch(() => ({}))
      if (auftragAntwort.status !== 201) return { phase: 'fehler', auftragId: null, meldung: t('werkstatt.scout.fehler.auftrag', { details: `${auftragAntwort.status} ${auftragInhalt.grund ?? ''}`.trim() }) }
      id = auftragInhalt.auftragId
    }
    const routeAntwort = await routeAuftrag(id)
    if (!routeAntwort.ok) {
      const routeInhalt = await routeAntwort.json().catch(() => ({}))
      return { phase: 'fehler', auftragId: id, meldung: t('werkstatt.scout.fehler.routen', { auftrag: id, details: `${routeAntwort.status} ${routeInhalt.grund ?? ''}`.trim() }) }
    }
    return { phase: 'geroutet', auftragId: id, workflowId: `router-${id}` }
  } catch (fehler) {
    console.error('[vormerken] Anlegen/Routen fehlgeschlagen:', fehler)
    return { phase: 'fehler', auftragId: id, meldung: t('werkstatt.scout.fehler.anfrage', { grund: fehler instanceof Error ? fehler.message : String(fehler) }) }
  }
}
