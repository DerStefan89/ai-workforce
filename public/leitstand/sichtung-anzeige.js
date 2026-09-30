/**
 * Datei: public/leitstand/sichtung-anzeige.js
 *
 * Zweck: F-768 „Sichtung bestätigt – weiter“ — reine Anzeige-Logik ohne DOM, damit
 * scripts/check-fixpaket-f36-nachlauf.mjs sie direkt gegen den Server-Zwilling
 * (ermittleSichtungsHalt in scripts/leitstand-server.mjs) prüfen kann. Maßgeblich bleibt der
 * Server: er prüft zusätzlich den Bypass-Verdacht der Terminalmarke und lehnt sonst mit 409 ab.
 *
 * Wird aufgerufen von: public/leitstand/views/workflows.js; geprüft von
 * scripts/check-fixpaket-f36-nachlauf.mjs (c).
 *
 * Wichtig: F760_HALT_ANFANG und der Schluss-Text müssen wortgleich zu F760_HALT_ANFANG/
 * f760HaltSchluss in scripts/leitstand-server.mjs bleiben — sonst verschwindet der Knopf still.
 * Gate (c) und (d) pinnen das.
 */

/** Anfang des F-760-Halt-Grunds — Zwilling von F760_HALT_ANFANG in scripts/leitstand-server.mjs. */
const F760_HALT_ANFANG = 'Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: '

/**
 * Erkennt den reinen F-760-Halt: Workflow KLAERUNG_ERFORDERLICH, Cursor auf einem
 * 'ausfuehrung'-Schritt mit status VERWEIGERT, lauf_id und nachfolger, Folgeschritt noch startbereit
 * (OFFEN/WARTET_FREIGABE ohne lauf_id), Grund ohne Zusatzgründe (die hängt der Halt mit ' | ' hinter
 * den Schluss).
 * @param daten - WORKFLOW_V0-Datensatz
 * @returns { schrittId, laufId, nachfolger } oder null
 */
export function istSichtungsHaltAnzeige(daten) {
  if (daten?.status !== 'KLAERUNG_ERFORDERLICH' || typeof daten.grund !== 'string' || !Array.isArray(daten.schritte)) return null
  const schritt = daten.schritte.find((s) => s?.schritt_id === daten.aktiver_schritt_id)
  if (schritt === undefined || schritt.rolle !== 'ausfuehrung' || schritt.status !== 'VERWEIGERT') return null
  if (typeof schritt.lauf_id !== 'string' || typeof schritt.nachfolger !== 'string') return null
  const folge = daten.schritte.find((s) => s?.schritt_id === schritt.nachfolger)
  if (folge === undefined || folge.lauf_id !== null || !['OFFEN', 'WARTET_FREIGABE'].includes(folge.status)) return null
  const schluss = `menschliche Sichtung vor Fortsetzung (F-760, Schritt '${schritt.schritt_id}', Lauf '${schritt.lauf_id}')`
  if (!daten.grund.startsWith(F760_HALT_ANFANG) || !daten.grund.endsWith(schluss)) return null
  return { schrittId: schritt.schritt_id, laufId: schritt.lauf_id, nachfolger: schritt.nachfolger }
}

/**
 * Baut die Sichtungsfassung: Cursor auf den Folgeschritt, status OFFEN, alle Schritte unverändert
 * (der VERWEIGERT-Schritt behält status und lauf_id). grund normalisiert der Server ohnehin auf null.
 * @param daten - aktuelle Fassung
 * @param sichtung - istSichtungsHaltAnzeige(daten)
 * @returns neue Fassung (WORKFLOW_V0)
 */
export function baueSichtungsFassung(daten, sichtung) {
  return { ...daten, status: 'OFFEN', aktiver_schritt_id: sichtung.nachfolger, grund: null }
}
