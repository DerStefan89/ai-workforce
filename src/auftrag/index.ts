/**
 * Datei: src/auftrag/index.ts
 *
 * Zweck: Auftrag-Modul (F11 WS-1, state/plan-v1-f11-auftrag-ws1.md
 * Abschnitt 2.1, state/tasks/f11-auftrag-ws1.md). Registriert einen
 * Auftrag (titel/auftragstext) als eigenständiges AUFTRAG_V0-Kernartefakt
 * unter der Artefakt-ID `auftrag-<auftragId>`.
 *
 * Eigenständiges Modul (D1, wie F5/F9 gegenüber F2): ruft F2s
 * registriereKernArtefakt ausschließlich von außen auf, kein Eingriff in
 * src/lineage-registry/. Ein Auftrag ist der Wurzelknoten eines
 * Vorhabensstrangs — er zitiert keine vorherigen Artefakte, `eingaben`
 * bleibt bewusst ein leeres Array (D2).
 *
 * F45 B2a-2 (Arbeitspaket): additive Felder (bereiche, risiko, feature_ref, einrichtung), Pflicht-AK je Herkunft
 * (validiereAuftragPflichtfelder), Prüfung vor dem Schreiben, baueArbeitspaketBlock als einzige Textquelle des
 * Arbeitspaket-Blocks für Architekt und Ausführung, gleicheEinrichtungslisteAb für die Übernahme der Einrichtung aus dem
 * Architekt-Ergebnis. Aufgerufen außerdem von scripts/leitstand-server.mjs, scripts/leitstand/routen-f35.mjs und
 * scripts/check-f45-b2a2-arbeitspaket.mjs.
 *
 * F45 B2b-3e-2 (F-1123 (5), Entscheidung A2 = Zwilling): pruefeBereich und pruefeBudgetTokens sind die eine Regel für
 * `bereiche` und `budget_tokens`; ihre Kopie für den Browser liegt in public/leitstand/arbeitspaket-felder.js (keine
 * Abhängigkeit src → public), das Gate scripts/check-f45-b2b3e2-formular.mjs lässt beide über dieselbe Fall-Tabelle urteilen.
 */

import { registriereKernArtefakt } from '../lineage-registry/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import type { AuftragV0Daten, Einrichtungsschritt, Ereignis, Optionen } from './types.ts'

/** Zwilling des 'herkunft.art'-Enums in schemas/kontrollzustand-auftrag-payload.schema.json und src/auftrag/types.ts' AuftragHerkunftArt. */
const HERKUNFT_ARTEN = new Set(['projekt_interview', 'sparring', 'jarvis', 'manuell', 'feature_akte', 'finding'])

/** Zwilling von schemas/kontrollzustand-auftrag-payload.schema.json' akzeptanzkriterien[].id-Pattern (F35 WS-1) — Muster der von baueAuftragAusFeatureAkte (src/feature-auftrag/index.ts) vergebenen IDs. */
const AK_ID_MUSTER = /^AK[0-9]+$/

/** F45 B2a-2: Herkünfte, deren Auftrag mindestens ein AK tragen muss (F-938) — Feature-Akte und Finding. */
export const HERKUNFT_MIT_AK_PFLICHT: ReadonlySet<string> = new Set(['feature_akte', 'finding'])

/** Zwillinge der Arbeitspaket-Felder in schemas/kontrollzustand-auftrag-payload.schema.json (F45 B2a-2). */
const RISIKEN = new Set(['niedrig', 'mittel', 'hoch'])
/** Feature-ID wie in docs/projekt/roadmap.json (schemas/roadmap.schema.json, FEATURE_ID_MUSTER in src/projektkontext). */
const FEATURE_REF_MUSTER = /^F[0-9]+[A-Za-z]?$/
const EINRICHTUNG_ID_MUSTER = /^E[0-9]+$/
const EINRICHTUNG_WANN = new Set(['vor_dem_bau', 'waehrend_des_baus'])
const EINRICHTUNG_STATUS = new Set(['offen', 'erledigt'])

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: Ereignis): void {
  console.log(JSON.stringify(ereignis))
}

function stillerLineageSchreiber(): void {
  // Unterdrückt F2s eigene lineage_*-Ereignisse — dieses Modul protokolliert
  // sein eigenes, höherstufiges auftrag_registriert-Ereignis (Muster F5).
}

function auftragArtefaktId(auftragId: string): string {
  return `auftrag-${auftragId}`
}

/**
 * Registriert einen Auftrag als AUFTRAG_V0-Kernartefakt über F2s
 * registriereKernArtefakt (AK1). eingaben bleibt [] — ein Auftrag ist der
 * Wurzelknoten eines Vorhabensstrangs, kein Zitat eines Vorgängerartefakts.
 * F45 B2a-2: prüft die Daten vor dem Schreiben gegen validiereAuftragDaten (u. a. AK-Pflicht je Herkunft) und wirft
 * mit der Verstoßliste — alle Aufrufer fangen den Wurf schon (Disk-I/O). Dieselbe Funktion schreibt auch neue
 * Versionen eines bestehenden Auftrags (Einrichtung, F-1071): dann erstelltAm und optionenAusAuftrag übergeben.
 * @param auftragId - eindeutige Kennung, bildet die Artefakt-ID auftrag-<auftragId>
 * @param profilReferenz - Profilbezug, unverändert an F2 gereicht
 * @param titel - kurzer, menschenlesbarer Titel des Auftrags
 * @param auftragstext - der eigentliche Auftragstext (AK2 liest ihn über AusfuehrungsEingaben)
 * @param optionen - basisVerzeichnis/schreiber, Muster F5/F2; optionale Felder des Auftrags
 * @returns pfad, versionSequenz und inhaltsHash der geschriebenen Version
 */
export function registriereAuftrag(
  auftragId: string,
  profilReferenz: ProfilReferenz,
  titel: string,
  auftragstext: string,
  optionen: Optionen = {}
): { pfad: string; versionSequenz: number; inhaltsHash: string } {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const lineageOptionen = { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: stillerLineageSchreiber }

  const daten: AuftragV0Daten = {
    auftrag_schema: 'v0',
    auftrag_id: auftragId,
    titel,
    auftragstext,
    erstellt_am: optionen.erstelltAm ?? jetzt(),
    // F39 WS-2a: nur gesetzt, wenn der Aufrufer eine Herkunft übergibt — ein Alt-Auftrag ohne
    // dieses Feld bleibt strukturell unverändert (kein 'herkunft: undefined' im geschriebenen JSON).
    ...(optionen.herkunft !== undefined ? { herkunft: optionen.herkunft } : {}),
    // F35 WS-1: dasselbe additive Muster — nur gesetzt, wenn der Aufrufer (routen-f35.mjs) sie
    // mitgibt, ein Alt-Auftrag bzw. ein Auftrag ohne Feature-Akte-Herkunft bleibt unverändert.
    ...(optionen.akzeptanzkriterien !== undefined ? { akzeptanzkriterien: optionen.akzeptanzkriterien } : {}),
    ...(optionen.nicht_ziele !== undefined ? { nicht_ziele: optionen.nicht_ziele } : {}),
    // F45 B2a-2: dasselbe additive Muster für die Arbeitspaket-Felder.
    ...(optionen.bereiche !== undefined ? { bereiche: optionen.bereiche } : {}),
    ...(optionen.risiko !== undefined ? { risiko: optionen.risiko } : {}),
    ...(optionen.feature_ref !== undefined ? { feature_ref: optionen.feature_ref } : {}),
    ...(optionen.einrichtung !== undefined ? { einrichtung: optionen.einrichtung } : {}),
    // F45 B2b-3c (F-981): Budget des Arbeitspakets, dasselbe additive Muster.
    ...(optionen.budget_tokens !== undefined ? { budget_tokens: optionen.budget_tokens } : {}),
  }
  const verstoesse = validiereAuftragDaten(daten)
  if (verstoesse.length > 0) throw new Error(`Auftrag '${auftragId}' verstößt gegen schemas/kontrollzustand-auftrag-payload.schema.json: ${verstoesse.join('; ')}`)

  const { pfad, versionSequenz, inhaltsHash } = registriereKernArtefakt(
    auftragArtefaktId(auftragId),
    profilReferenz,
    { quelle: 'auftrag' },
    daten,
    [],
    lineageOptionen
  )

  schreiber({ ereignis: 'auftrag_registriert', zeitstempel: jetzt(), auftrag_id: auftragId, versionSequenz })
  return { pfad, versionSequenz, inhaltsHash }
}

// ─── Schemaprüfung (Gate-Skript, handgeschrieben, D5, kein ajv) ────────────

/**
 * Reine Funktion: prüft einen optionalen herkunft-Wert — Muster für
 * AuftragV0Daten.herkunft UND den POST /api/auftraege-Body (F39 WS-2a, D5:
 * eine Quelle statt zweier unabhängig alternder Kopien; importiert von
 * scripts/leitstand-server.mjs' pruefeAuftragsformular).
 * @param wert - der zu prüfende Wert (nicht das umschließende Objekt)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragHerkunft(wert: unknown): string[] {
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) {
    return ["'herkunft' muss ein Objekt sein"]
  }
  const obj = wert as Record<string, unknown>
  const verstoesse: string[] = []
  for (const feld of Object.keys(obj)) {
    if (feld !== 'art') verstoesse.push(`unbekanntes Feld 'herkunft.${feld}' (additionalProperties: false)`)
  }
  if (typeof obj.art !== 'string' || !HERKUNFT_ARTEN.has(obj.art)) {
    verstoesse.push(`'herkunft.art' muss einer von ${[...HERKUNFT_ARTEN].join(', ')} sein`)
  }
  return verstoesse
}

/**
 * Reine Funktion: prüft ein optionales akzeptanzkriterien-Array (F35 WS-1) —
 * Muster validiereAuftragHerkunft. Wenn vorhanden, mindestens ein Eintrag,
 * jede id dem Muster ^AK[0-9]+$ entsprechend und eindeutig (Zwilling
 * schemas/kontrollzustand-auftrag-payload.schema.json).
 * @param wert - der zu prüfende Wert (nicht das umschließende Objekt)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragAkzeptanzkriterien(wert: unknown): string[] {
  if (!Array.isArray(wert)) {
    return ["'akzeptanzkriterien' muss ein Array sein"]
  }
  if (wert.length === 0) {
    return ["'akzeptanzkriterien' darf, wenn vorhanden, nicht leer sein (minItems: 1)"]
  }
  const verstoesse: string[] = []
  const geseheneIds = new Set<string>()
  wert.forEach((eintrag, index) => {
    if (typeof eintrag !== 'object' || eintrag === null || Array.isArray(eintrag)) {
      verstoesse.push(`'akzeptanzkriterien[${index}]' muss ein Objekt sein`)
      return
    }
    const obj = eintrag as Record<string, unknown>
    for (const feld of Object.keys(obj)) {
      if (feld !== 'id' && feld !== 'text') verstoesse.push(`unbekanntes Feld 'akzeptanzkriterien[${index}].${feld}' (additionalProperties: false)`)
    }
    if (typeof obj.id !== 'string' || !AK_ID_MUSTER.test(obj.id)) {
      verstoesse.push(`'akzeptanzkriterien[${index}].id' muss dem Muster ^AK[0-9]+$ entsprechen`)
    } else if (geseheneIds.has(obj.id)) {
      verstoesse.push(`'akzeptanzkriterien[${index}].id' ('${obj.id}') ist nicht eindeutig`)
    } else {
      geseheneIds.add(obj.id)
    }
    if (typeof obj.text !== 'string' || obj.text.length === 0) {
      verstoesse.push(`'akzeptanzkriterien[${index}].text' muss ein nicht-leerer String sein`)
    }
  })
  return verstoesse
}

/**
 * Reine Funktion: prüft ein optionales nicht_ziele-Array (F35 WS-1) — jeder
 * Eintrag ein nicht-leerer String, ein leeres Array ist gültig (Zwilling
 * schemas/kontrollzustand-auftrag-payload.schema.json).
 * @param wert - der zu prüfende Wert (nicht das umschließende Objekt)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragNichtZiele(wert: unknown): string[] {
  if (!Array.isArray(wert)) {
    return ["'nicht_ziele' muss ein Array sein"]
  }
  const verstoesse: string[] = []
  wert.forEach((eintrag, index) => {
    if (typeof eintrag !== 'string' || eintrag.length === 0) {
      verstoesse.push(`'nicht_ziele[${index}]' muss ein nicht-leerer String sein`)
    }
  })
  return verstoesse
}

/** Grund, aus dem pruefeBereich einen Eintrag abweist (F45 B2b-3e-2) — Codes, die Texte wählt jede Seite selbst. */
export type BereichGrund = 'leer' | 'steuerzeichen' | 'absolut' | 'eltern' | 'punkt' | 'muster'

/**
 * Reine Funktion: die eine Regel je Eintrag von `bereiche` (F45 B2b-3e-2, F-1123 (5)(9)). ZWILLING von `pruefeBereich` in
 * public/leitstand/arbeitspaket-felder.js (der Browser lädt kein .ts) — Gleichheit über eine Fall-Tabelle im Gate
 * f45-b2b3e2 (r1)/(r2); eine Änderung hier gehört wörtlich auch dorthin. Getrimmt vor allen Prüfungen (Advisor A3), Trenner
 * `/` und `\` gleich. Abgewiesen wird, was im Umfangs-Abgleich (src/umfang, normalisiereBereich) still nichts träfe: absolute
 * Pfade, `..`, ein Segment `.` außer am Anfang (`./`), `*` mitten im Eintrag (`src/*.ts` — der Abgleich kennt Präfixe, keine
 * Muster). `*`/`**` als ganzer Eintrag oder als Endung (`src/**`, `src/**` + Trenner, `src\**`) bleiben erlaubt.
 * Groß-/Kleinschreibung wird nicht angeglichen: `Src/` und `src/` sind zwei gültige Einträge (git ist case-sensitiv).
 * @param eintrag - ein Eintrag aus `bereiche`
 * @returns null, wenn gültig, sonst der Grund
 */
export function pruefeBereich(eintrag: string): BereichGrund | null {
  const e = eintrag.trim()
  if (e === '') return 'leer'
  if (/[\u0000-\u001f\u007f]/.test(e)) return 'steuerzeichen'
  if (/^(?:[\\/]|[A-Za-z]:)/.test(e)) return 'absolut'
  const segmente = e.split(/[\\/]/).filter((s) => s !== '')
  if (segmente.includes('..')) return 'eltern'
  const ersterInhalt = segmente.findIndex((s) => s !== '.')
  if (ersterInhalt >= 0 && segmente.slice(ersterInhalt).includes('.')) return 'punkt'
  let rest = e
  for (let vorher = ''; vorher !== rest; ) {
    vorher = rest
    rest = rest.replace(/[\\/](?:\*\*?)?$/, '')
  }
  return rest !== '*' && rest !== '**' && rest.includes('*') ? 'muster' : null
}

/**
 * Reine Funktion: die eine Regel für `budget_tokens` (F45 B2b-3e-2) — eine ganze Zahl von 1 bis Number.MAX_SAFE_INTEGER.
 * ZWILLING von `pruefeBudgetTokens` in public/leitstand/arbeitspaket-felder.js (Gate f45-b2b3e2 (b1)).
 * @param wert - der zu prüfende Wert
 * @returns true, wenn gültig
 */
export function pruefeBudgetTokens(wert: unknown): boolean {
  return typeof wert === 'number' && Number.isSafeInteger(wert) && wert >= 1
}

/** Meldung je Grund für validiereAuftragBereiche (Server, deutsch wie die übrigen Verstöße). */
const BEREICH_MELDUNG: Readonly<Record<Exclude<BereichGrund, 'leer' | 'steuerzeichen'>, string>> = {
  absolut: 'ist absolut — erlaubt sind Pfade relativ zum Projekt, ohne Laufwerk oder führenden Schrägstrich',
  eltern: "enthält '..' — erlaubt sind Pfade innerhalb des Projekts",
  punkt: "enthält ein Segment '.' — erlaubt nur am Anfang (./)",
  muster: "ist ein Muster — '*' nur als ganzer Eintrag oder am Ende (src/**)",
}

/**
 * Reine Funktion: prüft ein optionales bereiche-Array (F45 B2a-2) — mindestens ein Eintrag, je ein eindeutiger String, der
 * pruefeBereich besteht (seit F45 B2b-3e-2 dieselbe Regel wie das Formular). Doppelte nach getrimmtem Text.
 * @param wert - der zu prüfende Wert
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragBereiche(wert: unknown): string[] {
  if (!Array.isArray(wert)) return ["'bereiche' muss ein Array sein"]
  if (wert.length === 0) return ["'bereiche' darf, wenn vorhanden, nicht leer sein (minItems: 1)"]
  const verstoesse: string[] = []
  const gesehen = new Set<string>()
  wert.forEach((eintrag, index) => {
    const grund = typeof eintrag === 'string' ? pruefeBereich(eintrag) : 'leer'
    if (grund === 'leer') verstoesse.push(`'bereiche[${index}]' muss ein nicht-leerer String sein`)
    else if (grund === 'steuerzeichen') verstoesse.push(`'bereiche[${index}]' enthält Steuerzeichen`)
    else if (grund !== null) verstoesse.push(`'bereiche[${index}]' ('${eintrag}') ${BEREICH_MELDUNG[grund]}`)
    else if (gesehen.has(eintrag.trim())) verstoesse.push(`'bereiche[${index}]' ('${eintrag}') ist doppelt`)
    else gesehen.add(eintrag.trim())
  })
  return verstoesse
}

/**
 * Reine Funktion: prüft ein optionales einrichtung-Array (F-1071) — leer erlaubt; je Eintrag id (^E[0-9]+$, eindeutig),
 * schritt (nicht leer), wann und status aus den geschlossenen Mengen.
 * @param wert - der zu prüfende Wert
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragEinrichtung(wert: unknown): string[] {
  if (!Array.isArray(wert)) return ["'einrichtung' muss ein Array sein"]
  const verstoesse: string[] = []
  const ids = new Set<string>()
  wert.forEach((eintrag, index) => {
    if (typeof eintrag !== 'object' || eintrag === null || Array.isArray(eintrag)) {
      verstoesse.push(`'einrichtung[${index}]' muss ein Objekt sein`)
      return
    }
    const obj = eintrag as Record<string, unknown>
    for (const feld of Object.keys(obj)) {
      if (!['id', 'schritt', 'wann', 'status'].includes(feld)) verstoesse.push(`unbekanntes Feld 'einrichtung[${index}].${feld}' (additionalProperties: false)`)
    }
    if (typeof obj.id !== 'string' || !EINRICHTUNG_ID_MUSTER.test(obj.id)) verstoesse.push(`'einrichtung[${index}].id' muss dem Muster ^E[0-9]+$ entsprechen`)
    else if (ids.has(obj.id)) verstoesse.push(`'einrichtung[${index}].id' ('${obj.id}') ist nicht eindeutig`)
    else ids.add(obj.id)
    if (typeof obj.schritt !== 'string' || obj.schritt.trim().length === 0) verstoesse.push(`'einrichtung[${index}].schritt' muss ein nicht-leerer String sein`)
    if (typeof obj.wann !== 'string' || !EINRICHTUNG_WANN.has(obj.wann)) verstoesse.push(`'einrichtung[${index}].wann' muss 'vor_dem_bau' oder 'waehrend_des_baus' sein`)
    if (typeof obj.status !== 'string' || !EINRICHTUNG_STATUS.has(obj.status)) verstoesse.push(`'einrichtung[${index}].status' muss 'offen' oder 'erledigt' sein`)
  })
  return verstoesse
}

/**
 * Reine Funktion: Pflichtfelder je Herkunft (F45 B2a-2, F-938) — ein Auftrag aus einer Feature-Akte oder einem Finding
 * trägt mindestens ein Akzeptanzkriterium. Eine Quelle für validiereAuftragDaten und das POST-Formular des Servers.
 * @param herkunftArt - herkunft.art oder undefined
 * @param akzeptanzkriterien - akzeptanzkriterien oder undefined
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereAuftragPflichtfelder(herkunftArt: unknown, akzeptanzkriterien: unknown): string[] {
  if (typeof herkunftArt !== 'string' || !HERKUNFT_MIT_AK_PFLICHT.has(herkunftArt)) return []
  return Array.isArray(akzeptanzkriterien) && akzeptanzkriterien.length > 0 ? [] : [`ein Auftrag mit herkunft.art '${herkunftArt}' braucht mindestens ein Akzeptanzkriterium`]
}

/**
 * Reine Funktion: prüft die Arbeitspaket-Felder (bereiche, risiko, feature_ref, einrichtung, seit F45 B2b-3c budget_tokens), soweit vorhanden — für
 * validiereAuftragDaten und das POST-Formular (eine Regel).
 * @param obj - Objekt mit den optionalen Feldern
 * @returns Liste der Regelverletzungen; leer = gültig
 */
export function validiereArbeitspaketFelder(obj: Record<string, unknown>): string[] {
  const verstoesse: string[] = []
  if ('bereiche' in obj) verstoesse.push(...validiereAuftragBereiche(obj.bereiche))
  if ('risiko' in obj && (typeof obj.risiko !== 'string' || !RISIKEN.has(obj.risiko))) verstoesse.push("'risiko' muss 'niedrig', 'mittel' oder 'hoch' sein")
  if ('feature_ref' in obj && (typeof obj.feature_ref !== 'string' || !FEATURE_REF_MUSTER.test(obj.feature_ref))) verstoesse.push("'feature_ref' muss dem Muster ^F[0-9]+[A-Za-z]?$ entsprechen")
  if ('einrichtung' in obj) verstoesse.push(...validiereAuftragEinrichtung(obj.einrichtung))
  if ('budget_tokens' in obj && !pruefeBudgetTokens(obj.budget_tokens)) verstoesse.push(`'budget_tokens' muss eine ganze Zahl von 1 bis ${Number.MAX_SAFE_INTEGER} sein`)
  return verstoesse
}

/**
 * Die optionalen Felder einer bestehenden Auftragsversion als Optionen für registriereAuftrag — eine neue Version
 * (z. B. Einrichtung übernommen oder abgehakt) verliert so kein Feld.
 * @param daten - bestehende AUFTRAG_V0-Daten
 * @returns Optionen ohne basisVerzeichnis/schreiber, mit erstelltAm
 */
export function optionenAusAuftrag(daten: AuftragV0Daten): Optionen {
  const { herkunft, akzeptanzkriterien, nicht_ziele, bereiche, risiko, feature_ref, einrichtung, budget_tokens } = daten
  return {
    erstelltAm: daten.erstellt_am,
    ...(herkunft !== undefined ? { herkunft } : {}),
    ...(akzeptanzkriterien !== undefined ? { akzeptanzkriterien } : {}),
    ...(nicht_ziele !== undefined ? { nicht_ziele } : {}),
    ...(bereiche !== undefined ? { bereiche } : {}),
    ...(risiko !== undefined ? { risiko } : {}),
    ...(feature_ref !== undefined ? { feature_ref } : {}),
    ...(einrichtung !== undefined ? { einrichtung } : {}),
    ...(budget_tokens !== undefined ? { budget_tokens } : {}),
  }
}

/**
 * Offene Einrichtungsschritte, die vor dem Bau erledigt sein müssen (F-1071) — die Startsperre der Ausführung.
 * @param daten - AUFTRAG_V0-Daten (oder undefined)
 * @returns offene Schritte mit wann 'vor_dem_bau'
 */
export function offeneEinrichtungVorDemBau(daten: Pick<AuftragV0Daten, 'einrichtung'> | undefined): Einrichtungsschritt[] {
  return (daten?.einrichtung ?? []).filter((e) => e.wann === 'vor_dem_bau' && e.status === 'offen')
}

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/kontrollzustand-auftrag-payload.schema.json. */
export function validiereAuftragDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set(['auftrag_schema', 'auftrag_id', 'titel', 'auftragstext', 'erstellt_am', 'herkunft', 'akzeptanzkriterien', 'nicht_ziele', 'bereiche', 'risiko', 'feature_ref', 'einrichtung', 'budget_tokens'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.auftrag_schema !== 'v0') verstoesse.push("'auftrag_schema' muss 'v0' sein")
  if (typeof obj.auftrag_id !== 'string' || obj.auftrag_id.length === 0) verstoesse.push("'auftrag_id' muss ein nicht-leerer String sein")
  if (typeof obj.titel !== 'string' || obj.titel.length === 0) verstoesse.push("'titel' muss ein nicht-leerer String sein")
  if (typeof obj.auftragstext !== 'string' || obj.auftragstext.length === 0) verstoesse.push("'auftragstext' muss ein nicht-leerer String sein")
  if (typeof obj.erstellt_am !== 'string' || obj.erstellt_am.length === 0) verstoesse.push("'erstellt_am' muss ein nicht-leerer String sein")
  // 'herkunft'/'akzeptanzkriterien'/'nicht_ziele' bleiben additiv/optional (F39 WS-2a, F35 WS-1) —
  // ein Alt-Auftrag ohne diese Felder bleibt gültig.
  if ('herkunft' in obj) verstoesse.push(...validiereAuftragHerkunft(obj.herkunft))
  if ('akzeptanzkriterien' in obj) verstoesse.push(...validiereAuftragAkzeptanzkriterien(obj.akzeptanzkriterien))
  if ('nicht_ziele' in obj) verstoesse.push(...validiereAuftragNichtZiele(obj.nicht_ziele))
  // F45 B2a-2: Arbeitspaket-Felder additiv/optional; Pflicht-AK je Herkunft.
  verstoesse.push(...validiereArbeitspaketFelder(obj))
  const herkunftArt = typeof obj.herkunft === 'object' && obj.herkunft !== null ? (obj.herkunft as Record<string, unknown>).art : undefined
  verstoesse.push(...validiereAuftragPflichtfelder(herkunftArt, obj.akzeptanzkriterien))
  return verstoesse
}

// ─── Arbeitspaket-Block (F45 B2a-2) ────────────────────────────────────────

/** Lesbare Form von wann im Block (status steht als Wort). */
const WANN_TEXT: Readonly<Record<Einrichtungsschritt['wann'], string>> = { vor_dem_bau: 'vor dem Bau', waehrend_des_baus: 'während des Baus' }

/**
 * true, wenn der Auftrag ein Arbeitspaket-Feld trägt, das einen Block auslöst: bereiche, risiko, einrichtung oder die
 * Herkunft 'finding' (deren AK stehen sonst nirgends im Auftragstext). feature_ref allein löst keinen Block aus (er wirkt
 * in Projektkarte und Verknüpfung). Ein Auftrag ohne diese Felder bleibt bitgenau wie vor B2a-2.
 * @param daten - AUFTRAG_V0-Daten
 * @returns true mit Block
 */
export function traegtArbeitspaket(daten: AuftragV0Daten): boolean {
  return daten.bereiche !== undefined || daten.risiko !== undefined || daten.einrichtung !== undefined || daten.herkunft?.art === 'finding'
}

/**
 * Baut den Arbeitspaket-Block für die Rollen architekt und ausfuehrung (F45 B2a-2) — die einzige Stelle, an der der
 * Server aus den Auftragsdaten Text für diese Rollen baut. Rein und deterministisch. Bei Herkunft 'feature_akte' stehen
 * Ziel, AK und Nicht-Ziele schon wörtlich im Auftragstext (baueAuftragAusFeatureAkte) → nur die AK-IDs mit Verweis.
 * @param daten - AUFTRAG_V0-Daten
 * @param ziel - Ziel des Workflows (oder null → Titel)
 * @returns Block oder null, wenn der Auftrag kein Arbeitspaket-Feld trägt (traegtArbeitspaket)
 */
export function baueArbeitspaketBlock(daten: AuftragV0Daten, ziel: string | null): string | null {
  if (!traegtArbeitspaket(daten)) return null
  const aks = daten.akzeptanzkriterien ?? []
  const nichtZiele = daten.nicht_ziele ?? []
  const imText = daten.herkunft?.art === 'feature_akte'
  const z = ['## Arbeitspaket', `Ziel: ${ziel !== null && ziel.trim() !== '' ? ziel.trim() : daten.titel}`]
  if (aks.length === 0) z.push('Akzeptanzkriterien: keine.')
  else if (imText) z.push(`Akzeptanzkriterien: ${aks.map((ak) => ak.id).join(', ')} — Wortlaut oben im Auftrag (Feature-Akte).`)
  else z.push('Akzeptanzkriterien:', ...aks.map((ak) => `- ${ak.id}: ${ak.text}`))
  if (nichtZiele.length === 0) z.push('Nicht-Ziele: keine benannt.')
  else if (imText) z.push('Nicht-Ziele: siehe oben im Auftrag (Feature-Akte).')
  else z.push('Nicht-Ziele:', ...nichtZiele.map((n) => `- ${n}`))
  z.push(`Betroffene Bereiche: ${daten.bereiche !== undefined ? daten.bereiche.join(', ') : 'nicht benannt'}`)
  z.push(`Risiko: ${daten.risiko ?? 'nicht eingestuft'}`)
  const einrichtung = daten.einrichtung ?? []
  if (einrichtung.length === 0) z.push('Einrichtung durch Stefan: keine.')
  else z.push('Einrichtung durch Stefan:', ...einrichtung.map((e) => `- ${e.id} (${WANN_TEXT[e.wann]}, ${e.status}): ${e.schritt}`))
  if (einrichtung.some((e) => e.wann === 'waehrend_des_baus' && e.status === 'offen')) {
    z.push("Ein offener Schritt 'während des Baus' ist noch nicht eingerichtet — brauchst du ihn, melde ihn als Blockade, statt ihn zu umgehen.")
  }
  if (daten.feature_ref !== undefined) z.push(`Feature-Akte: features/${daten.feature_ref}/feature.md`)
  z.push('Definition of Done: CLAUDE.md (Abschnitt „Definition of Done“).')
  return z.join('\n')
}

/**
 * Abgleich der Einrichtungsliste (F-1071, Advisor H1/H2): aus der Liste des Architekten ({ schritt, wann }) und der
 * Liste des Auftrags entsteht die neue Liste — oder null, wenn sich nichts ändert. Gleich heißt: gleiche Folge der Paare
 * (schritt, wann); der Status zählt nicht, Abhaken übersteht also jeden weiteren Abgleich. Bei einer Abweichung behält
 * ein Schritt mit gleichem Paar seinen Status 'erledigt'; IDs E1…En nach der Reihenfolge des Architekten. Eine leere
 * Architekten-Liste leert eine bestehende Liste (Replan ohne Einrichtung); ohne bestehende Liste bleibt der Auftrag
 * unverändert (bitgenau).
 * @param bisher - einrichtung des Auftrags (undefined = Feld fehlt)
 * @param entwurf - einrichtung des Architekt-Ergebnisses
 * @returns neue Liste oder null (keine neue Auftragsversion)
 */
export function gleicheEinrichtungslisteAb(bisher: Einrichtungsschritt[] | undefined, entwurf: { schritt: string; wann: Einrichtungsschritt['wann'] }[]): Einrichtungsschritt[] | null {
  if (bisher === undefined && entwurf.length === 0) return null
  const gleich = bisher !== undefined && bisher.length === entwurf.length && bisher.every((e, i) => e.schritt === entwurf[i].schritt && e.wann === entwurf[i].wann)
  if (gleich) return null
  const frei = [...(bisher ?? [])]
  return entwurf.map((e, index) => {
    const treffer = frei.findIndex((alt) => alt.schritt === e.schritt && alt.wann === e.wann)
    const status = treffer !== -1 && frei[treffer].status === 'erledigt' ? 'erledigt' : 'offen'
    if (treffer !== -1) frei.splice(treffer, 1)
    return { id: `E${index + 1}`, schritt: e.schritt, wann: e.wann, status }
  })
}
