/**
 * Datei: src/feature-auftrag/index.ts
 *
 * Zweck: F35 WS-1 (features/F35/feature.md, zielfassung §13.6 E-M5-16,
 * state/findings.md F-728) — leitet deterministisch einen Bau-Auftrag aus
 * einer Feature-Akte (features/<id>/feature.md) ab. Reine Funktion ohne
 * I/O (Muster src/workboard/features.ts) — liest NICHT selbst von Platte;
 * der Aufrufer (scripts/leitstand/routen-f35.mjs) übergibt den bereits
 * gelesenen Dateiinhalt.
 *
 * Abschnittserkennung (leseAbschnitt) folgt demselben Muster wie
 * src/workboard/feature-abschnitte.ts' leseAbschnitt: exakte, case-sensitive
 * '## <Name>'-Überschrift, Abschnittstext bis zur nächsten '## '-Überschrift
 * oder Dateiende.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-f35.mjs,
 * scripts/check-f35-ws1-feature-auftrag.mjs.
 */

/** Ein Akzeptanzkriterium des abgeleiteten Auftrags — Zwilling von src/auftrag/types.ts' AuftragAkzeptanzkriterium. */
export interface FeatureAuftragAkzeptanzkriterium {
  id: string
  text: string
}

export interface FeatureAuftragErgebnis {
  titel: string
  auftragstext: string
  akzeptanzkriterien: FeatureAuftragAkzeptanzkriterium[]
  nicht_ziele: string[]
  herkunft: { art: 'feature_akte' }
}

export type FeatureAuftragBauergebnis = ({ ok: true } & FeatureAuftragErgebnis) | { ok: false; grund: string }

/** Erkennt eine explizite AK-ID am Bullet-Anfang ('AK<n>', optional gefolgt von ':'/'.'/')' und Leerzeichen). */
const AK_ID_PRAEFIX_MUSTER = /^AK(\d+)\b[:.)]?\s*/

/**
 * Liest den Text EINES '## <Name>'-Abschnitts (Muster
 * src/workboard/feature-abschnitte.ts' leseAbschnitt) — der Rest des
 * Dokuments ab der Überschriftzeile bis zur nächsten '## '-Überschrift
 * oder Dateiende.
 * @returns Abschnittstext (ungetrimmt), oder null, wenn die Überschrift fehlt
 */
function leseAbschnitt(inhalt: string, name: string): string | null {
  const ueberschrift = new RegExp(`^##\\s+${name}\\b.*$`, 'm')
  const treffer = ueberschrift.exec(inhalt)
  if (treffer === null) return null
  const restAbUeberschrift = inhalt.slice(treffer.index + treffer[0].length)
  const naechsteUeberschrift = /^##\s+/m.exec(restAbUeberschrift)
  return naechsteUeberschrift === null ? restAbUeberschrift : restAbUeberschrift.slice(0, naechsteUeberschrift.index)
}

/** Erster nicht-leerer Zeileninhalt eines Abschnitts (Muster extrahiereTitel, src/workboard/features.ts). @returns getrimmter Text, oder null bei einem leeren Abschnitt */
function ersteNichtLeereZeile(abschnitt: string): string | null {
  for (const zeile of abschnitt.split(/\r?\n/)) {
    if (zeile.trim() !== '') return zeile.trim()
  }
  return null
}

/**
 * Top-Level-Bullets eines Abschnitts: eine Zeile, die mit '- ' beginnt,
 * startet einen neuen Bullet; jede nicht-leere Folgezeile bis zum nächsten
 * Top-Level-Bullet gehört als Fortsetzungszeile dazu (getrimmt angehängt).
 * @returns getrimmte Bullet-Texte in Dokumentreihenfolge; leere Bullets ausgeschlossen
 */
function leseTopLevelBullets(abschnitt: string): string[] {
  const bullets: string[] = []
  let laufend: string[] | null = null
  for (const zeile of abschnitt.split(/\r?\n/)) {
    const bulletTreffer = /^-\s+(.*)$/.exec(zeile)
    if (bulletTreffer !== null) {
      if (laufend !== null) bullets.push(laufend.join('\n').trim())
      laufend = [bulletTreffer[1]]
      continue
    }
    if (laufend !== null && zeile.trim() !== '') laufend.push(zeile.trim())
  }
  if (laufend !== null) bullets.push(laufend.join('\n').trim())
  return bullets.filter((bullet) => bullet.length > 0)
}

/**
 * Baut deterministisch einen Bau-Auftrag aus einer Feature-Akte (F35 WS-1,
 * AK3). Reine Funktion, kein I/O — gleiche Akte liefert immer dasselbe
 * Ergebnis (kein Zeitstempel, keine Zufallskomponente).
 *
 * Jedes Top-Level-Bullet unter '## Akzeptanzkriterien' ist ein AK.
 * Beginnt ein Bullet mit 'AK<n>' (optional ':'/'.'/')' danach), wird diese
 * ID übernommen und aus dem Bullet-Text entfernt; sonst erhält der Bullet
 * seine Position (1-basiert) als ID (AK1…n).
 *
 * '## Ziel' fehlt/leer oder kein Bullet unter '## Akzeptanzkriterien':
 * ok:false mit Grund, kein Ergebnis.
 * @param inhalt - vollständiger Text von features/<featureId>/feature.md
 * @param featureId - Ordner-id der Akte (Fallback-Titel, Referenzzeile `workitem:feature:<featureId>`)
 * @returns bei Erfolg { ok: true, titel, auftragstext, akzeptanzkriterien, nicht_ziele, herkunft }, sonst { ok: false, grund }
 */
export function baueAuftragAusFeatureAkte(inhalt: string, featureId: string): FeatureAuftragBauergebnis {
  const zielAbschnitt = leseAbschnitt(inhalt, 'Ziel')
  if (zielAbschnitt === null || zielAbschnitt.trim().length === 0) {
    return { ok: false, grund: "Abschnitt '## Ziel' fehlt oder ist leer — kein Auftrag ableitbar" }
  }

  const akAbschnitt = leseAbschnitt(inhalt, 'Akzeptanzkriterien')
  const akBullets = akAbschnitt === null ? [] : leseTopLevelBullets(akAbschnitt)
  if (akBullets.length === 0) {
    return { ok: false, grund: "Abschnitt '## Akzeptanzkriterien' fehlt oder enthält keinen Bullet — kein Auftrag ableitbar" }
  }

  const akzeptanzkriterien: FeatureAuftragAkzeptanzkriterium[] = []
  const vergebeneIds = new Set<string>()
  for (const [index, bullet] of akBullets.entries()) {
    const praefixTreffer = AK_ID_PRAEFIX_MUSTER.exec(bullet)
    const eintrag = praefixTreffer !== null ? { id: `AK${praefixTreffer[1]}`, text: bullet.slice(praefixTreffer[0].length).trim() } : { id: `AK${index + 1}`, text: bullet }
    // Eine explizite ID kann mit der Positions-ID eines anderen Bullets kollidieren (z. B. 'AK2:'
    // als erster Bullet, ein zweiter Bullet ohne ID erhielte sonst stillschweigend dieselbe
    // Positions-ID 'AK2') — beide Vergabearten teilen sich denselben Namensraum, eine Kollision
    // ist ein Fehler in der Akte, keine stillschweigend verschluckte Duplikat-ID (Reviewer-Befund).
    if (vergebeneIds.has(eintrag.id)) {
      return { ok: false, grund: `Akzeptanzkriterium-ID '${eintrag.id}' ist doppelt vergeben (Bullet ${index + 1} unter '## Akzeptanzkriterien') — kein Auftrag ableitbar` }
    }
    vergebeneIds.add(eintrag.id)
    akzeptanzkriterien.push(eintrag)
  }

  const nichtZieleAbschnitt = leseAbschnitt(inhalt, 'Nicht-Ziele')
  const nicht_ziele = nichtZieleAbschnitt === null ? [] : leseTopLevelBullets(nichtZieleAbschnitt)

  const titelAbschnitt = leseAbschnitt(inhalt, 'Titel')
  const titel = (titelAbschnitt !== null ? ersteNichtLeereZeile(titelAbschnitt) : null) ?? featureId

  const textTeile = [`Ziel\n${zielAbschnitt.trim()}`]
  if (nicht_ziele.length > 0) {
    textTeile.push(`Nicht-Ziele\n${nicht_ziele.map((eintrag) => `- ${eintrag}`).join('\n')}`)
  }
  textTeile.push(`Akzeptanzkriterien\n${akzeptanzkriterien.map((ak) => `- ${ak.id}: ${ak.text}`).join('\n')}`)
  textTeile.push(`workitem:feature:${featureId}`)

  return {
    ok: true,
    titel,
    auftragstext: textTeile.join('\n\n'),
    akzeptanzkriterien,
    nicht_ziele,
    herkunft: { art: 'feature_akte' },
  }
}
