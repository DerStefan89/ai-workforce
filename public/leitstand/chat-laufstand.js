/**
 * Datei: public/leitstand/chat-laufstand.js
 *
 * Zweck: Reine Regeln, wann der Chat auf einen ausstehenden Lauf (Jarvis, Product Coach) nicht mehr
 * wartet (F-986 b). Bildet die Antwort von GET /api/laeufe/<laufId> auf eine Art ab und erkennt
 * einen Lauf, der sich länger als die Lauf-Zeitgrenze nicht verändert hat. Ohne DOM, ohne Timer und
 * ohne eigenen Netzabruf, damit node:test sie direkt prüfen kann.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/chat.js (pruefeAusstehendenLauf)
 * - public/leitstand/chat-laufstand.test.mjs (node:test)
 *
 * Wichtig:
 * - „Nie gestartet“ heißt: der Lauf ist nicht aktiv, laufStatus ist NICHT_GESTARTET und die Kette
 *   trägt schon eine terminale Wirkungsmarke ohne RUN_PREPARED (terminaleOhneRunPrepared, z. B. eine
 *   Verweigerung der Startfreigabe wie E-188). NICHT_GESTARTET ohne solche Marke ist die normale Lage
 *   direkt nach dem 202 und bleibt „wartet“.
 * - Ist das Detail nicht abrufbar (404: der Lauf hat nie etwas geschrieben, z. B. F5-Ablehnung) und
 *   führt die Startfehler-Liste des Polls (zustand.startfehler) einen Eintrag zu dieser laufId, ist der
 *   Lauf ebenfalls nie gestartet; Grund ist dessen Feld 'fehler'. Ein Startfehler-Eintrag zu einem Lauf
 *   MIT Detail (z. B. „Nachbereitung fehlgeschlagen“) macht ihn nicht zu „nie gestartet“.
 * - Der Grund kommt roh vom Server (detail.nichtGestartet.grund bzw. startfehler.fehler) und wird erst
 *   beim Rendern escaped.
 * - Die Zeitgrenze gilt nur, solange der Lauf NICHT aktiv ist (Art 'wartet'): ein aktiver Lauf hat im
 *   Chat den Knopf „Lauf abbrechen“, und der Server beendet ihn an seiner eigenen Zeitgrenze (Prüfpass
 *   qa 1: sonst gäbe der Chat die Eingabe frei, ein neuer Versuch liefe in 409, ohne Abbruchweg).
 *   Grenze ist die der Startvorlage (detail.startvorlageZeitgrenzeMs) plus Puffer; trägt die
 *   Startvorlage keine, gilt ERSATZ_ZEITGRENZE_MS. Gemessen wird mit Date.now(): nach einem Standby
 *   kann die Grenze sofort als überschritten gelten — bekanntes, akzeptiertes Restrisiko (nur für
 *   Läufe, die ohnehin nicht aktiv sind).
 */

/** Ersatz, wenn die Startvorlage keine zeitgrenzeMs trägt — derselbe Wert wie startvorlagen/ai-workforce.json. */
export const ERSATZ_ZEITGRENZE_MS = 30 * 60 * 1000

/** Puffer über der Lauf-Zeitgrenze: der Server beendet einen zu langen Lauf selbst, der Chat greift erst danach. */
export const ZEITGRENZE_PUFFER_MS = 60 * 1000

/**
 * Ordnet ein Lauf-Detail ein.
 * @param detail - geparste Antwort von GET /api/laeufe/<laufId>, oder null (dieser Abruf scheiterte)
 * @param kontext - { laufId, startfehler } — startfehler aus dem Poll-Zustand (Array oder null/undefined)
 * @returns { art: 'wartet' | 'laeuft' | 'erfolgreich' | 'beendet' | 'nichtGestartet', grund?: string | null }
 */
export function ordneLaufstandEin(detail, { laufId, startfehler } = {}) {
  const startfehlerEintrag = Array.isArray(startfehler) && laufId !== undefined ? startfehler.find((eintrag) => eintrag?.laufId === laufId) : undefined
  const startfehlerGrund = typeof startfehlerEintrag?.fehler === 'string' && startfehlerEintrag.fehler !== '' ? startfehlerEintrag.fehler : null
  if (detail === null || typeof detail !== 'object') return startfehlerEintrag !== undefined ? { art: 'nichtGestartet', grund: startfehlerGrund } : { art: 'wartet' }
  if (detail.aktiv === true) return { art: 'laeuft' }
  const status = detail.laufStatus?.status
  if (status === 'ABGESCHLOSSEN' && detail.laufStatus.ergebnis === 'ERFOLGREICH') return { art: 'erfolgreich' }
  if (status === 'ABGESCHLOSSEN' || status === 'KLAERUNG_ERFORDERLICH') return { art: 'beendet' }
  const terminale = detail.laufStatus?.terminaleOhneRunPrepared
  if (status === 'NICHT_GESTARTET' && Array.isArray(terminale) && terminale.length > 0) {
    const grund = detail.nichtGestartet?.grund
    return { art: 'nichtGestartet', grund: typeof grund === 'string' && grund !== '' ? grund : startfehlerGrund }
  }
  return { art: 'wartet' }
}

/**
 * Kurze Signatur des beobachtbaren Laufstands — ändert sie sich, gilt das als Statusänderung.
 * Fortschritt (letzter Werkzeugaufruf) zählt mit: ein arbeitender Lauf ändert sich. Ein gescheiterter
 * Abruf (null) ist keine Statusänderung — der Aufrufer vergleicht nur Signaturen echter Details, sonst
 * setzte ein Wechsel zwischen 404 und 200 die Wartezeit jedes Mal zurück (Prüfpass qa 3).
 * @param detail - wie bei ordneLaufstandEin
 * @returns String, für null der feste Wert 'kein-detail'
 */
export function laufstandSignatur(detail) {
  if (detail === null || typeof detail !== 'object') return 'kein-detail'
  return JSON.stringify([detail.aktiv === true, detail.laufStatus?.status ?? null, detail.laufStatus?.ergebnis ?? null, detail.fortschritt ?? null])
}

/**
 * Wirksame Grenze ohne Statusänderung, ab der der Chat aufhört zu warten.
 * @param zeitgrenzeMs - zeitgrenzeMs der Startvorlage, oder null/undefined
 * @returns Millisekunden (Zeitgrenze bzw. Ersatz, plus Puffer)
 */
export function warteGrenzeMs(zeitgrenzeMs) {
  const basis = typeof zeitgrenzeMs === 'number' && Number.isFinite(zeitgrenzeMs) && zeitgrenzeMs > 0 ? zeitgrenzeMs : ERSATZ_ZEITGRENZE_MS
  return basis + ZEITGRENZE_PUFFER_MS
}

/**
 * @param letzteAenderungMs - Zeitpunkt der letzten Statusänderung (Date.now()-Skala)
 * @param jetztMs - jetzt (Date.now()-Skala)
 * @param zeitgrenzeMs - zeitgrenzeMs der Startvorlage, oder null/undefined
 * @returns true, wenn der Lauf länger als warteGrenzeMs unverändert ist
 */
export function zeitgrenzeUeberschritten(letzteAenderungMs, jetztMs, zeitgrenzeMs) {
  return jetztMs - letzteAenderungMs > warteGrenzeMs(zeitgrenzeMs)
}
