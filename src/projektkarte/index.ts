/**
 * Datei: src/projektkarte/index.ts
 *
 * Zweck: Projektkarte (F45 B2a-1; F-1064, F-936, F-931, F-829, F-1066). baueProjektkarte baut aus den vom Server
 * gelesenen Eingaben eine Karte mit Zuschnitt je Rolle — Vorhaben, Bestand, Ausführungsrahmen, im Projekt
 * eingeschaltete Fähigkeiten, Qualität — als TEXT für den Auftrag (wirkt für Claude und Codex gleich, F-929) plus
 * Hash, Abschnittsliste und Lücken für die Laufakte. analysiereArchitektur ist die eine Regel, nach der ARCHITECTURE.md
 * als beschrieben gilt — für die Karte und für Regel 1h (F-1066).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (starteWorkflowSchritt, Regel 1h im Nachlauf)
 * - scripts/check-f45-b2a1-projektkarte.mjs
 * - src/projektkarte/projektkarte.test.ts
 *
 * Wichtig:
 * Rein und deterministisch: kein I/O, kein Netz, kein Modell, keine Zeitstempel im Text — gleiche Eingaben ergeben
 * denselben Hash (Gate f45-b2a1 (b)). Lücken werden sichtbar benannt (fehlend), nie still übersprungen; Kürzungen
 * tragen einen sichtbaren Marker. Die Karte ist Kontext, kein Auftrag — bindende Blöcke (ADR-Block, AK-Block) bleiben
 * dort, wo der Server sie heute anhängt; die Karte verweist nur darauf und wiederholt deren Überschrift nicht
 * (check-fixpaket-f35-reallauf (a)).
 */

import { createHash } from 'node:crypto'
import { basename } from 'node:path'
import { normalisiereDodText } from '../harness-abgleich/index.ts'
import type {
  AbschnittId,
  ArchitekturAbschnitt,
  ArchitekturAnalyse,
  KarteDatei,
  KarteRahmen,
  KarteRolle,
  Projektkarte,
  ProjektkarteEingaben,
} from './types.ts'


/**
 * Zuschnitt je Rolle (Plan v2 §1, Tabelle), in Reihenfolge der Karte. Als Map statt Objekt: Rollennamen als
 * Objektschlüssel außerhalb von src/rollen/ wären eine zweite Rollenliste (check-f17-rollenvertrag AK1). Bestand steht
 * zuletzt (Korrekturrunde, Code-Review 1/QA L1): er ist der größte Abschnitt und verweist auf Dateien, die die Rolle selbst
 * lesen kann — trifft die Gesamtgrenze, kürzt sie ihn, nie Qualität (DoD, Checkliste, Urteil je Punkt).
 */
export const ZUSCHNITT: ReadonlyMap<KarteRolle, readonly AbschnittId[]> = new Map<KarteRolle, readonly AbschnittId[]>([
  ['architekt', ['vorhaben', 'ausfuehrungsrahmen', 'faehigkeiten', 'qualitaet', 'bestand']],
  ['architecture-advisor', ['vorhaben', 'ausfuehrungsrahmen', 'qualitaet', 'bestand']],
  ['code-reviewer', ['vorhaben', 'qualitaet', 'bestand']],
])

/**
 * Größengrenze des Gesamttexts je Rolle (Zeichen). Prompt geht per stdin an beide Worker — kein Argv-Limit. Bemessen an
 * diesem Repo (echte Architekt-Karte ≈ 15 600 Zeichen); die Gesamtkürzung trifft nur den Bestand am Ende.
 */
export const GRENZE_ZEICHEN: ReadonlyMap<KarteRolle, number> = new Map<KarteRolle, number>([
  ['architekt', 24000],
  ['architecture-advisor', 20000],
  ['code-reviewer', 20000],
])

/** Obergrenzen je Eingabe (Zeichen), damit eine große Quelle nicht die ganze Karte belegt. */
const GRENZE_BESCHREIBUNG = 2500
const GRENZE_ARCHITEKTUR = 9000
/** Obergrenze je ARCHITECTURE.md-Abschnitt — so bleiben alle Abschnitte (auch „Verbotene Patterns“) im Auszug. */
const GRENZE_ARCHITEKTUR_ABSCHNITT = 2000
const GRENZE_ADRS = 2500
const GRENZE_CHECKLISTE = 3000
/** Ordnerübersicht: höchstens so viele Ordnerzeilen und je Ordner so viele Unterordner. */
const MAX_ORDNER_ZEILEN = 40
const MAX_UNTERORDNER = 12
const MAX_WURZELDATEIEN = 15

/** Rollen mit Karte, in Prüfreihenfolge. */
export const KARTE_ROLLEN: readonly KarteRolle[] = [...ZUSCHNITT.keys()]

/** Pflichtabschnitte von ARCHITECTURE.md (O2-Standard, Plan v2): Titel beginnt mit diesem Wort. */
export const ARCHITEKTUR_PFLICHT: readonly string[] = ['Ordnerstruktur', 'Datenzugriff']

/** Platzhalter des Skeletts: [FÜLLUNG …] bzw. ASCII [FUELLUNG …]. */
const PLATZHALTER = /\[F(?:Ü|UE)LLUNG/i
/** Bedingter Punkt „[FÜLLUNG, nur UI]“ (DoD, Checkliste) — bleibt als „(nur UI)“, ist kein offener Platzhalter. */
const NUR_UI = /\[F(?:Ü|UE)LLUNG,?\s*nur UI(?:-Projekte)?\]/gi

const TITEL: Readonly<Record<AbschnittId, string>> = {
  vorhaben: 'Vorhaben',
  bestand: 'Bestand',
  ausfuehrungsrahmen: 'Ausführungsrahmen',
  faehigkeiten: 'Im Projekt eingeschaltete Fähigkeiten',
  qualitaet: 'Qualität',
}

/**
 * CRLF/CR → LF, damit der Hash die Zeilenenden des Checkouts nicht sieht.
 * @param text - Rohtext
 * @returns Text mit LF
 */
function lf(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

/**
 * Quellstand einer Datei für den Kartentext: erste 12 Hex des sha256 über den LF-Text. Damit ändert jede Änderung
 * einer Quelle den Hash der Karte, auch wenn sie hinter einer Kürzung liegt.
 * @param datei - gelesene Datei
 * @returns z. B. 'ARCHITECTURE.md, Stand 1a2b3c4d5e6f'
 */
function stempel(datei: KarteDatei): string {
  return `${datei.pfad}, Stand ${kurzHash(datei.text)}`
}

/**
 * Erste 12 Hex des sha256 über den LF-Text.
 * @param text - Text
 * @returns Kurz-Hash
 */
function kurzHash(text: string): string {
  return createHash('sha256').update(lf(text), 'utf8').digest('hex').slice(0, 12)
}

/**
 * Codepunkt-Vergleich für sort (locale-unabhängig, damit der Hash auf jedem Rechner gleich ist).
 * @param a - erster Text
 * @param b - zweiter Text
 * @returns -1, 0 oder 1
 */
function vergleiche(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Bettet einen Dateitext in die Karte ein: LF, getrimmt, jede Markdown-Überschrift auf Ebene 4 gesetzt — sonst stünde
 * z. B. „## Was es ist“ aus der Projektbeschreibung gleichrangig neben den Kartenabschnitten (Befund Nachweis B2a-1).
 * @param text - Dateitext
 * @returns eingebetteter Text
 */
function einbetten(text: string): string {
  let imCode = false
  return lf(text)
    .trim()
    .split('\n')
    .map((zeile) => {
      if (/^\s*(```|~~~)/.test(zeile)) imCode = !imCode
      return imCode ? zeile : zeile.replace(/^#{1,6}\s+/, '#### ')
    })
    .join('\n')
}

/**
 * Kürzt einen Text sichtbar.
 * @param text - Text
 * @param grenze - Höchstlänge vor dem Marker
 * @param quelle - wo der vollständige Text steht
 * @returns Text, ggf. mit Marker
 */
function kuerze(text: string, grenze: number, quelle: string): string {
  return text.length <= grenze ? text : `${text.slice(0, grenze).trimEnd()}\n… [gekürzt — vollständig in ${quelle}]`
}

/**
 * Zerlegt ARCHITECTURE.md in `## `-Abschnitte und urteilt je Abschnitt, ob er beschrieben ist (nicht leer, kein
 * Platzhalter). HTML-Kommentare zählen nicht (der Kopfkommentar des Skeletts trägt „[FÜLLUNG — GANZE DATEI]“ auch in
 * gefüllten Dateien). Titelvergleich ohne Nummer („## 1. Ordnerstruktur“ → „Ordnerstruktur“).
 * @param text - Inhalt von ARCHITECTURE.md
 * @returns Abschnitte, fehlende Pflichtabschnitte und das Gesamturteil
 */
export function analysiereArchitektur(text: string): ArchitekturAnalyse {
  const ohneKommentar = lf(text).replace(/<!--[\s\S]*?-->/g, '')
  const abschnitte: ArchitekturAbschnitt[] = []
  let aktuell: { titel: string; roh: string; zeilen: string[] } | null = null
  const schliesse = (): void => {
    if (aktuell === null) return
    const inhalt = aktuell.zeilen.join('\n').trim()
    abschnitte.push({ titel: aktuell.titel, text: inhalt, beschrieben: inhalt !== '' && !PLATZHALTER.test(aktuell.roh) && !PLATZHALTER.test(inhalt) })
  }
  for (const zeile of ohneKommentar.split('\n')) {
    if (/^##\s/.test(zeile)) {
      schliesse()
      const roh = zeile.replace(/^##\s+/, '').trim()
      aktuell = { titel: roh.replace(/^\d+[.)]?\s*/, ''), roh, zeilen: [] }
    } else if (aktuell !== null) {
      aktuell.zeilen.push(zeile)
    }
  }
  schliesse()
  const pflichtFehlt = ARCHITEKTUR_PFLICHT.filter((name) => !abschnitte.some((a) => a.beschrieben && a.titel.toLowerCase().startsWith(name.toLowerCase())))
  // „Nicht beschrieben“ nur, wenn auch sonst nichts Belastbares dasteht (Korrekturrunde, Code-Review 2/QA L4): eine gefüllte
  // Datei mit anderen Titeln (z. B. englisch) zeigt ihren Auszug; die fehlenden Pflichttitel stehen dann in fehlend.
  const keinInhalt = !abschnitte.some((a) => a.beschrieben) || PLATZHALTER.test(ohneKommentar)
  return { abschnitte, pflichtFehlt, nichtBeschrieben: pflichtFehlt.length === ARCHITEKTUR_PFLICHT.length && keinInhalt }
}

/**
 * Lesbare Form eines Prüfbefehls aus der Startvorlage (Argv mit absoluten Pfaden): `node …/npm-cli.js run check`
 * → `npm run check`, sonst Programmname ohne Pfad plus Argumente.
 * @param argv - vorlage.pruefbefehl
 * @returns z. B. 'npm run check'
 */
export function beschreibePruefbefehl(argv: readonly string[]): string {
  const npmIndex = argv.findIndex((teil) => /npm-cli\.js$/i.test(teil))
  if (npmIndex !== -1) return ['npm', ...argv.slice(npmIndex + 1)].join(' ')
  const [programm, ...rest] = argv
  return [basename(programm ?? '').replace(/\.(exe|cmd)$/i, ''), ...rest].join(' ')
}

/**
 * Fasst die 'Bash(...)'-Regeln eines Werkzeugsatzes zu einer Befehlsliste zusammen (Muster leiteErlaubteBefehlsliste,
 * src/architekt — dort aus der Höchstmenge des Validators, hier aus dem tatsächlichen Werkzeugsatz).
 * @param werkzeuge - erlaubte_werkzeuge
 * @returns z. B. 'npm install, npm ci, npm run check|lint' oder '' ohne Bash-Regel
 */
function befehlsliste(werkzeuge: readonly string[]): string {
  const exakt: string[] = []
  const npmRun: string[] = []
  for (const regel of werkzeuge.filter((w) => w.startsWith('Bash(') && w.endsWith(')'))) {
    const praefix = regel.slice('Bash('.length, -1).replace(/:\*$/, '')
    if (praefix.startsWith('npm run ')) npmRun.push(praefix.slice('npm run '.length))
    else exakt.push(praefix)
  }
  return [...exakt, ...(npmRun.length > 0 ? [`npm run ${npmRun.join('|')}`] : [])].join(', ')
}

/**
 * Ordnerübersicht aus den versionierten Dateien: Wurzeldateien, je Ordner der ersten Ebene die Dateizahl und seine
 * Unterordner (begrenzt). Deterministisch sortiert.
 * @param dateien - repo-relative Pfade mit '/'
 * @returns Zeilen
 */
function ordneruebersicht(dateien: readonly string[]): string[] {
  const wurzelDateien: string[] = []
  const ordner = new Map<string, { anzahl: number; unter: Set<string> }>()
  for (const pfad of dateien) {
    const teile = pfad.split('/')
    if (teile.length === 1) {
      wurzelDateien.push(pfad)
      continue
    }
    const eintrag = ordner.get(teile[0]) ?? { anzahl: 0, unter: new Set<string>() }
    eintrag.anzahl += 1
    if (teile.length > 2) eintrag.unter.add(teile[1])
    ordner.set(teile[0], eintrag)
  }
  const zeilen: string[] = []
  const wurzel = [...wurzelDateien].sort(vergleiche)
  if (wurzel.length > 0) {
    zeilen.push(`- Wurzel: ${wurzel.slice(0, MAX_WURZELDATEIEN).join(', ')}${wurzel.length > MAX_WURZELDATEIEN ? ` (+${wurzel.length - MAX_WURZELDATEIEN} weitere)` : ''}`)
  }
  const namen = [...ordner.keys()].sort(vergleiche)
  for (const name of namen.slice(0, MAX_ORDNER_ZEILEN)) {
    const { anzahl, unter } = ordner.get(name) ?? { anzahl: 0, unter: new Set<string>() }
    const unterListe = [...unter].sort(vergleiche)
    // Viele Unterordner (z. B. Lauf-Ordner unter kontrollzustand/) sind Rauschen — dann nur die Anzahl (Code-Review 9).
    const unterText = unterListe.length === 0 ? '' : unterListe.length > MAX_UNTERORDNER ? `: ${unterListe.length} Unterordner` : `: ${unterListe.join(', ')}`
    zeilen.push(`- ${name}/ (${anzahl} Dateien)${unterText}`)
  }
  if (namen.length > MAX_ORDNER_ZEILEN) zeilen.push(`- … (+${namen.length - MAX_ORDNER_ZEILEN} weitere Ordner)`)
  return zeilen
}

/**
 * Liest die Punkte der Checkliste unter `## Pruefkriterien`/`## Prüfkriterien` (bis zur nächsten `## `-Überschrift);
 * `### `-Überschriften werden Gruppen. „[FUELLUNG, nur UI]“ wird „(nur UI)“; ein Punkt mit anderem Platzhalter fällt weg.
 * @param text - Inhalt von .claude/agents/code-reviewer.md
 * @returns Zeilen (Gruppen und Punkte), leer ohne Abschnitt
 */
export function leseCheckliste(text: string): string[] {
  const zeilen = lf(text).split('\n')
  const start = zeilen.findIndex((z) => /^##\s+Pr(?:ü|ue)fkriterien\s*$/i.test(z.trim()))
  if (start === -1) return []
  const punkte: string[] = []
  const ergebnis: string[] = []
  const schliessePunkt = (): void => {
    const punkt = punkte.pop()
    if (punkt === undefined) return
    const text = normalisiereDodText(punkt).replace(NUR_UI, '(nur UI)')
    if (text !== '' && !PLATZHALTER.test(text)) ergebnis.push(`- ${text}`)
  }
  for (const zeile of zeilen.slice(start + 1)) {
    if (/^##\s/.test(zeile)) break
    if (/^###\s/.test(zeile)) {
      schliessePunkt()
      ergebnis.push(`${zeile.replace(/^###\s+/, '').trim()}:`)
    } else if (/^\s{0,3}[-*]\s+/.test(zeile)) {
      schliessePunkt()
      punkte.push(zeile)
    } else if (punkte.length > 0 && /^\s+\S/.test(zeile)) {
      punkte[punkte.length - 1] += ` ${zeile.trim()}`
    }
  }
  schliessePunkt()
  return ergebnis.some((z) => z.startsWith('- ')) ? ergebnis : []
}

/**
 * Abschnitt Vorhaben: Projektbeschreibung, Auftrag (Titel, Ziel, AK, Nicht-Ziele), Feature-Akte.
 * @param e - Eingaben
 * @param rolle - Rolle (beim Code-Reviewer AK nur als Verweis auf den AK-Prüfblock)
 * @param fehlend - Sammelliste der Lücken
 * @returns Zeilen
 */
function vorhaben(e: ProjektkarteEingaben, rolle: KarteRolle, fehlend: string[]): string[] {
  const z: string[] = []
  if (e.projektbeschreibung === null) {
    z.push('Projektbeschreibung: nicht vorhanden.')
    fehlend.push('Projektbeschreibung: fehlt')
  } else {
    z.push(`Projektbeschreibung (${stempel(e.projektbeschreibung)}):`, kuerze(einbetten(e.projektbeschreibung.text), GRENZE_BESCHREIBUNG, e.projektbeschreibung.pfad))
  }
  z.push('', `Auftrag: ${e.auftrag.titel}`)
  if (e.auftrag.ziel !== null && e.auftrag.ziel.trim() !== '') z.push(`Ziel: ${e.auftrag.ziel.trim()}`)
  const aks = e.auftrag.akzeptanzkriterien
  if (aks.length === 0) {
    z.push('Akzeptanzkriterien: keine strukturierten AK im Auftrag.')
  } else if (rolle === 'code-reviewer') {
    z.push(`Akzeptanzkriterien und Nicht-Ziele: ${aks.length} AK — siehe den AK-Prüfblock in diesem Auftrag (dort je AK ein Urteil).`)
  } else {
    z.push('Akzeptanzkriterien:', ...aks.map((ak) => `- ${ak.id}: ${ak.text}`))
  }
  if (rolle !== 'code-reviewer' || aks.length === 0) {
    z.push(e.auftrag.nicht_ziele.length === 0 ? 'Nicht-Ziele: keine benannt.' : 'Nicht-Ziele:', ...e.auftrag.nicht_ziele.map((n) => `- ${n}`))
  }
  z.push('Feature-Akte: kein Feature-Bezug im Auftrag (folgt mit B2a-2).')
  return z
}

/**
 * Abschnitt Bestand: ARCHITECTURE.md-Auszug (nur beschriebene Abschnitte), ADRs, Ordnerübersicht.
 * @param e - Eingaben
 * @param rolle - Rolle (architekt/advisor: ADRs nur als Verweis auf den bindenden Block; beim Code-Reviewer Prüfmaßstab)
 * @param fehlend - Sammelliste der Lücken
 * @returns Zeilen
 */
function bestand(e: ProjektkarteEingaben, rolle: KarteRolle, fehlend: string[]): string[] {
  const z: string[] = []
  if (e.architektur === null) {
    z.push('ARCHITECTURE.md: nicht vorhanden — Architektur noch nicht beschrieben.')
    fehlend.push('ARCHITECTURE.md: fehlt')
  } else {
    const analyse = analysiereArchitektur(e.architektur.text)
    if (analyse.nichtBeschrieben) {
      z.push(`${e.architektur.pfad}: Architektur noch nicht beschrieben (Ordnerstruktur und Datenzugriff fehlen oder tragen nur Platzhalter).`)
      fehlend.push('ARCHITECTURE.md: Architektur noch nicht beschrieben')
    } else {
      const quelle = e.architektur.pfad
      z.push(
        rolle === 'code-reviewer'
          ? `${stempel(e.architektur)} — Prüfmaßstab: ein Verstoß gegen Konventionen oder verbotene Patterns ist ein Befund:`
          : `${stempel(e.architektur)} — Auszug der beschriebenen Abschnitte:`
      )
      const auszug = analyse.abschnitte
        .filter((a) => a.beschrieben)
        .map((a) => `### ${a.titel}\n${kuerze(einbetten(a.text), GRENZE_ARCHITEKTUR_ABSCHNITT, `${quelle} § ${a.titel}`)}`)
        .join('\n\n')
      z.push(kuerze(auszug, GRENZE_ARCHITEKTUR, e.architektur.pfad))
      const offen = analyse.abschnitte.filter((a) => !a.beschrieben).map((a) => a.titel)
      if (offen.length > 0) z.push(`Noch nicht beschrieben: ${offen.join(', ')}.`)
      if (analyse.pflichtFehlt.length > 0) fehlend.push(`ARCHITECTURE.md: ${analyse.pflichtFehlt.join(', ')} nicht gefunden oder nicht beschrieben`)
    }
  }
  z.push('')
  if (e.adrs === '') z.push('Entschiedene ADRs: keine.')
  else if (rolle === 'code-reviewer') z.push(`Entschiedene ADRs (docs/adr/, Stand ${kurzHash(e.adrs)}):`, kuerze(einbetten(e.adrs), GRENZE_ADRS, 'docs/adr/'))
  else z.push('Entschiedene ADRs: siehe den bindenden ADR-Block in diesem Auftrag.')
  z.push('')
  if (e.dateien === null) {
    z.push('Ordnerübersicht: nicht verfügbar.')
    fehlend.push('Ordnerübersicht: versionierte Dateien nicht lesbar')
  } else if (e.dateien.length === 0) {
    z.push('Ordnerübersicht: keine versionierten Dateien.')
    fehlend.push('Ordnerübersicht: keine versionierten Dateien')
  } else {
    z.push('Ordnerübersicht (versionierte Dateien):', ...ordneruebersicht(e.dateien))
  }
  return z
}

/**
 * Abschnitt Ausführungsrahmen: was der spätere Bauschritt darf (vom Kern erzwungen) und die Rollenzeile.
 * @param rahmen - Rahmen oder null
 * @param rolle - Rolle (Architekt mit Meldeweg, Advisor mit Prüfpflicht)
 * @param fehlend - Sammelliste der Lücken
 * @returns Zeilen
 */
function ausfuehrungsrahmen(rahmen: KarteRahmen | null, rolle: KarteRolle, fehlend: string[]): string[] {
  if (rahmen === null) {
    fehlend.push('Ausführungsrahmen: Workflow ohne Ausführungsschritt oder Werkzeugsatz unbekannt')
    return ['Ausführungsrahmen: nicht bestimmbar (kein Ausführungsschritt mit bekanntem Werkzeugsatz).']
  }
  const werkzeuge = rahmen.werkzeuge.filter((w) => !w.startsWith('Bash('))
  const befehle = befehlsliste(rahmen.werkzeuge)
  const z = ['Gilt für den späteren Bauschritt; der Kern erzwingt ihn.', `- Werkzeuge: ${werkzeuge.length === 0 ? 'keine' : werkzeuge.join(', ')}`]
  z.push(
    befehle === ''
      ? '- Shell: keine Befehle erlaubt.'
      : `- Shell: nur ${befehle} (bei 'npm run' auch Unterskripte wie 'npm run check:<name>'); genau ein Befehl je Aufruf, keine Verkettung (&&, ;, |), keine Umleitung, kein 'cd', kein 'node' direkt, keine Server.`
  )
  if (rahmen.werkzeuge.includes('Bash(npm install)')) z.push("- Neue Pakete nur über package.json und danach 'npm install' ohne Argumente.")
  z.push(
    '- Kein git — die Änderungen erhebt die Workforce, Commits macht der Mensch.',
    '- Nichts im Hintergrund (run_in_background) — ein Hintergrund-Aufruf macht den Lauf FEHLGESCHLAGEN.',
    '- npm-Installationsskripte sind aus (npm_config_ignore_scripts).',
    rahmen.arbeitsordner ? '- Schreiben nur im eigenen Arbeitsordner dieses Ablaufs (Git-Worktree), nie im Projektordner.' : '- Schreiben nur im Projektordner.',
    rahmen.arbeitsordner ? '- Löschen nur über die Löschliste im Ergebnis (der Server prüft und löscht).' : '- Löschen: nicht vorgesehen (kein eigener Arbeitsordner).'
  )
  if (rahmen.bashZeitgrenzeMs !== null) z.push(`- Zeitgrenze je Shell-Befehl: ${Math.round(rahmen.bashZeitgrenzeMs / 60000)} min.`)
  z.push(rahmen.pruefbefehl === null ? '- Prüfbefehl: keiner konfiguriert.' : `- Prüfbefehl: ${beschreibePruefbefehl(rahmen.pruefbefehl)} — führt der Kern nach dem Bau selbst aus.`)
  if (rolle === 'architekt') {
    z.push(
      "Plane keinen Schritt außerhalb dieses Rahmens. Braucht der Auftrag einen, lege ihn als Eintrag in 'entscheidungen_mensch' vor (kategorie 'sonstig', Frage beginnt mit 'Ausführungsrahmen:') oder setze in 'capabilities_bedarf' status 'fehlt'."
    )
  } else if (rolle === 'architecture-advisor') {
    z.push("Ein Planschritt außerhalb dieses Rahmens, der nicht so gemeldet ist ('entscheidungen_mensch' mit Frage 'Ausführungsrahmen: …' oder capabilities_bedarf 'fehlt'), ist ein Befund.")
  }
  return z
}

/**
 * Abschnitt Im Projekt eingeschaltete Fähigkeiten (Stand der Seite Workforce).
 * @param faehigkeiten - Liste oder null
 * @param fehlend - Sammelliste der Lücken
 * @returns Zeilen
 */
function faehigkeitenAbschnitt(faehigkeiten: ProjektkarteEingaben['faehigkeiten'], fehlend: string[]): string[] {
  if (faehigkeiten === null) {
    fehlend.push('Fähigkeiten: Stand nicht lesbar')
    return ['Stand nicht lesbar.']
  }
  const z = faehigkeiten.length === 0 ? ['Keine.'] : [...faehigkeiten].sort((a, b) => vergleiche(`${a.typ}:${a.name}`, `${b.typ}:${b.name}`)).map((f) => `- ${f.typ}: ${f.name} (${f.quelle === 'projekt' ? 'Projekt' : 'Katalog'})`)
  z.push("Welche Katalog-Fähigkeiten der Bau tatsächlich bekommt, legt die Empfehlung beim Start fest; Bedarf darüber hinaus über 'capabilities_bedarf' (Capability-Auszug).")
  return z
}

/**
 * Abschnitt Qualität: DoD aus CLAUDE.md, Prüfbefehl; beim code-reviewer Checkliste mit Urteil je Punkt (F-829).
 * @param e - Eingaben
 * @param rolle - Rolle
 * @param fehlend - Sammelliste der Lücken
 * @returns Zeilen
 */
function qualitaet(e: ProjektkarteEingaben, rolle: KarteRolle, fehlend: string[]): string[] {
  const z: string[] = []
  if (e.dod === null || e.dod.length === 0) {
    z.push('Definition of Done: nicht gefunden.')
    // Ein Lesefehler zu CLAUDE.md (z. B. „Datei fehlt“) steht schon in fehlend — keine zweite, irreführende Lücke (QA L9).
    if (!e.lesefehler.some((l) => l.startsWith('CLAUDE.md:'))) fehlend.push('DoD: kein Abschnitt „Definition of Done“ in CLAUDE.md')
  } else {
    const punkte = e.dod.map((p) => p.replace(NUR_UI, '(nur UI)'))
    const platzhalter = punkte.filter((p) => PLATZHALTER.test(p)).length
    z.push('Definition of Done (CLAUDE.md):', ...punkte.filter((p) => !PLATZHALTER.test(p)).map((p) => `- ${p}`))
    if (platzhalter > 0) fehlend.push(`DoD: ${platzhalter} Punkte nur Platzhalter`)
  }
  if (e.rahmen?.pruefbefehl != null) z.push(`Prüfbefehl: ${beschreibePruefbefehl(e.rahmen.pruefbefehl)}.`)
  if (rolle !== 'code-reviewer') return z
  z.push('')
  const checkliste = e.reviewCheckliste === null ? [] : leseCheckliste(e.reviewCheckliste.text)
  if (e.reviewCheckliste === null || checkliste.length === 0) {
    z.push('Checkliste des Code-Reviewers: nicht gefunden.')
    fehlend.push(e.reviewCheckliste === null ? 'Checkliste des Code-Reviewers: fehlt' : 'Checkliste des Code-Reviewers: kein Abschnitt „Pruefkriterien“')
  } else {
    z.push(`Checkliste (${stempel(e.reviewCheckliste)}):`, kuerze(checkliste.join('\n'), GRENZE_CHECKLISTE, e.reviewCheckliste.pfad))
  }
  z.push(
    "Urteil je Punkt: Prüfe jeden Punkt der DoD und der Checkliste einzeln gegen den Diff. Jeder nicht erfüllte Punkt ist ein eigener Befund (fundstelle, beleg); die 'zusammenfassung' beginnt mit 'DoD:' bzw. 'Checkliste:' und dem Punkt. Punkte '(nur UI)' sind nicht anwendbar, wenn keine Oberfläche berührt ist. 'empfehlung' beginnt mit einer Zeile 'Checkliste: <n> geprüft, <m> nicht erfüllt, <k> nicht anwendbar'."
  )
  return z
}

/**
 * Baut die Projektkarte für eine Rolle: Text (Zuschnitt nach ZUSCHNITT, Größengrenze nach GRENZE_ZEICHEN mit
 * sichtbarem Marker), sha256 über den Text, Abschnittsliste und Lücken (Lesefehler des Servers zuerst).
 * @param eingaben - vom Server gelesene Eingaben
 * @param rolle - architekt, architecture-advisor oder code-reviewer
 * @returns { text, hash, abschnitte, fehlend }
 */
export function baueProjektkarte(eingaben: ProjektkarteEingaben, rolle: KarteRolle): Projektkarte {
  const fehlend: string[] = [...eingaben.lesefehler]
  const zuschnitt = [...(ZUSCHNITT.get(rolle) ?? [])]
  const bloecke: string[] = []
  for (const id of zuschnitt) {
    const zeilen =
      id === 'vorhaben'
        ? vorhaben(eingaben, rolle, fehlend)
        : id === 'bestand'
          ? bestand(eingaben, rolle, fehlend)
          : id === 'ausfuehrungsrahmen'
            ? ausfuehrungsrahmen(eingaben.rahmen, rolle, fehlend)
            : id === 'faehigkeiten'
              ? faehigkeitenAbschnitt(eingaben.faehigkeiten, fehlend)
              : qualitaet(eingaben, rolle, fehlend)
    bloecke.push([`## ${TITEL[id]}`, ...zeilen].join('\n'))
  }
  const fehlendEindeutig = [...new Set(fehlend)]
  const kopf = [
    '# Projektkarte',
    `Vom Leitstand je Lauf aus dem Projekt erzeugt (Rolle ${rolle}) — Kontext, kein Auftrag. Lies die genannten Dateien selbst, wenn du Einzelheiten brauchst.`,
    ...(fehlendEindeutig.length > 0 ? [`Lücken: ${fehlendEindeutig.join('; ')}.`] : []),
  ].join('\n')
  const voll = lf([kopf, ...bloecke].join('\n\n'))
  const grenze = GRENZE_ZEICHEN.get(rolle) ?? 0
  if (voll.length <= grenze) return { text: voll, hash: sha256(voll), abschnitte: zuschnitt, fehlend: fehlendEindeutig }
  // Der Marker zählt zur Grenze (Befund des echten Architekt-Laufs, Nachweis B2a-1): erst Marker bilden, dann kürzen.
  const marker = `\n… [Projektkarte gekürzt: Grenze ${grenze} Zeichen für die Rolle ${rolle}]`
  const schnitt = grenze - marker.length
  const text = `${voll.slice(0, schnitt).trimEnd()}${marker}`
  // Laufakte ehrlich (QA L2): abschnitte nennt nur, was vollständig im Text steht; fehlend nennt Gekürztes und Fehlendes.
  const abschnitte: AbschnittId[] = []
  let ende = lf(kopf).length
  zuschnitt.forEach((id, i) => {
    const start = ende + 2
    ende = start + lf(bloecke[i]).length
    if (ende <= schnitt) abschnitte.push(id)
    else fehlendEindeutig.push(`Projektkarte über der Grenze (${grenze} Zeichen): Abschnitt ${TITEL[id]} ${start < schnitt ? 'gekürzt' : 'fehlt'}`)
  })
  return { text, hash: sha256(text), abschnitte, fehlend: fehlendEindeutig }
}

/**
 * sha256 (hex) über einen Text.
 * @param text - Text
 * @returns Hash
 */
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * Typwächter: ist der Rollenname eine Rolle mit Karte?
 * @param rolle - Rollenname eines Schritts
 * @returns true für architekt, architecture-advisor, code-reviewer
 */
export function istKarteRolle(rolle: unknown): rolle is KarteRolle {
  return typeof rolle === 'string' && (KARTE_ROLLEN as readonly string[]).includes(rolle)
}

export type { KarteDatei, KarteRolle, Projektkarte, ProjektkarteEingaben }
