/**
 * Datei: src/ak-pruefung/index.ts
 *
 * Zweck: F35 WS-2 (features/F35/feature.md, löst M5-Bestehensbedingung 2
 * "jedes AK trägt am Ende ein Urteil im Review"). Reine Funktionen, kein
 * I/O (Muster src/korrekturschleife/index.ts, src/feature-auftrag/index.ts):
 * pruefeAkUrteile vergleicht die von WS-1 am Auftrag hinterlegten
 * Akzeptanzkriterien (src/auftrag/types.ts' AuftragAkzeptanzkriterium) mit
 * den vom code-reviewer gelieferten ak_urteile
 * (schemas/ergebnis-code-reviewer.schema.json) und meldet jede Abweichung
 * als eigenen Verstoß-String — Muster validiereAuftragAkzeptanzkriterien
 * (src/auftrag/index.ts): eine leere Liste heißt gültig, kein eigener
 * ok/ok:false-Wrapper. baueAkPruefInstruktion baut den Zusatzblock, den der
 * Aufrufer (scripts/leitstand-server.mjs, starteWorkflowSchritt) an den
 * Auftragstext eines 'code-reviewer'-Schritts anhängt, wenn der Auftrag
 * Akzeptanzkriterien trägt — Muster baueReviewKorrekturInstruktion
 * (src/korrekturschleife/index.ts).
 *
 * Trägt der Auftrag KEINE Akzeptanzkriterien (akzeptanzkriterien fehlt oder
 * ist leer), bleibt pruefeAkUrteile IMMER folgenlos ([] Verstöße) — das
 * Alt-Verhalten vor F35 WS-2 bleibt für jeden Auftrag ohne WS-1-Kopplung
 * unverändert.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, src/workflow/index.ts
 * (Regel 1i, über den vom Aufrufer berechneten akVerstoesse-Wert am
 * SchrittErgebnis — dieses Modul bleibt abhängigkeitsarm und wird von
 * src/workflow/index.ts selbst nicht importiert, Muster scopeVerletzung/
 * stackNichtGefuellt), src/ak-pruefung/ak-pruefung.test.ts.
 */

/** Ein Akzeptanzkriterium, wie es am Auftrag steht — Zwilling von src/auftrag/types.ts' AuftragAkzeptanzkriterium. */
export interface AkPruefungAk {
  id: string
  text: string
}

/** Ein einzelnes AK-Urteil, wie es der code-reviewer liefert — Zwilling von schemas/ergebnis-code-reviewer.schema.json' ak_urteile[]. Bewusst locker typisiert (unknown-Felder möglich): der Rohstrom eines Laufs ist ungeprüfter Text, dieselbe Vorsicht wie bei SchrittErgebnis.urteil (src/workflow/types.ts). */
export interface AkPruefungUrteilEintrag {
  ak_id?: unknown
  urteil?: unknown
  beleg?: unknown
}

/**
 * Reine Funktion: vergleicht die Akzeptanzkriterien eines Auftrags mit den
 * vom Reviewer gelieferten ak_urteile und meldet jede Abweichung.
 *
 * Ein Verstoß entsteht für:
 * - ein AK ohne jedes Urteil,
 * - einen Urteilseintrag mit unbekannter ak_id (kein AK des Auftrags trägt
 *   diese id),
 * - einen Urteilseintrag mit einer bereits gesehenen ak_id (doppelt),
 * - ein Urteil ungleich 'ERFUELLT' (auch 'NICHT_ERFUELLT'/'NICHT_PRUEFBAR'
 *   halten den Workflow an — die inhaltliche Würdigung bleibt Sache des
 *   Menschen, diese Funktion prüft nur "vollständig UND alle ERFUELLT"),
 * - einen leeren oder fehlenden Beleg.
 *
 * @param akzeptanzkriterien - `auftrag.akzeptanzkriterien` — undefined/leer heißt: keine WS-1-Kopplung, IMMER [] Verstöße
 * @param akUrteile - `ak_urteile` aus dem geparsten Reviewer-Ergebnis, roh (kein Array, oder fehlend, zählt als leer)
 * @returns Liste der Regelverletzungen; leer = gültig (alle AK vollständig und ERFUELLT)
 */
export function pruefeAkUrteile(akzeptanzkriterien: AkPruefungAk[] | undefined, akUrteile: unknown): string[] {
  if (akzeptanzkriterien === undefined || akzeptanzkriterien.length === 0) return []

  const bekannteIds = new Set(akzeptanzkriterien.map((ak) => ak.id))
  const eintraege: AkPruefungUrteilEintrag[] = Array.isArray(akUrteile) ? akUrteile : []

  const verstoesse: string[] = []
  const geseheneIds = new Set<string>()

  for (const eintrag of eintraege) {
    const id = typeof eintrag?.ak_id === 'string' && eintrag.ak_id.length > 0 ? eintrag.ak_id : null
    if (id === null) {
      verstoesse.push(`ak_urteile trägt einen Eintrag ohne gültige 'ak_id': ${JSON.stringify(eintrag)}`)
      continue
    }
    if (!bekannteIds.has(id)) {
      verstoesse.push(`ak_urteile trägt die unbekannte ak_id '${id}' — kein Akzeptanzkriterium des Auftrags trägt diese ID`)
    } else if (geseheneIds.has(id)) {
      verstoesse.push(`ak_urteile trägt die ak_id '${id}' mehrfach`)
    }
    geseheneIds.add(id)

    if (eintrag.urteil !== 'ERFUELLT') {
      const urteilText = typeof eintrag.urteil === 'string' && eintrag.urteil.length > 0 ? `'${eintrag.urteil}'` : 'fehlend'
      verstoesse.push(`AK '${id}': Urteil ${urteilText} ist nicht 'ERFUELLT'`)
    }
    if (typeof eintrag.beleg !== 'string' || eintrag.beleg.trim().length === 0) {
      verstoesse.push(`AK '${id}': Beleg fehlt oder ist leer`)
    }
  }

  for (const ak of akzeptanzkriterien) {
    if (!geseheneIds.has(ak.id)) {
      verstoesse.push(`AK '${ak.id}' hat kein Urteil in 'ak_urteile'`)
    }
  }

  return verstoesse
}

/**
 * Baut den Zusatzblock, der an den Auftragstext eines 'code-reviewer'-Schritts angehängt wird,
 * wenn der Auftrag Akzeptanzkriterien trägt (Muster baueReviewKorrekturInstruktion,
 * src/korrekturschleife/index.ts). Reine Funktion, kein I/O — der Aufrufer ruft sie nur bei
 * nicht-leeren akzeptanzkriterien auf; ohne AKs bleibt der Auftragstext bitgenau unverändert
 * (AK3).
 * @param akzeptanzkriterien - `auftrag.akzeptanzkriterien`, nicht-leer (Vorbedingung des Aufrufers)
 * @param nichtZiele - `auftrag.nicht_ziele` — kann leer sein, dann entfällt der Nicht-Ziele-Absatz
 * @returns der Zusatzblock als Text, an `auftragstext` anzuhängen (Trennzeile bleibt Sache des Aufrufers)
 */
export function baueAkPruefInstruktion(akzeptanzkriterien: AkPruefungAk[], nichtZiele: string[]): string {
  const zeilen = [
    "Dieser Auftrag trägt strukturierte Akzeptanzkriterien (AK). Liefere im Ergebnisfeld 'ak_urteile' für JEDES der folgenden AK genau EINEN Eintrag:",
    ...akzeptanzkriterien.map((ak) => `- ${ak.id}: ${ak.text}`),
  ]
  if (nichtZiele.length > 0) {
    zeilen.push(
      '',
      'Nicht-Ziele dieses Auftrags — eine Änderung, die eines davon berührt, ist ein eigener Befund mit schwere HOCH:',
      ...nichtZiele.map((z) => `- ${z}`)
    )
  }
  zeilen.push(
    '',
    "Je Eintrag: ak_id (exakt wie oben), urteil ('ERFUELLT'/'NICHT_ERFUELLT'/'NICHT_PRUEFBAR') und ein konkreter Beleg (Datei:Zeile, Testname oder beobachtetes Verhalten) — ein Beleg ohne konkrete Fundstelle ist keine ausreichende Grundlage.",
    "'NICHT_PRUEFBAR' ist nur mit einer Begründung im Beleg zulässig, warum eine Prüfung nicht möglich war — kein stillschweigendes Auslassen eines AK."
  )
  return zeilen.join('\n')
}
