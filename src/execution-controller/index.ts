/**
 * Datei: src/execution-controller/index.ts
 *
 * Zweck: Execution Controller (F8 WS-1, state/tasks/f8-execution-
 * controller-ws1.md, state/plan-v1-f8-execution-controller.md Abschnitt
 * 2.1). Führt einen Lauf vollständig durch die Kette F5 → F6a → F7 → F1B
 * in fester Reihenfolge: Kontextpaket bauen, Aufruf konstruieren, Lauf
 * starten, Laufakte klassifizieren, Terminalzustand feststellen. Bricht
 * bei einer Ablehnung von F5 oder F6a sofort mit deren unverändertem
 * Abbruchgrund ab — kein eigener Grundtext, kein nachfolgender Schritt
 * (AK1/AK2). Ruft an keiner Stelle eine der orchestrierten Prüf- oder
 * Klassifikationsfunktionen von F4/F5/F6a/F7 selbst auf, nur deren
 * öffentliche Einstiegspunkte — mechanisch per Grep geprüft (AK1-/AK3-Gate,
 * scripts/check-f8-execution-controller.mjs).
 *
 * Wird aufgerufen von:
 * - (noch niemand — WS-1 ist der erste Aufrufer dieser Kette)
 *
 * Wichtig:
 * Kein eigener Aufruf von schreibeWirkungsmarke für die Haupt-laufId (D5)
 * — starteGateway schreibt die Start-, klassifiziereLauf die
 * Terminalmarke, beide mittelbar. Diese Datei ruft F1B nur über
 * stelleLaufstatusFest (lesend) auf.
 */

import { starteGateway, baueAufruf } from '../claude-code-gateway/index.ts'
import { baueKontextpaket } from '../context-builder/index.ts'
import { stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { klassifiziereLauf } from '../result-evaluator/index.ts'
import type { AusfuehrungsEingaben, AusfuehrungsErgebnis, AusfuehrungsOptionen } from './types.ts'

/**
 * Führt einen Lauf vollständig durch F5 → F6a → F7 → F1B (feste
 * Reihenfolge, plan-v1 Abschnitt 2.1, Schritte 1–5).
 * @param laufId - eindeutige Lauf-Kennung, unverändert an jeden Schritt gereicht
 * @param profilReferenz - Profilbezug, unverändert an F5/F6a/F7 gereicht
 * @param eingaben - Rolle, Anfragen, Budget, Aufrufkonstruktion, Startziel
 * @param optionen - reine Durchreichung an F5/F6a/F7/F1B, nicht selbst interpretiert (D5)
 * @returns den Abbruchgrund von F5/F6a, oder bei vollständigem Durchlauf Klassifikation + Laufstatus
 */
export async function fuehreAufgabeDurch(
  laufId: string,
  profilReferenz: ProfilReferenz,
  eingaben: AusfuehrungsEingaben,
  optionen: AusfuehrungsOptionen = {}
): Promise<AusfuehrungsErgebnis> {
  const kontextpaketErgebnis = baueKontextpaket(laufId, eingaben.rolle, eingaben.anfragen, profilReferenz, eingaben.budget, {
    basisVerzeichnis: optionen.basisVerzeichnis,
    schreiber: optionen.schreiber,
  })
  if (!kontextpaketErgebnis.ok) {
    return { ok: false, stufe: 'kontextpaket', ergebnis: kontextpaketErgebnis }
  }

  const tokens = baueAufruf(eingaben.aufrufEingaben)

  const gatewayErgebnis = await starteGateway(
    {
      laufId,
      profilReferenz,
      tokens,
      werkzeugStartziel: eingaben.werkzeugStartziel,
      werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
      berechtigungskontext: eingaben.berechtigungskontext,
    },
    {
      schreiber: optionen.schreiber,
      basisVerzeichnis: optionen.basisVerzeichnis,
      rohBasisVerzeichnis: optionen.rohBasisVerzeichnis,
      starter: optionen.starter,
      settingsPfad: optionen.settingsPfad,
      aktuelleAutorisierungPfad: optionen.aktuelleAutorisierungPfad,
      startfreigabeRepoWurzel: optionen.startfreigabeRepoWurzel,
    }
  )
  if (!gatewayErgebnis.ok) {
    return { ok: false, stufe: 'gateway', grund: gatewayErgebnis.grund }
  }

  const klassifikation = klassifiziereLauf(
    laufId,
    profilReferenz,
    { laufakte: gatewayErgebnis.laufakte },
    { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: optionen.schreiber }
  )

  const laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: optionen.schreiber })

  return { ok: true, klassifikation, laufStatus }
}
