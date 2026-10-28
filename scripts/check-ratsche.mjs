#!/usr/bin/env node
/**
 * Datei: scripts/check-ratsche.mjs
 *
 * Zweck: Gate F45 W2c-1 „Ratschen + Formatierer für neue Dateien“ (Plan features/F45/plan-w2c1.md und plan-w2c1-v2.md,
 * Advisor advisor-w2c1.md, Entscheidungen E-FMT-1 = B und E-RATSCHE-1 = A). Codequalität wird nicht schlechter: der
 * Bestand ist in scripts/ratsche.json eingefroren und darf nur sinken; neue Dateien erfüllen die Regeln von Anfang an.
 * Je Code-Datei gezählt: Zeilen über GRENZE_ZEILEN, Biome-Befunde je Regel (alle Schweren), checkJs-Fehler
 * (tsconfig.checkjs.json, nur scripts/leitstand/*.mjs ohne Tests); dazu die Liste formatierter Dateien.
 * (a) Ist > Bestand ⇒ rot; (b) Ist < Bestand ⇒ rot (Bestand senken: --aktualisiere);
 * (c) Bestandswert höher als auf der merge-base mit main (fehlt dort = 0) ⇒ rot;
 * (d) Listeneintrag der merge-base fehlt, obwohl die Datei existiert ⇒ rot (die Liste darf nur wachsen);
 * (e) Befund oder Datei ohne Bestandseintrag ⇒ rot (neue Dateien kommen sauber);
 * (f) JSON fehlt, ist kaputt oder unvollständig; Werkzeugausgabe unlesbar oder unvollständig; fremde Kategorie ⇒ rot;
 * (g1) gelistete Datei unformatiert ⇒ rot; (g2) gelisteter Pfad ist keine Code-Datei mehr ⇒ rot (entfernen);
 * (g3) Code-Datei, die auf der merge-base nicht existiert und nicht in der Liste steht ⇒ rot (formatieren, aufnehmen).
 *
 * Code-Dateien: CODE_MUSTER über `git ls-files --cached --others --exclude-standard -- scripts src public` (wie
 * scripts/teste.mjs, nur vorhandene). Biome läuft ohne Ignore-Datei (kein `vcs` in biome.json, Delta-Advisor N1) und sieht
 * damit jede dieser Dateien; `files.includes` deckt CODE_MUSTER (Test); Dateien ab Biomes `files.maxSize` (1 MiB)
 * überspringt Biome still ⇒ (f). Eine Datei mit JS/TS-Endung außerhalb von CODE_MUSTER (.cjs, .mts, .tsx, .ts unter
 * public/ …) ⇒ (f) (cr 7). Biome- und tsc-Befunde zählen nur für diese Code-Dateien (gitignorierte bleiben außen vor).
 * Ausgenommen von der Dateigrenze: scripts/leitstand-server.mjs (eigene Ratsche check-wachstumsbremse-server, W1) und die i18n-Wörterbücher
 * (Daten, E-RATSCHE-1 = A). Zeilen wie `wc -l` (CRLF und LF gleich).
 *
 * Durchsetzungsgrad (ARCHITECTURE.md §1): ERZWUNGEN — (a)–(g3) über die Werkzeuge, (c)/(d)/(g3) bei lesbarer Referenz
 * (merge-base mit origin/main bzw. main; CI mit fetch-depth 0). DEKLARIERT — Bearbeiten von Gate, ratsche.json,
 * biome.json, tsconfig.checkjs.json und Unterdrückungen im Code (biome-ignore, @ts-nocheck, @ts-expect-error): sie senken
 * das Ist; Formatierung durch einen Editor („format on save“) außerhalb der Liste; Änderungen an importierten, nicht
 * gelisteten public/leitstand/*.js verschieben die checkJs-Zählung einer gelisteten Datei; checkJs erfasst nur
 * scripts/leitstand/*.mjs (keine Unterordner, keine .js dort); ein Werkzeug-Update kann neue Befunde bringen ((e) —
 * Befunde beheben oder Bestand nur mit Entscheidung Stefans anheben, (c) einmal rot).
 * Folgen (Advisor 1/6/14): Bestandsdateien über 800 Zeilen (z. B. views/workboard.js) sind zeilenneutral zu ändern; neue
 * Module unter scripts/leitstand/ brauchen 0 checkJs-Fehler, Komplexität ≤ 15 und Formatierung; eine umbenannte
 * Bestandsdatei ist neu — ihr Eintrag erhöht den Bestand ((c) bewusst einmal rot, nur mit Entscheidung Stefans).
 *
 * Wird aufgerufen von: scripts/check-kette.mjs (GATES, `npm run check:gates`); scripts/check-ratsche.test.mjs.
 *
 * Wichtig: reine Funktionen exportiert, Werkzeuge nur am Haupteinstieg. Nur node:-Importe (Prüfkettenmuster, Regel 1j).
 * `--aktualisiere` schreibt nur Senkungen, Entfernungen und Erweiterungen der Liste, nie eine Erhöhung; fehlt die JSON
 * lokal und auf der Referenz, erhebt es den Bestand neu, aber nur für Dateien, die auf der merge-base existieren.
 *
 * Aufruf: node scripts/check-ratsche.mjs [--aktualisiere]
 * Exit 0 = sauber, 1 = Befund, 2 = Aufruffehler
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { join, matchesGlob, resolve } from 'node:path'

export const RATSCHE_PFAD = 'scripts/ratsche.json'
export const GRENZE_ZEILEN = 800
export const CODE_MUSTER = ['scripts/**/*.{ts,mjs,js}', 'src/**/*.{ts,mjs,js}', 'public/**/*.{js,mjs}']
export const AUSGENOMMEN_ZEILEN = ['scripts/leitstand-server.mjs', 'public/leitstand/i18n/*.js']
export const CHECKJS_MUSTER = 'scripts/leitstand/*.mjs'
export const FORMAT_BEFEHL = 'npx biome format --write <datei>'
const BIOME = 'node_modules/@biomejs/biome/bin/biome'
const TSC = 'node_modules/typescript/bin/tsc'
const PUFFER = 64 * 1024 * 1024
const ORDNER = ['scripts', 'src', 'public']
/** Biomes Standard für files.maxSize: größere Dateien überspringt Biome ohne Befund (Delta-Advisor N5). */
const BIOME_MAX_BYTES = 1024 * 1024

/**
 * Pfad in Vergleichsform: Windows-Trenner durch „/“ ersetzt.
 * @param pfad - Pfad wie vom Werkzeug gemeldet
 * @returns Pfad mit „/“
 */
const vorwaerts = (pfad) => pfad.replace(/\\/g, '/')

/**
 * Ist der Pfad eine Code-Datei im Sinn der Ratsche?
 * @param pfad - relativer Pfad mit „/“
 * @returns true für CODE_MUSTER außerhalb von node_modules
 */
export function istCodeDatei(pfad) {
  return !pfad.split('/').includes('node_modules') && CODE_MUSTER.some((muster) => matchesGlob(pfad, muster))
}

/**
 * Zählt die checkJs-Fehler dieser Datei (tsconfig.checkjs.json, Tests ausgenommen)?
 * @param pfad - relativer Pfad mit „/“
 * @returns true für scripts/leitstand/*.mjs ohne .test.mjs
 */
export function istCheckjsDatei(pfad) {
  return matchesGlob(pfad, CHECKJS_MUSTER) && !pfad.endsWith('.test.mjs')
}

/**
 * Zeilen eines Textes wie `wc -l`, +1 ohne Endumbruch (Kopie aus check-wachstumsbremse-server, Advisor 10).
 * @param text - Dateiinhalt
 * @returns Zeilenzahl
 */
export function zaehleZeilen(text) {
  if (text.length === 0) return 0
  const umbrueche = text.split('\n').length - 1
  return text.endsWith('\n') ? umbrueche : umbrueche + 1
}

/**
 * Zählt die Dateigrenze: Zeilen jeder Code-Datei über GRENZE_ZEILEN, ausgenommen AUSGENOMMEN_ZEILEN.
 * @param dateien - Code-Dateien (relativ, „/“)
 * @param lies - liefert den Inhalt einer Datei
 * @returns Map Pfad → Zeilen (nur über der Grenze)
 */
export function erhebeZeilen(dateien, lies) {
  const ergebnis = new Map()
  for (const pfad of dateien) {
    if (AUSGENOMMEN_ZEILEN.some((muster) => matchesGlob(pfad, muster))) continue
    const zeilen = zaehleZeilen(lies(pfad))
    if (zeilen > GRENZE_ZEILEN) ergebnis.set(pfad, zeilen)
  }
  return ergebnis
}

/**
 * Liest die JSON-Ausgabe eines Biome-Laufs und prüft sie auf Vollständigkeit (Advisor 3).
 * @param text - stdout von `biome lint|format --reporter=json`
 * @returns { diagnosen, fehler } — fehler nicht leer ⇒ Ausgabe nicht verwendbar
 */
export function leseBiomeJson(text) {
  let daten
  try {
    daten = JSON.parse(text)
  } catch {
    return { diagnosen: [], fehler: [`Biome-Ausgabe ist kein JSON: ${text.slice(0, 200)}`] }
  }
  const summe = daten?.summary
  if (!Array.isArray(daten?.diagnostics) || summe === null || typeof summe !== 'object') {
    return { diagnosen: [], fehler: ['Biome-Ausgabe ohne diagnostics/summary'] }
  }
  const erwartet = summe.errors + summe.warnings + summe.infos
  if (summe.diagnosticsNotPrinted !== 0 || daten.diagnostics.length !== erwartet) {
    const was = `${daten.diagnostics.length} Diagnosen, Summe ${erwartet}, nicht gedruckt ${summe.diagnosticsNotPrinted}`
    return { diagnosen: [], fehler: [`Biome-Ausgabe unvollständig: ${was}`] }
  }
  return { diagnosen: daten.diagnostics, fehler: [] }
}

/**
 * Pfad einer Biome-Diagnose (Windows-Trenner normalisiert) oder null bei Diagnosen ohne Datei.
 * @param diagnose - Eintrag aus diagnostics
 * @returns relativer Pfad mit „/“ oder null
 */
function diagnosePfad(diagnose) {
  const pfad = diagnose?.location?.path
  return typeof pfad === 'string' && pfad !== '' ? vorwaerts(pfad) : null
}

/**
 * Wertet Biome-Diagnosen aus: zählt `lint/*` je Datei und Regel bzw. sammelt `format`; Diagnosen zu anderen Dateien
 * (JSON) zählen nicht; jede andere Kategorie in einer Code-Datei und jede Diagnose ohne Datei ist ein Fehler.
 * @param diagnosen - geprüfte diagnostics
 * @param art - 'lint' oder 'format'
 * @returns { lint: Map Pfad → Map Regel → Anzahl, unformatiert: Set, fehler }
 */
export function werteBiomeAus(diagnosen, art) {
  const ergebnis = { lint: new Map(), unformatiert: new Set(), fehler: [] }
  for (const diagnose of diagnosen) ordneDiagnoseZu(ergebnis, diagnose, art)
  return ergebnis
}

/**
 * Ordnet eine Biome-Diagnose dem Ergebnis von werteBiomeAus zu.
 * @param ergebnis - { lint, unformatiert, fehler } (wird ergänzt)
 * @param diagnose - Eintrag aus diagnostics
 * @param art - 'lint' oder 'format'
 */
function ordneDiagnoseZu(ergebnis, diagnose, art) {
  const pfad = diagnosePfad(diagnose)
  const kategorie = String(diagnose?.category ?? '')
  if (pfad === null) {
    ergebnis.fehler.push(`Biome-Diagnose ohne Datei (${art}): ${kategorie} ${diagnose?.message ?? ''}`)
    return
  }
  if (!istCodeDatei(pfad)) return
  if (art === 'lint' && kategorie.startsWith('lint/')) {
    const regeln = ergebnis.lint.get(pfad) ?? new Map()
    const regel = kategorie.slice('lint/'.length)
    regeln.set(regel, (regeln.get(regel) ?? 0) + 1)
    ergebnis.lint.set(pfad, regeln)
    return
  }
  if (art === 'format' && kategorie === 'format') {
    ergebnis.unformatiert.add(pfad)
    return
  }
  const was = kategorie === 'parse' ? 'Syntaxfehler (parse)' : `fremde Biome-Kategorie ${kategorie}`
  ergebnis.fehler.push(`${was} (${art}) in ${pfad} — npx biome ${art} ${pfad}`)
}

/**
 * Wertet die Ausgabe von `tsc --pretty false` aus: Fehler je gelisteter Datei; Fehler in anderen Dateien zählen nicht;
 * `error TS…` ohne Datei (Konfiguration, fehlende Typen) ist ein Fehler.
 * @param text - stdout von tsc
 * @returns { checkjs: Map Pfad → Anzahl, fehler }
 */
export function werteTscAus(text) {
  const checkjs = new Map()
  const fehler = []
  for (const zeile of text.split(/\r?\n/)) {
    const treffer = /^(?<pfad>[^\s(][^(]*)\(\d+,\d+\): error TS\d+/.exec(zeile)
    if (treffer) {
      const pfad = vorwaerts(treffer.groups.pfad)
      if (!/\.[cm]?[jt]sx?$/.test(pfad)) fehler.push(`tsc meldet einen Fehler in einer Nicht-Quelldatei: ${zeile}`)
      else if (istCheckjsDatei(pfad)) checkjs.set(pfad, (checkjs.get(pfad) ?? 0) + 1)
    } else if (/^error TS\d+/.test(zeile)) {
      fehler.push(`tsc ohne Datei: ${zeile}`)
    }
  }
  return { checkjs, fehler }
}

/**
 * Führt ein Werkzeug aus node_modules mit dem laufenden Node aus (ohne Shell); Exit ≠ 0 mit Ausgabe ist normal.
 * @param wurzel - Arbeitsordner (Repo-Wurzel)
 * @param bin - Pfad des Werkzeugs relativ zu binWurzel
 * @param argumente - Argumente
 * @param binWurzel - Ordner mit node_modules (Standard: wurzel; der Test prüft einen Wegwerf-Ordner)
 * @returns stdout
 * @throws wenn das Werkzeug nicht startet oder keine Ausgabe liefert
 */
function fuehreWerkzeugAus(wurzel, bin, argumente, binWurzel = wurzel) {
  const optionen = { cwd: wurzel, encoding: 'utf8', maxBuffer: PUFFER, stdio: ['ignore', 'pipe', 'pipe'] }
  try {
    return execFileSync(process.execPath, [join(binWurzel, bin), ...argumente], optionen)
  } catch (fehler) {
    const normalesEnde = typeof fehler?.status === 'number' && !fehler.signal && !fehler.code
    if (normalesEnde && typeof fehler.stdout === 'string' && fehler.stdout !== '') return fehler.stdout
    const text = fehler instanceof Error ? fehler.message : String(fehler)
    throw new Error(`${bin} ${argumente.join(' ')} scheitert ohne Ausgabe: ${text} ${fehler?.stderr ?? ''}`.trim())
  }
}

/**
 * Lässt Biome lint und format über scripts/, src/, public/ laufen und wertet beide aus (Umfang laut biome.json in wurzel).
 * @param wurzel - Ordner mit biome.json und den drei Code-Ordnern
 * @param binWurzel - Ordner mit node_modules (Standard: wurzel)
 * @returns { lint: Map Pfad → Map Regel → Anzahl, unformatiert: Set, fehler }
 */
export function erhebeBiome(wurzel, binWurzel = wurzel) {
  const lauf = (befehl) =>
    leseBiomeJson(
      fuehreWerkzeugAus(wurzel, BIOME, [befehl, '--reporter=json', '--max-diagnostics=none', ...ORDNER], binWurzel)
    )
  const lintLauf = lauf('lint')
  const formatLauf = lauf('format')
  const lint = werteBiomeAus(lintLauf.diagnosen, 'lint')
  const format = werteBiomeAus(formatLauf.diagnosen, 'format')
  const fehler = [...lintLauf.fehler, ...formatLauf.fehler, ...lint.fehler, ...format.fehler]
  return { lint: lint.lint, unformatiert: format.unformatiert, fehler }
}

/**
 * Erhebt das Ist: Zeilen, Lint-Befunde, Formatierung, checkJs-Fehler.
 * @param wurzel - Repo-Wurzel
 * @param dateien - Code-Dateien (relativ, „/“)
 * @returns { dateien: Bestandsform je Datei, unformatiert: Set, fehler }
 */
export function erhebeIst(wurzel, dateien) {
  const zeilen = erhebeZeilen(dateien, (pfad) => readFileSync(join(wurzel, pfad), 'utf8'))
  const zuGross = dateien.filter((pfad) => statSync(join(wurzel, pfad)).size >= BIOME_MAX_BYTES)
  const biome = erhebeBiome(wurzel)
  const tsc = werteTscAus(fuehreWerkzeugAus(wurzel, TSC, ['-p', 'tsconfig.checkjs.json', '--pretty', 'false']))
  const menge = new Set(dateien)
  const nurCode = (karte) => new Map([...karte].filter(([pfad]) => menge.has(pfad)))
  const fehler = [
    ...zuGross.map((pfad) => `${pfad} ist ≥ 1 MiB — Biome prüft sie nicht (files.maxSize)`),
    ...biome.fehler,
    ...tsc.fehler,
  ]
  const unformatiert = new Set([...biome.unformatiert].filter((pfad) => menge.has(pfad)))
  return { dateien: baueEintraege(zeilen, nurCode(biome.lint), nurCode(tsc.checkjs)), unformatiert, fehler }
}

/**
 * Baut die Bestandsform je Datei aus den drei Zählungen; nur Werte > 0.
 * @param zeilen - Map Pfad → Zeilen
 * @param lint - Map Pfad → Map Regel → Anzahl
 * @param checkjs - Map Pfad → Anzahl
 * @returns Objekt Pfad → { zeilen?, lint?, checkjs? }
 */
export function baueEintraege(zeilen, lint, checkjs) {
  const dateien = {}
  const eintrag = (pfad) => {
    dateien[pfad] ??= {}
    return dateien[pfad]
  }
  for (const [pfad, wert] of zeilen) eintrag(pfad).zeilen = wert
  for (const [pfad, regeln] of lint) eintrag(pfad).lint = Object.fromEntries(regeln)
  for (const [pfad, wert] of checkjs) eintrag(pfad).checkjs = wert
  return dateien
}

/**
 * Flacht die Bestandsform zu Schlüssel → Wert ab („<pfad> zeilen“, „<pfad> checkjs“, „<pfad> lint:<regel>“).
 * @param dateien - Objekt Pfad → { zeilen?, lint?, checkjs? }
 * @returns Map Schlüssel → Wert
 */
export function flach(dateien) {
  const werte = new Map()
  for (const [pfad, eintrag] of Object.entries(dateien)) {
    if (eintrag.zeilen !== undefined) werte.set(`${pfad} zeilen`, eintrag.zeilen)
    if (eintrag.checkjs !== undefined) werte.set(`${pfad} checkjs`, eintrag.checkjs)
    for (const [regel, wert] of Object.entries(eintrag.lint ?? {})) werte.set(`${pfad} lint:${regel}`, wert)
  }
  return werte
}

/**
 * Baut die Bestandsform aus flachen Werten zurück (Gegenstück zu flach); Werte ≤ 0 entfallen.
 * @param werte - Map Schlüssel → Wert
 * @returns Objekt Pfad → { zeilen?, lint?, checkjs? }
 */
export function entflache(werte) {
  const zeilen = new Map()
  const lint = new Map()
  const checkjs = new Map()
  for (const [schluessel, wert] of werte) {
    if (wert <= 0) continue
    const trenner = schluessel.lastIndexOf(' ')
    const pfad = schluessel.slice(0, trenner)
    const art = schluessel.slice(trenner + 1)
    if (art === 'zeilen') zeilen.set(pfad, wert)
    else if (art === 'checkjs') checkjs.set(pfad, wert)
    else lint.set(pfad, (lint.get(pfad) ?? new Map()).set(art.slice('lint:'.length), wert))
  }
  return baueEintraege(zeilen, lint, checkjs)
}

/**
 * Formprüfung des Bestands: Objekt `dateien` mit positiven Ganzzahlen, Liste `formatiert` aus Strings.
 * @param bestand - geparstes JSON
 * @returns Liste der Formfehler; leer = gültig
 */
export function pruefeForm(bestand) {
  if (bestand === null || typeof bestand !== 'object' || Array.isArray(bestand)) return ['ist kein Objekt']
  const fehler = []
  const positiv = (wert) => Number.isSafeInteger(wert) && wert > 0
  const { dateien, formatiert } = bestand
  if (dateien === null || typeof dateien !== 'object' || Array.isArray(dateien))
    fehler.push("'dateien' ist kein Objekt")
  else {
    for (const [pfad, eintrag] of Object.entries(dateien)) fehler.push(...pruefeEintrag(pfad, eintrag, positiv))
  }
  if (!Array.isArray(formatiert) || !formatiert.every((pfad) => typeof pfad === 'string')) {
    fehler.push("'formatiert' ist keine Liste von Strings")
  }
  return fehler
}

/**
 * Formprüfung eines Eintrags: Objekt mit höchstens zeilen, checkjs (positive Ganzzahlen) und lint (Objekt davon).
 * @param pfad - Schlüssel des Eintrags
 * @param eintrag - Wert des Eintrags
 * @param positiv - Prüfer für positive Ganzzahlen
 * @returns Formfehler des Eintrags
 */
function pruefeEintrag(pfad, eintrag, positiv) {
  const istObjekt = (wert) => wert !== null && typeof wert === 'object' && !Array.isArray(wert)
  if (!istObjekt(eintrag)) return [`'dateien.${pfad}' ist kein Objekt`]
  const fremd = Object.keys(eintrag).filter((schluessel) => !['zeilen', 'checkjs', 'lint'].includes(schluessel))
  if (fremd.length > 0) return [`'dateien.${pfad}' hat unbekannte Schlüssel: ${fremd.join(', ')}`]
  if (eintrag.lint !== undefined && !istObjekt(eintrag.lint)) return [`'dateien.${pfad}.lint' ist kein Objekt`]
  const werte = [eintrag.zeilen, eintrag.checkjs].filter((wert) => wert !== undefined)
  if (![...werte, ...Object.values(eintrag.lint ?? {})].every(positiv))
    return [`'dateien.${pfad}' hat einen Wert, der keine positive Ganzzahl ist`]
  return []
}

/**
 * Liest und prüft den Bestand aus einem Dateiinhalt (f).
 * @param text - Inhalt von scripts/ratsche.json oder null, wenn die Datei fehlt
 * @returns { bestand, befunde } — bestand null bei Befunden
 */
export function ladeBestand(text) {
  if (text === null) return { bestand: null, befunde: [`(f) ${RATSCHE_PFAD} fehlt`] }
  let bestand
  try {
    bestand = JSON.parse(text)
  } catch (fehler) {
    const grund = fehler instanceof Error ? fehler.message : String(fehler)
    return { bestand: null, befunde: [`(f) ${RATSCHE_PFAD} ist kein gültiges JSON: ${grund}`] }
  }
  const form = pruefeForm(bestand).map((fehler) => `(f) ${RATSCHE_PFAD}: ${fehler}`)
  return form.length === 0 ? { bestand, befunde: [] } : { bestand: null, befunde: form }
}

/**
 * Handlungshinweis zu einem Zählschlüssel für (a)/(e).
 * @param schluessel - „<pfad> zeilen“, „<pfad> checkjs“ oder „<pfad> lint:<regel>“
 * @returns Hinweistext
 */
function wegweiser(schluessel) {
  const pfad = schluessel.slice(0, schluessel.lastIndexOf(' '))
  if (schluessel.endsWith(' zeilen'))
    return `Grenze ${GRENZE_ZEILEN} Zeilen: kürzen oder teilen (Bestandsdateien zeilenneutral ändern).`
  if (schluessel.endsWith(' checkjs')) return 'Fehler finden: npx tsc -p tsconfig.checkjs.json --pretty false'
  return `Befund finden: npx biome lint ${pfad} (neue Dateien und Befunde kommen sauber).`
}

/**
 * Prüft die Zählwerte (a), (b), (c), (e).
 * @param ist - Ist in Bestandsform
 * @param bestand - Bestand (formgültig)
 * @param basis - Bestand auf der Referenz oder null
 * @returns Befunde
 */
function pruefeWerte(ist, bestand, basis) {
  const befunde = []
  const istWerte = flach(ist)
  const bestandWerte = flach(bestand.dateien)
  for (const [schluessel, wert] of istWerte) {
    const grenze = bestandWerte.get(schluessel) ?? 0
    if (grenze === 0) befunde.push(`(e) ${schluessel}: ${wert} ohne Bestandseintrag — ${wegweiser(schluessel)}`)
    else if (wert > grenze)
      befunde.push(`(a) ${schluessel}: Ist ${wert} > Bestand ${grenze} — ${wegweiser(schluessel)}`)
  }
  for (const [schluessel, grenze] of bestandWerte) {
    const wert = istWerte.get(schluessel) ?? 0
    if (wert < grenze) befunde.push(`(b) ${schluessel}: Ist ${wert} < Bestand ${grenze} — senken: --aktualisiere.`)
  }
  if (basis === null) return befunde
  const basisWerte = flach(basis.dateien)
  for (const [schluessel, grenze] of bestandWerte) {
    const vorher = basisWerte.get(schluessel) ?? 0
    if (grenze > vorher)
      befunde.push(
        `(c) ${schluessel}: Bestand ${grenze} > main ${vorher} — der Bestand darf nur sinken: Wert von main übernehmen (git show origin/main:${RATSCHE_PFAD}), dann --aktualisiere; Anheben nur mit Entscheidung Stefans.`
      )
  }
  return befunde
}

/**
 * Prüft die Formatierer-Liste (d), (g1)–(g3).
 * @param eingabe - codeDateien (Set), unformatiert (Set), bestand, basis (oder null), basisDateien (Set oder null)
 * @returns Befunde
 */
function pruefeListe({ codeDateien, unformatiert, bestand, basis, basisDateien }) {
  const befunde = []
  const liste = new Set(bestand.formatiert)
  for (const pfad of liste) {
    if (!codeDateien.has(pfad)) befunde.push(`(g2) ${pfad} steht in der Liste, ist aber keine Code-Datei — entfernen.`)
    else if (unformatiert.has(pfad)) befunde.push(`(g1) ${pfad} ist nicht formatiert — ${FORMAT_BEFEHL}.`)
  }
  for (const pfad of basis?.formatiert ?? []) {
    if (codeDateien.has(pfad) && !liste.has(pfad))
      befunde.push(
        `(d) ${pfad} fehlt in der Liste (main) — die Liste wächst nur: ${FORMAT_BEFEHL}, dann --aktualisiere.`
      )
  }
  if (basisDateien === null) return befunde
  for (const pfad of codeDateien) {
    if (!basisDateien.has(pfad) && !liste.has(pfad)) {
      befunde.push(`(g3) neue Datei ${pfad} nicht in der Liste — ${FORMAT_BEFEHL}, dann --aktualisiere.`)
    }
  }
  return befunde
}

/**
 * Die Prüfung (a)–(e), (g1)–(g3); erwartet einen formgültigen Bestand.
 * @param eingabe - ist (Bestandsform), codeDateien, unformatiert, bestand, basis (oder null), basisDateien (oder null)
 * @returns Liste der Befunde; leer = grün
 */
export function pruefeRatsche({ ist, codeDateien, unformatiert, bestand, basis, basisDateien }) {
  return [
    ...pruefeWerte(ist, bestand, basis),
    ...pruefeListe({ codeDateien, unformatiert, bestand, basis, basisDateien }),
  ]
}

/**
 * Neuer Bestand für --aktualisiere: je Schlüssel min(Start, Ist), nie ein neuer Schlüssel; Liste = alte Einträge, die
 * Code-Dateien sind, plus alle formatierten Code-Dateien. Ohne Start (JSON lokal und auf der Referenz fehlt) erhebt es
 * neu, aber nur für Dateien der merge-base (Advisor 2).
 * @param eingabe - ist, codeDateien, unformatiert, start (Bestand oder null), basisDateien (Set oder null)
 * @returns { bestand } oder { fehler }
 */
export function aktualisiere({ ist, codeDateien, unformatiert, start, basisDateien }) {
  const formatiert = [...codeDateien].filter((pfad) => !unformatiert.has(pfad))
  if (start === null) {
    if (basisDateien === null) return { fehler: 'Ersterhebung ohne lesbare merge-base nicht möglich' }
    const werte = new Map(
      [...flach(ist)].filter(([schluessel]) => basisDateien.has(schluessel.slice(0, schluessel.lastIndexOf(' '))))
    )
    return { bestand: { dateien: entflache(werte), formatiert: formatiert.sort() } }
  }
  const istWerte = flach(ist)
  const werte = new Map(
    [...flach(start.dateien)].map(([schluessel, wert]) => [schluessel, Math.min(wert, istWerte.get(schluessel) ?? 0)])
  )
  const liste = new Set([...start.formatiert.filter((pfad) => codeDateien.has(pfad)), ...formatiert])
  return { bestand: { dateien: entflache(werte), formatiert: [...liste].sort() } }
}

/**
 * Startbestand für --aktualisiere: der lokale, sonst der von main; null nur, wenn beide fehlen (Ersterhebung, Advisor 2).
 * @param lokal - gültiger lokaler Bestand oder null (fehlt/kaputt)
 * @param basis - Bestand auf der Referenz oder null
 * @returns Startbestand oder null
 */
export function waehleStart(lokal, basis) {
  return lokal ?? basis
}

/**
 * Schreibt den Bestand diff-freundlich: eine Zeile je Datei und je Listeneintrag, sortiert.
 * @param bestand - { dateien, formatiert }
 * @returns JSON-Text mit Endumbruch
 */
export function serialisiere(bestand) {
  const sortiert = (objekt) =>
    Object.fromEntries(Object.entries(objekt).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  const zeilen = Object.keys(bestand.dateien)
    .sort()
    .map((pfad) => {
      const { zeilen: z, checkjs, lint } = bestand.dateien[pfad]
      const eintrag = { zeilen: z, checkjs, lint: lint === undefined ? undefined : sortiert(lint) }
      return `    ${JSON.stringify(pfad)}: ${JSON.stringify(eintrag)}`
    })
  const liste = [...bestand.formatiert].sort().map((pfad) => `    ${JSON.stringify(pfad)}`)
  return `{\n  "dateien": {\n${zeilen.join(',\n')}\n  },\n  "formatiert": [\n${liste.join(',\n')}\n  ]\n}\n`
}

/**
 * Listet die Code-Dateien über git (getrackt und ungetrackt, nicht ignoriert), nur vorhandene.
 * @param wurzel - Repo-Wurzel
 * @param git - führt git aus und liefert stdout (injizierbar)
 * @returns sortierte relative Pfade mit „/“
 */
export function listeCodeDateien(wurzel, git) {
  return listeDateien(wurzel, git).filter(istCodeDatei)
}

/**
 * Listet alle vorhandenen Dateien unter scripts/, src/, public/ über git (getrackt und ungetrackt, nicht ignoriert).
 * @param wurzel - Repo-Wurzel
 * @param git - führt git aus und liefert stdout (injizierbar)
 * @returns sortierte relative Pfade mit „/“
 */
function listeDateien(wurzel, git) {
  const ausgabe = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...ORDNER])
  return [...new Set(ausgabe.split('\0'))].filter((pfad) => pfad !== '' && existsSync(join(wurzel, pfad))).sort()
}

/**
 * Dateien mit JS/TS-Endung, die nicht unter CODE_MUSTER fallen und darum weder gezählt noch formatiert würden (cr 7).
 * @param wurzel - Repo-Wurzel
 * @param git - führt git aus und liefert stdout (injizierbar)
 * @returns Pfade
 */
export function fremdeCodeDateien(wurzel, git) {
  return listeDateien(wurzel, git).filter(
    (pfad) => /\.[cm]?[jt]sx?$/.test(pfad) && !pfad.split('/').includes('node_modules') && !istCodeDatei(pfad)
  )
}

/**
 * Normalisiert einen Pfad für den Vergleich der git-Wurzel (Windows: Groß/klein, Trenner).
 * @param pfad - Pfad
 * @returns Vergleichsform
 */
function vergleichsform(pfad) {
  const echt = existsSync(pfad) ? realpathSync(pfad) : resolve(pfad)
  return process.platform === 'win32' ? echt.replace(/\//g, '\\').toLowerCase() : echt
}

/**
 * Bestand an einem Stand (Revision).
 * @param git - git-Aufruf
 * @param revision - Commit oder Ref
 * @returns { bestand } | { fehlt: true } | { kaputt: true }
 */
function bestandAn(git, revision) {
  let text
  try {
    text = git(['show', `${revision}:${RATSCHE_PFAD}`])
  } catch {
    return { fehlt: true }
  }
  const { bestand } = ladeBestand(text)
  return bestand === null ? { kaputt: true } : { bestand }
}

/**
 * Liest die Referenz: merge-base mit `origin/main`, sonst `main`; Dateiliste immer an der merge-base (g3); Bestand an der
 * merge-base, fehlt er dort (gestapelter Branch), an der Spitze des Refs (Muster check-wachstumsbremse-server).
 * @param wurzel - Repo-Wurzel
 * @param git - führt git aus und liefert stdout (injizierbar)
 * @returns { basis, basisDateien, hinweis } — basis/basisDateien null, wenn nicht lesbar
 */
export function leseReferenz(wurzel, git) {
  const ohne = (grund) => ({
    basis: null,
    basisDateien: null,
    hinweis: `Referenz nicht lesbar: ${grund} — (c)/(d)/(g3) nicht geprüft`,
  })
  try {
    if (vergleichsform(git(['rev-parse', '--show-toplevel']).trim()) !== vergleichsform(wurzel))
      return ohne('die Wurzel ist kein eigenes git-Repo')
  } catch {
    return ohne('kein git-Repo (oder git fehlt)')
  }
  const refs = []
  for (const ref of ['origin/main', 'main']) {
    try {
      refs.push({ ref, mergeBase: git(['merge-base', 'HEAD', ref]).trim() })
    } catch {
      // Ref fehlt (flacher Clone, Kopie ohne main) — nächster Ref.
    }
  }
  if (refs.length === 0) return ohne('weder origin/main noch main')
  const { ref, mergeBase } = refs[0]
  let basisDateien
  try {
    basisDateien = new Set(git(['ls-tree', '-r', '-z', '--name-only', mergeBase]).split('\0').filter(Boolean))
  } catch {
    return ohne(`git ls-tree an ${mergeBase.slice(0, 7)} scheitert`)
  }
  for (const kandidat of [mergeBase, ...refs.map((eintrag) => eintrag.ref)]) {
    const stand = bestandAn(git, kandidat)
    if (stand.bestand)
      return {
        basis: stand.bestand,
        basisDateien,
        hinweis: `Referenz: ${RATSCHE_PFAD} an ${kandidat} (merge-base mit ${ref} ${mergeBase.slice(0, 7)})`,
      }
    if (stand.kaputt)
      return {
        basis: null,
        basisDateien,
        hinweis: `Referenz nicht lesbar: ${RATSCHE_PFAD} an ${kandidat} ist kein gültiger Stand — (c)/(d) nicht geprüft; (g3) gegen merge-base ${mergeBase.slice(0, 7)}`,
      }
  }
  return {
    basis: null,
    basisDateien,
    hinweis: `${RATSCHE_PFAD} fehlt auf main (vor dem ersten Merge) — (c)/(d) nicht geprüft; (g3) gegen merge-base ${mergeBase.slice(0, 7)}`,
  }
}

/**
 * Haupteinstieg: erhebt, aktualisiert auf Wunsch, prüft und meldet.
 * @param wurzel - Repo-Wurzel
 * @param argumente - Kommandozeilenargumente
 * @returns Exit-Code
 */
function hauptprogramm(wurzel, argumente) {
  if (argumente.some((argument) => argument !== '--aktualisiere')) {
    console.error(`Unbekannte Argumente: ${argumente.join(' ')} — erlaubt: --aktualisiere`)
    return 2
  }
  const git = (args) =>
    execFileSync('git', args, { cwd: wurzel, encoding: 'utf8', maxBuffer: PUFFER, stdio: ['ignore', 'pipe', 'ignore'] })
  let codeDateien
  let ist
  try {
    codeDateien = new Set(listeCodeDateien(wurzel, git))
    const fremd = fremdeCodeDateien(wurzel, git)
    if (fremd.length > 0)
      return melde(
        fremd.map((pfad) => `(f) ${pfad}: Endung außerhalb von CODE_MUSTER — umbenennen oder Gate erweitern.`)
      )
    ist = erhebeIst(wurzel, [...codeDateien])
  } catch (fehler) {
    return melde([`(f) Erhebung gescheitert: ${fehler instanceof Error ? fehler.message : String(fehler)}`])
  }
  if (ist.fehler.length > 0) return melde(ist.fehler.map((fehler) => `(f) ${fehler}`))
  const { basis, basisDateien, hinweis } = leseReferenz(wurzel, git)
  console.log(`  ${hinweis}`)
  const pfad = join(wurzel, RATSCHE_PFAD)
  const gelesen = ladeBestand(existsSync(pfad) ? readFileSync(pfad, 'utf8') : null)
  const eingabe = { ist: ist.dateien, codeDateien, unformatiert: ist.unformatiert, basisDateien }
  if (argumente.includes('--aktualisiere')) {
    const neu = aktualisiere({ ...eingabe, start: waehleStart(gelesen.bestand, basis) })
    if (neu.fehler) return melde([`(f) --aktualisiere: ${neu.fehler}`])
    writeFileSync(pfad, serialisiere(neu.bestand))
    console.log(
      `  ${RATSCHE_PFAD} geschrieben (${Object.keys(neu.bestand.dateien).length} Dateien, ${neu.bestand.formatiert.length} formatiert).`
    )
    return pruefeUndMelde({ ...eingabe, bestand: neu.bestand, basis })
  }
  if (gelesen.bestand === null) return melde(gelesen.befunde)
  return pruefeUndMelde({ ...eingabe, bestand: gelesen.bestand, basis })
}

/**
 * Prüft und meldet; Hinweis auf formatierte Dateien außerhalb der Liste (kein Befund, Advisor 8).
 * @param eingabe - Eingabe für pruefeRatsche
 * @returns Exit-Code
 */
function pruefeUndMelde(eingabe) {
  const befunde = pruefeRatsche(eingabe)
  if (befunde.length > 0) return melde(befunde)
  const liste = new Set(eingabe.bestand.formatiert)
  const nachzutragen = [...eingabe.codeDateien].filter((pfad) => !eingabe.unformatiert.has(pfad) && !liste.has(pfad))
  if (nachzutragen.length > 0)
    console.log(
      `  Hinweis: ${nachzutragen.length} formatierte Datei(en) nicht in der Liste — --aktualisiere nimmt sie auf.`
    )
  const summe = (art) =>
    [...flach(eingabe.bestand.dateien)]
      .filter(([schluessel]) => schluessel.includes(` ${art}`))
      .reduce((s, [, wert]) => s + wert, 0)
  console.log(
    `  ✓ Ist = Bestand: lint ${summe('lint:')}, checkjs ${summe('checkjs')}, Dateien > ${GRENZE_ZEILEN} Zeilen ${[...flach(eingabe.bestand.dateien).keys()].filter((s) => s.endsWith(' zeilen')).length}; formatiert ${liste.size}.`
  )
  console.log('\n✓ Keine Befunde (scripts/check-ratsche.mjs).')
  return 0
}

/**
 * Gibt Befunde aus.
 * @param befunde - Befundtexte
 * @returns Exit-Code 1
 */
function melde(befunde) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  console.error('  Regeln und Auswege: docs/architektur/ratsche.md')
  return 1
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/check-ratsche.mjs')) {
  console.log('\n=== Ratsche (F45 W2c-1) ===\n')
  process.exitCode = hauptprogramm(join(import.meta.dirname, '..'), process.argv.slice(2))
}
