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
 * F-824 (F36-Reallauf: der Architekt fragte bereits entschiedene Punkte erneut): die optionalen
 * Abschnitte '## Datenmodell' und '## Security…' (Name laut src/workboard/feature-abschnitte.ts
 * 'Security/Permissions'; die Coach-Vorlage in src/product-coach kennt beide nicht, sie entstehen
 * im Architekten-Schritt bzw. von Hand) gehen als „Geklärte Vorgaben“ in den Auftragstext. Fehlen
 * beide, bleibt der Auftragstext bitgenau wie vorher. Kein Schemafeld — nur Text.
 *
 * F44 WS-3b: leseFeatureAkteAnzeige liefert dieselben Teile (Titel, Ziel, Nicht-Ziele, AKs) für
 * das Detail im Leitstand (GET /api/features/<id>/akte) — über denselben internen Leser leseAkte
 * wie baueAuftragAusFeatureAkte, keine zweite Parse-Logik.
 *
 * F45 B5a-1 (features/F45/plan-b5a1-v2.md): findeAbschnitt, leseAbschnitt, leseTopLevelBullets und
 * leseAkzeptanzkriterien sind exportiert — der Schreiber (akte-schreiben.ts) ersetzt genau die Spanne, die
 * hier gelesen wird; leseFeatureEntscheidungen liefert die E-Bullets aus '## Entscheidungen' (F-995).
 *
 * Wird aufgerufen von: scripts/leitstand/routen-f35.mjs, src/feature-auftrag/akte-schreiben.ts,
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

/** F44 WS-3b: lesbare Teile einer Feature-Akte für das Leitstand-Detail (leseFeatureAkteAnzeige). */
export type FeatureAkteAnzeige =
  | { ok: true; titel: string; ziel: string; nicht_ziele: string[]; akzeptanzkriterien: FeatureAuftragAkzeptanzkriterium[] }
  | { ok: false; grund: string }

/**
 * F-824: übernommene technische Abschnitte in Ausgabe-Reihenfolge — exakter Überschriftsname (Regex-
 * Fragment für leseAbschnitt mit exakt=true, also weder '## Security-Review' noch '## Datenmodell (alt)')
 * und Überschrift im Auftrag.
 */
const GEKLAERTE_ABSCHNITTE = [
  { suchname: 'Datenmodell', ueberschrift: 'Datenmodell' },
  { suchname: 'Security(?:/Permissions)?', ueberschrift: 'Security' },
] as const

/** F-824: ein Abschnitt, der nur einen Platzhalter trägt (Skelett-Füllung, „offen“, „TBD“), ist nicht entschieden und geht nicht mit. */
const PLATZHALTER_MUSTER = /\[FÜLLUNG|^(?:offen|noch offen|tbd|todo)\.?$/i

/**
 * F-824: Längenobergrenze je übernommenem Abschnitt (Zeichen, nach trim). Längeres wird abgeschnitten
 * und mit Verweis auf die Akte markiert — der Auftragstext selbst hat im Schema keine Obergrenze
 * (schemas/kontrollzustand-auftrag-payload.schema.json), die Grenze schützt nur den Kontext des Laufs.
 */
export const GEKLAERTER_ABSCHNITT_OBERGRENZE = 4000

/** Erkennt eine explizite AK-ID am Bullet-Anfang ('AK<n>', optional gefolgt von ':'/'.'/')' und Leerzeichen). */
const AK_ID_PRAEFIX_MUSTER = /^AK(\d+)\b[:.)]?\s*/

/**
 * Liest den Text EINES '## <Name>'-Abschnitts (Muster
 * src/workboard/feature-abschnitte.ts' leseAbschnitt) — der Rest des
 * Dokuments ab der Überschriftzeile bis zur nächsten '## '-Überschrift
 * oder Dateiende.
 * @param inhalt - Text der Akte
 * @param name - Überschriftsname bzw. Regex-Fragment
 * @param exakt - true: die Überschriftzeile trägt nur den Namen (F-824); sonst genügt ein Wortanfang (Bestand)
 * @returns Abschnittstext (ungetrimmt), oder null, wenn die Überschrift fehlt
 */
export function leseAbschnitt(inhalt: string, name: string, exakt = false): string | null {
  const spanne = findeAbschnitt(inhalt, name, exakt)
  return spanne === null ? null : inhalt.slice(spanne.kopfEnde, spanne.koerperEnde)
}

/**
 * F45 B5a-1 (Advisor B7): die Spanne EINES '## <Name>'-Abschnitts — dieselben Grenzen für den Leser
 * (leseAbschnitt) und den Schreiber (src/feature-auftrag/akte-schreiben.ts), damit das Bearbeiten genau
 * den Abschnitt ersetzt, den Anzeige und Bau-Auftrag lesen.
 * @param inhalt - Text der Akte
 * @param name - Überschriftsname bzw. Regex-Fragment
 * @param exakt - true: die Überschriftzeile trägt nur den Namen (F-824); sonst genügt ein Wortanfang (Bestand)
 * @returns { kopfStart, kopfEnde, koerperEnde } — kopfStart = Beginn der Überschriftzeile, kopfEnde = Ende des Treffers (vor
 *   `\r\n` bzw. `\n`: in JS trifft `.` kein `\r`, `$` mit `m`-Flag greift auch vor `\r`), koerperEnde = Beginn der nächsten
 *   '## '-Überschrift oder Dateiende; null, wenn die Überschrift fehlt
 */
export function findeAbschnitt(inhalt: string, name: string, exakt = false): { kopfStart: number; kopfEnde: number; koerperEnde: number } | null {
  const ueberschrift = new RegExp(exakt ? `^##[ \\t]+${name}[ \\t]*$` : `^##\\s+${name}\\b.*$`, 'm')
  const treffer = ueberschrift.exec(inhalt)
  if (treffer === null) return null
  const kopfEnde = treffer.index + treffer[0].length
  const naechsteUeberschrift = /^##\s+/m.exec(inhalt.slice(kopfEnde))
  return { kopfStart: treffer.index, kopfEnde, koerperEnde: naechsteUeberschrift === null ? inhalt.length : kopfEnde + naechsteUeberschrift.index }
}

/** Erster nicht-leerer Zeileninhalt eines Abschnitts (Muster extrahiereTitel, src/workboard/features.ts). @returns getrimmter Text, oder null bei einem leeren Abschnitt */
function ersteNichtLeereZeile(abschnitt: string): string | null {
  for (const zeile of abschnitt.split(/\r?\n/)) {
    if (zeile.trim() !== '') return zeile.trim()
  }
  return null
}

/**
 * Erkennt eine Top-Level-Bullet-Einleitung am Zeilenanfang: '- ', '* ', '1. ' oder '1) '
 * (F-732, state/findings.md — vor der Behebung erkannte leseTopLevelBullets ausschließlich
 * '- ', jede Feature-Akte mit '*'- oder nummerierten Listen unter '## Akzeptanzkriterien'
 * lieferte dadurch 0 AK statt eines Ablehnungsgrunds ODER (bei zufällig vorhandenen
 * '- '-Bullets an anderer Stelle) ein irreführend leeres Ergebnis).
 */
export const BULLET_EINLEITUNG_MUSTER = /^(?:[-*]|\d+[.)])\s+(.*)$/

/** Entfernt eine führende Markdown-Checkbox ('[ ] '/'[x] '/'[X] ') vom Bullet-Text (F-732) — der reine AK-Text soll die Checkbox nicht tragen. */
export const CHECKBOX_PRAEFIX_MUSTER = /^\[[ xX]\]\s+/

/**
 * Top-Level-Bullets eines Abschnitts: eine Zeile, die mit '- ', '* ', '1. ' oder '1) ' beginnt
 * (optional gefolgt von einer Checkbox '[ ]'/'[x]'/'[X]', die entfernt wird), startet einen
 * neuen Bullet; jede nicht-leere Folgezeile bis zum nächsten Top-Level-Bullet gehört als
 * Fortsetzungszeile dazu (getrimmt angehängt).
 * @returns getrimmte Bullet-Texte in Dokumentreihenfolge; leere Bullets ausgeschlossen
 */
export function leseTopLevelBullets(abschnitt: string): string[] {
  const bullets: string[] = []
  let laufend: string[] | null = null
  for (const zeile of abschnitt.split(/\r?\n/)) {
    const bulletTreffer = BULLET_EINLEITUNG_MUSTER.exec(zeile)
    if (bulletTreffer !== null) {
      if (laufend !== null) bullets.push(laufend.join('\n').trim())
      const ohneCheckbox = bulletTreffer[1].replace(CHECKBOX_PRAEFIX_MUSTER, '')
      laufend = [ohneCheckbox]
      continue
    }
    if (laufend !== null && zeile.trim() !== '') laufend.push(zeile.trim())
  }
  if (laufend !== null) bullets.push(laufend.join('\n').trim())
  return bullets.filter((bullet) => bullet.length > 0)
}

/**
 * F-824: Block „Geklärte Vorgaben“ aus '## Datenmodell' und '## Security' bzw. '## Security/Permissions'
 * — null, wenn beide fehlen, leer sind oder nur einen Platzhalter tragen (dann bleibt der Auftragstext
 * bitgenau). Je Abschnitt höchstens GEKLAERTER_ABSCHNITT_OBERGRENZE Zeichen; die Kürzung zählt
 * UTF-16-Einheiten und kann mitten in einem Code-Fence liegen (kosmetisch, der Verweis nennt die Akte).
 * Weitere technische Abschnitte (State/Persistenz, Interfaces/Contracts …) gehen bewusst nicht mit.
 * @param inhalt - vollständiger Text der Feature-Akte
 * @param featureId - Ordner-id der Akte (Verweis bei Kürzung)
 * @returns Textblock oder null
 */
function leseGeklaerteVorgaben(inhalt: string, featureId: string): string | null {
  const teile: string[] = []
  for (const { suchname, ueberschrift } of GEKLAERTE_ABSCHNITTE) {
    const text = leseAbschnitt(inhalt, suchname, true)?.trim() ?? ''
    if (text.length === 0 || PLATZHALTER_MUSTER.test(text)) continue
    const gekuerzt = text.length > GEKLAERTER_ABSCHNITT_OBERGRENZE ? `${text.slice(0, GEKLAERTER_ABSCHNITT_OBERGRENZE)}\n… (gekürzt, vollständig in features/${featureId}/feature.md)` : text
    teile.push(`${ueberschrift}\n${gekuerzt}`)
  }
  if (teile.length === 0) return null
  return `Geklärte Vorgaben (aus der Feature-Akte, bereits entschieden — nicht erneut fragen)\n\n${teile.join('\n\n')}`
}

/**
 * Akzeptanzkriterien aus dem Text eines '## Akzeptanzkriterien'-Abschnitts (aus leseAkte herausgelöst,
 * F45 B5a-1 — der Schreiber vergleicht damit den alten Stand). Regeln siehe leseAkte.
 * @param akAbschnitt - Abschnittstext oder null, wenn der Abschnitt fehlt
 * @returns { ok: true, akzeptanzkriterien } | { ok: false, grund } (kein Bullet bzw. doppelte ID)
 */
export function leseAkzeptanzkriterien(akAbschnitt: string | null): { ok: true; akzeptanzkriterien: FeatureAuftragAkzeptanzkriterium[] } | { ok: false; grund: string } {
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
  return { ok: true, akzeptanzkriterien }
}

/** Eine Entscheidung der Akte (F-995): Kennung am Bullet-Anfang und vollständiger Bullet-Text. */
export interface FeatureAkteEntscheidung {
  id: string
  text: string
}

/**
 * Kennung am Anfang eines Entscheidungs-Bullets, optional in `**` gefasst: 'E-' plus Bestandteile aus Buchstaben und
 * Ziffern mit '-', mindestens eine Ziffer (E-188, E-F45-1, E-B5-2 — nicht „E-Mail“). Eine Kennung mitten im Text
 * („… Muster E-F45-7“) zählt nicht (Advisor B5a-1 C1).
 */
const ENTSCHEIDUNG_KENNUNG_MUSTER = /^(?:\*\*)?(E-(?=[0-9A-Za-z-]*[0-9])[0-9A-Za-z]+(?:-[0-9A-Za-z]+)*)(?![0-9A-Za-z-])/

/**
 * F45 B5a-1 (F-995): die Entscheidungen einer Akte — Top-Level-Bullets unter '## Entscheidungen', die mit einer
 * E-Kennung beginnen (ENTSCHEIDUNG_KENNUNG_MUSTER); andere Bullets (z. B. „**Sammlung als Basis**“) fehlen.
 * Reine Funktion, derselbe Bullet-Leser wie Nicht-Ziele und AKs.
 * @param inhalt - Text der Akte
 * @returns Entscheidungen in Dokumentreihenfolge; [] ohne Abschnitt
 */
export function leseFeatureEntscheidungen(inhalt: string): FeatureAkteEntscheidung[] {
  const abschnitt = leseAbschnitt(inhalt, 'Entscheidungen')
  if (abschnitt === null) return []
  const entscheidungen: FeatureAkteEntscheidung[] = []
  for (const bullet of leseTopLevelBullets(abschnitt)) {
    const treffer = ENTSCHEIDUNG_KENNUNG_MUSTER.exec(bullet)
    if (treffer !== null) entscheidungen.push({ id: treffer[1], text: bullet })
  }
  return entscheidungen
}

/**
 * Gemeinsamer Leser der Akte für den Bau-Auftrag (baueAuftragAusFeatureAkte) und die Anzeige
 * (leseFeatureAkteAnzeige, F44 WS-3b) — eine Parse-Logik, damit das Detail nie andere
 * Kriterien zeigt, als der Auftrag übernähme.
 *
 * Jedes Top-Level-Bullet unter '## Akzeptanzkriterien' ist ein AK.
 * Beginnt ein Bullet mit 'AK<n>' (optional ':'/'.'/')' danach), wird diese
 * ID übernommen und aus dem Bullet-Text entfernt; sonst erhält der Bullet
 * seine Position (1-basiert) als ID (AK1…n).
 *
 * '## Ziel' fehlt/leer, kein Bullet unter '## Akzeptanzkriterien' oder eine
 * doppelte AK-ID: ok:false mit Grund, kein Ergebnis.
 * @param inhalt - vollständiger Text von features/<featureId>/feature.md
 * @param featureId - Ordner-id der Akte (Fallback-Titel)
 * @returns { ok: true, titel, ziel (getrimmt), nicht_ziele, akzeptanzkriterien } | { ok: false, grund }
 */
function leseAkte(inhalt: string, featureId: string): FeatureAkteAnzeige {
  const zielAbschnitt = leseAbschnitt(inhalt, 'Ziel')
  if (zielAbschnitt === null || zielAbschnitt.trim().length === 0) {
    return { ok: false, grund: "Abschnitt '## Ziel' fehlt oder ist leer — kein Auftrag ableitbar" }
  }

  const akAbschnitt = leseAbschnitt(inhalt, 'Akzeptanzkriterien')
  const ak = leseAkzeptanzkriterien(akAbschnitt)
  if (!ak.ok) return ak
  const akzeptanzkriterien = ak.akzeptanzkriterien

  const nichtZieleAbschnitt = leseAbschnitt(inhalt, 'Nicht-Ziele')
  const nicht_ziele = nichtZieleAbschnitt === null ? [] : leseTopLevelBullets(nichtZieleAbschnitt)

  const titelAbschnitt = leseAbschnitt(inhalt, 'Titel')
  const titel = (titelAbschnitt !== null ? ersteNichtLeereZeile(titelAbschnitt) : null) ?? featureId

  return { ok: true, titel, ziel: zielAbschnitt.trim(), nicht_ziele, akzeptanzkriterien }
}

/**
 * Liest Titel, Ziel, Nicht-Ziele und Akzeptanzkriterien einer Feature-Akte für die Anzeige im
 * Leitstand-Detail (F44 WS-3b, GET /api/features/<id>/akte). Reine Funktion, kein I/O; dieselben
 * Leser und dieselben Ablehnungsgründe wie baueAuftragAusFeatureAkte.
 * @param inhalt - vollständiger Text von features/<featureId>/feature.md
 * @param featureId - Ordner-id der Akte (Fallback-Titel)
 * @returns { ok: true, titel, ziel, nicht_ziele, akzeptanzkriterien } | { ok: false, grund }
 */
export function leseFeatureAkteAnzeige(inhalt: string, featureId: string): FeatureAkteAnzeige {
  return leseAkte(inhalt, featureId)
}

/**
 * Baut deterministisch einen Bau-Auftrag aus einer Feature-Akte (F35 WS-1,
 * AK3). Reine Funktion, kein I/O — gleiche Akte liefert immer dasselbe
 * Ergebnis (kein Zeitstempel, keine Zufallskomponente). Titel, Ziel,
 * Nicht-Ziele und AKs liest leseAkte (Regeln dort).
 * @param inhalt - vollständiger Text von features/<featureId>/feature.md
 * @param featureId - Ordner-id der Akte (Fallback-Titel, Referenzzeile `workitem:feature:<featureId>`)
 * @returns bei Erfolg { ok: true, titel, auftragstext, akzeptanzkriterien, nicht_ziele, herkunft }, sonst { ok: false, grund }
 */
export function baueAuftragAusFeatureAkte(inhalt: string, featureId: string): FeatureAuftragBauergebnis {
  const akte = leseAkte(inhalt, featureId)
  if (!akte.ok) return akte
  const { titel, ziel, nicht_ziele, akzeptanzkriterien } = akte

  const textTeile = [`Ziel\n${ziel}`]
  if (nicht_ziele.length > 0) {
    textTeile.push(`Nicht-Ziele\n${nicht_ziele.map((eintrag) => `- ${eintrag}`).join('\n')}`)
  }
  textTeile.push(`Akzeptanzkriterien\n${akzeptanzkriterien.map((ak) => `- ${ak.id}: ${ak.text}`).join('\n')}`)
  const geklaert = leseGeklaerteVorgaben(inhalt, featureId)
  if (geklaert !== null) textTeile.push(geklaert)
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
