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
 *   Grenze ist die des Laufs (detail.laufZeitgrenzeMs, F45 B0; sonst detail.startvorlageZeitgrenzeMs)
 *   plus Puffer; ist keine bekannt, gilt ERSATZ_ZEITGRENZE_MS.
 * - F45 B0: chatModusDesAktivenLaufs ordnet den laufenden Lauf aus /api/zustand (aktiverLauf) einem
 *   Chat-Modus zu — damit übernimmt der Chat nach Neuladen einen laufenden Lauf wieder.
 * - Die Wartegrenze misst mit Date.now(): nach einem Standby kann sie sofort als überschritten gelten —
 *   bekanntes, akzeptiertes Restrisiko (nur für Läufe, die ohnehin nicht aktiv sind).
 * - F45 P (F-1016 c, d): grundCodeDesEintrags/GRUND_SCHLUESSEL übersetzen den Grund eines Fehler-Eintrags über
 *   seinen Code (nie deutscher Fließtext in en/tr/ru); sperreDurchAnderenLauf sperrt Senden, solange
 *   /api/zustand einen anderen aktiven Lauf meldet.
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
 * @param zeitgrenzeMs - wirksame Zeitgrenze des Laufs (wirksameLaufZeitgrenzeMs), oder null/undefined
 * @returns Millisekunden (Zeitgrenze bzw. Ersatz, plus Puffer)
 */
export function warteGrenzeMs(zeitgrenzeMs) {
  const basis = typeof zeitgrenzeMs === 'number' && Number.isFinite(zeitgrenzeMs) && zeitgrenzeMs > 0 ? zeitgrenzeMs : ERSATZ_ZEITGRENZE_MS
  return basis + ZEITGRENZE_PUFFER_MS
}

/**
 * F45 B0 (F-1007): die für den Lauf wirksame Zeitgrenze aus dem Lauf-Detail — laufZeitgrenzeMs
 * (Chat-Läufe: eigene Grenze der Rolle) vor startvorlageZeitgrenzeMs (älterer Server ohne das Feld).
 * @param detail - Antwort von GET /api/laeufe/<laufId>
 * @returns Millisekunden oder null
 */
export function wirksameLaufZeitgrenzeMs(detail) {
  if (typeof detail?.laufZeitgrenzeMs === 'number') return detail.laufZeitgrenzeMs
  if (typeof detail?.startvorlageZeitgrenzeMs === 'number') return detail.startvorlageZeitgrenzeMs
  return null
}

/**
 * F45 B0 (F-986 b Restgrenze): laufId-Präfix eines Chat-Laufs je Modus — dieselbe Form wie
 * starteRollenChatLauf ('<rolle>-<auftragPraefix>-…'), damit kein Ad-hoc-Lauf derselben Rolle als Chat-Lauf gilt.
 */
export const CHAT_LAUF_PRAEFIX = { jarvis: 'jarvis-jarvis-chat-', sparring: 'product-coach-product-coach-sparring-' }

/**
 * F45 B0: zu welchem Chat-Modus gehört ein laufender Lauf aus /api/zustand (aktiverLauf)?
 * @param aktiverLauf - { aktiv, laufId } aus dem Poll oder null/undefined
 * @returns 'jarvis' | 'sparring' | null (kein aktiver Chat-Lauf)
 */
export function chatModusDesAktivenLaufs(aktiverLauf) {
  if (aktiverLauf?.aktiv !== true || typeof aktiverLauf.laufId !== 'string') return null
  for (const [modus, praefix] of Object.entries(CHAT_LAUF_PRAEFIX)) {
    if (aktiverLauf.laufId.startsWith(praefix)) return modus
  }
  return null
}

/**
 * @param letzteAenderungMs - Zeitpunkt der letzten Statusänderung (Date.now()-Skala)
 * @param jetztMs - jetzt (Date.now()-Skala)
 * @param zeitgrenzeMs - wirksame Zeitgrenze des Laufs (wirksameLaufZeitgrenzeMs), oder null/undefined
 * @returns true, wenn der Lauf länger als warteGrenzeMs unverändert ist
 */
export function zeitgrenzeUeberschritten(letzteAenderungMs, jetztMs, zeitgrenzeMs) {
  return jetztMs - letzteAenderungMs > warteGrenzeMs(zeitgrenzeMs)
}

/**
 * F45 P (F-1016 c): i18n-Schlüssel je Grund-Code eines Fehler-Eintrags (fehler.code, beschreibeChatMisserfolg
 * im Server; die Klassifikationscodes aus src/result-evaluator). Literale Schlüssel, damit das i18n-Gate sie sieht.
 */
export const GRUND_SCHLUESSEL = {
  ausnahme: 'chat.grund.ausnahme',
  kontextpaket_abgelehnt: 'chat.grund.kontextpaketAbgelehnt',
  startfreigabe_abgelehnt: 'chat.grund.startfreigabeAbgelehnt',
  abgebrochen_manuell: 'chat.grund.abgebrochenManuell',
  timeout: 'chat.grund.timeout',
  beobachtungsbasis_unvollstaendig: 'chat.grund.beobachtungsbasisUnvollstaendig',
  rohstrom_integritaet: 'chat.grund.rohstromIntegritaet',
  rohstrom_fehlt: 'chat.grund.rohstromFehlt',
  turn_failed: 'chat.grund.turnFailed',
  exit_code: 'chat.grund.exitCode',
  ergebnis_nicht_schemakonform: 'chat.grund.ergebnisNichtSchemakonform',
  kein_ergebnisobjekt: 'chat.grund.keinErgebnisobjekt',
  init_gate_verstoss: 'chat.grund.initGateVerstoss',
  claude_ordner_veraendert: 'chat.grund.claudeOrdnerVeraendert',
  werkzeuggrenze_abgelehnt: 'chat.grund.werkzeuggrenzeAbgelehnt',
  fehlgeschlagen: 'chat.grund.fehlgeschlagen',
  unerwarteter_laufstatus: 'chat.grund.unerwarteterLaufstatus',
  ergebnis_unlesbar: 'chat.grund.ergebnisUnlesbar',
}

/** Form eines Grund-Codes (Kleinbuchstaben, Ziffern, Unterstrich) — alles andere ist Fließtext. */
const CODE_MUSTER = /^[a-z][a-z0-9_]*$/

/**
 * F45 P (F-1016 c): Grund-Code eines Fehler-Eintrags. Neue Einträge tragen fehler.code; ältere (F45 B0) nur
 * fehler.grund — dort gilt der Grund als Code, wenn er die Form eines Codes hat, sonst gibt es keinen.
 * @param fehler - { art, grund, code? } oder null
 * @returns Code oder null
 */
export function grundCodeDesEintrags(fehler) {
  // Reihenfolge: Code des Servers, sonst ein Grund in Code-Form (ältere Einträge).
  if (typeof fehler?.code === 'string' && CODE_MUSTER.test(fehler.code)) return fehler.code
  if (typeof fehler?.grund === 'string' && CODE_MUSTER.test(fehler.grund)) return fehler.grund
  return null
}

/** F45 P (F-1016 d): so lange (ms) nach seinem Ende sperrt ein eigener Lauf nicht, auch wenn der Poll ihn noch als aktiv meldet (Poll-Takt 2 s plus Antwortzeit). */
export const NACHLAUF_FENSTER_MS = 5000

/**
 * F45 P (F-1016 d): Sperrt Senden, wenn ein anderer Lauf aktiv ist als der ausstehende Lauf des angezeigten Modus —
 * ein Chat-Lauf im anderen Reiter, ein Baulauf oder ein Lauf eines anderen Projekts (D13: genau ein aktiver
 * Arbeitsstrang). Ohne diese Sperre endete Senden in 409.
 * Reihenfolge:
 * 1. Hat der andere Modus dieser Seite einen ausstehenden Lauf oder sendet gerade: „anderer Reiter“ — sofort, ohne
 *    auf den nächsten Poll zu warten.
 * 2. Sonst aus /api/zustand.aktiverLauf: kein aktiver Lauf oder der eigene ausstehende → frei; ein eigener Lauf, der
 *    vor höchstens NACHLAUF_FENSTER_MS endete → frei (der Poll ist bis zu einen Takt älter als das Ende); ein
 *    Chat-Lauf desselben Modus (z. B. nach Neuladen, bevor der Chat ihn übernimmt) → „läuft“; ein Chat-Lauf des
 *    anderen Modus → „anderer Reiter“; jeder andere Lauf → „anderer Lauf“.
 * @param aktiverLauf - zustand.aktiverLauf ({ aktiv, laufId }) oder null
 * @param laeufe - { ausstehend: { jarvis, sparring } (laufId oder null), sendet: { jarvis, sparring } (boolean), kuerzlichBeendet: Map laufId → Endzeit (ms), jetzt: ms }
 * @param modus - angezeigter Modus ('jarvis' | 'sparring')
 * @returns null (frei) | { art: 'laeuft' } | { art: 'andererReiter', modus } | { art: 'andererLauf' }
 */
export function sperreDurchAnderenLauf(aktiverLauf, { ausstehend, sendet = {}, kuerzlichBeendet = new Map(), jetzt = Date.now() }, modus) {
  for (const andererModus of Object.keys(ausstehend)) {
    if (andererModus !== modus && (ausstehend[andererModus] !== null || sendet[andererModus] === true)) return { art: 'andererReiter', modus: andererModus }
  }
  if (aktiverLauf?.aktiv !== true) return null
  const laufId = typeof aktiverLauf.laufId === 'string' ? aktiverLauf.laufId : null
  if (laufId !== null && laufId === ausstehend[modus]) return null
  const beendetAm = laufId === null ? undefined : kuerzlichBeendet.get(laufId)
  if (beendetAm !== undefined && jetzt - beendetAm <= NACHLAUF_FENSTER_MS) return null
  const laufModus = chatModusDesAktivenLaufs(aktiverLauf)
  if (laufModus === modus) return { art: 'laeuft' }
  if (laufModus !== null) return { art: 'andererReiter', modus: laufModus }
  return { art: 'andererLauf' }
}

/**
 * F45 P (F-1016 c): deutscher Klartext des Servers zu einem Fehler-Eintrag, wenn er kein Code ist — angezeigt nur, wenn
 * Deutsch gewählt ist (E-F44-2: Serverantworten werden nicht übersetzt; in en/tr/ru erscheint er nie).
 * @param fehler - { art, grund, code? } oder null
 * @returns Klartext oder null
 */
export function klartextDesEintrags(fehler) {
  return typeof fehler?.grund === 'string' && fehler.grund.trim() !== '' && !CODE_MUSTER.test(fehler.grund) ? fehler.grund : null
}
