#!/usr/bin/env node
/**
 * Datei: scripts/check-wachstumsbremse-server.mjs
 *
 * Zweck: Gate F45 W1 „Wachstumsbremse Leitstand-Server“ (Entscheidung Stefan E-WART-1 = A, F-371, features/F45/plan-w1.md und
 * plan-w1-v2.md). scripts/leitstand-server.mjs wächst nicht mehr, bis W2 ihn in Module teilt. Grenze und Routen-Bestand stehen
 * in scripts/wachstumsbremse-server.json; beide Ratschen sind straff (Entscheidung Stefan, plan-w1-v2):
 * (a1) Zeilen des Servers > Grenze ⇒ rot; (a3) Zeilen < Grenze ⇒ rot (Grenze auf das Ist senken);
 * (a2) Grenze höher als auf der Basis von main (git merge-base) ⇒ rot;
 * (b1) Routen-Literal im Server, das nicht im Bestand steht ⇒ rot (neue Routen in scripts/leitstand/routen-*.mjs);
 * (b3) Bestandseintrag ohne Literal im Server ⇒ rot (aus dem Bestand entfernen);
 * (b2) Bestandseintrag, der auf der Basis von main nicht im Bestand stand ⇒ rot;
 * (f)  die JSON fehlt, ist kaputt oder unvollständig ⇒ rot.
 *
 * Routen-Literale (vier Arten): `pfad === '/…'` bzw. `!==`, `==`, `!=`, auch mit Backtick ohne `${` und `case '/…':` (gleich),
 * `pfad.startsWith('/…')` (beginnt), `pfad.endsWith('/…')` (endet), Regex-Literal vor `.exec(pfad)`/`.test(pfad)` oder in
 * `pfad.match(…)` (muster). Nur Literale, die mit `/` beginnen; Zeilen, die mit `//`, `*` oder `/*` beginnen, zählen nicht
 * (Kommentare). Zeilen zählen als Zeilenumbrüche (wie `wc -l`; ein Editor zeigt bei Endumbruch eine Zeile mehr).
 *
 * Durchsetzungsgrad (ARCHITECTURE.md §1): ERZWUNGEN — Zeilenzahl des Servers; Literal- und Regex-Dispatch an `pfad` in den
 * genannten Formen. DEKLARIERT — Dispatch über eine andere Variable oder Konstante, `['/…'].includes(pfad)`, Kombination schon
 * vorhandener Literale, neue Methode auf einem bestehenden Pfad, der Multi-Projekt-Dispatcher (`url.pathname.match`), ein Literal
 * in einem Kommentar hinter Code, eine Routenzeile, die selbst mit einem Kommentar beginnt, Bearbeiten von Gate oder JSON.
 * Bekannter Fehlalarm: im Server heißt `pfad` auch ein Dateipfad — ein neuer Helfer mit `pfad.endsWith('/…')` meldet (b1);
 * Ausweg: den Helfer nach scripts/leitstand/ auslagern oder die Variable umbenennen.
 * (a2)/(b2) greifen nur mit lesbarer Referenz (merge-base mit `origin/main` bzw. `main`, sonst die Spitze von `origin/main`):
 * ohne git, ohne beide Refs oder vor dem ersten Merge der JSON meldet das Gate „Referenz nicht lesbar … (a2)/(b2) nicht
 * geprüft“. Die CI (`.github/workflows/ci.yml`) checkt mit `fetch-depth: 0` aus und hat damit `origin/main` — dort greifen
 * (a2)/(b2) ebenso wie lokal und beim Challenger im vollen Clone.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`); scripts/check-wachstumsbremse-server.test.mjs.
 *
 * Wichtig: reine Funktionen exportiert, Prüfung nur am Haupteinstieg (Muster check-f46-bestand.mjs). Wurzel ist der Ordner über
 * diesem Skript — für den Rot-Nachweis wird das Gate in eine präparierte Kopie gelegt (F-1127).
 *
 * Aufruf: node scripts/check-wachstumsbremse-server.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const SERVER_PFAD = 'scripts/leitstand-server.mjs'
export const BREMSE_PFAD = 'scripts/wachstumsbremse-server.json'
export const ARTEN = ['gleich', 'beginnt', 'endet', 'muster']

/** Routen-Literal je Art; Gruppe `wert` ist das Literal (bei `muster` der Regex-Quelltext samt Schrägstrichen und Flags). */
const MUSTER = {
  gleich: [
    /\bpfad\s*[!=]==?\s*(['"`])(?<wert>\/[^'"`$\n]*)\1/g,
    /(['"`])(?<wert>\/[^'"`$\n]*)\1\s*[!=]==?\s*pfad\b/g,
    /\bcase\s+(['"`])(?<wert>\/[^'"`$\n]*)\1\s*:/g,
  ],
  beginnt: [/\bpfad\.startsWith\(\s*(['"`])(?<wert>\/[^'"`$\n]*)\1/g],
  endet: [/\bpfad\.endsWith\(\s*(['"`])(?<wert>\/[^'"`$\n]*)\1/g],
  // Regex-Literal: Escapes und Zeichenklassen (die ein `/` enthalten dürfen) überspringen, dann Flags.
  muster: [
    /(?<wert>\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\/[a-z]*)\.(?:exec|test)\(\s*pfad\s*\)/g,
    /\bpfad\.match\(\s*(?<wert>\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\/[a-z]*)\s*\)/g,
  ],
}

/**
 * Zeilen eines Textes: Anzahl der Zeilenumbrüche, +1 wenn die letzte Zeile ohne Umbruch endet — CRLF und LF zählen gleich.
 * @param text - Dateiinhalt
 * @returns Zeilenzahl
 */
export function zaehleZeilen(text) {
  if (text.length === 0) return 0
  const umbrueche = text.split('\n').length - 1
  return text.endsWith('\n') ? umbrueche : umbrueche + 1
}

/**
 * Erhebt die Routen-Literale des Servers je Art (sortiert, eindeutig); Kommentarzeilen zählen nicht.
 * @param text - Quelltext des Servers
 * @returns { gleich, beginnt, endet, muster }
 */
export function erhebeRouten(text) {
  const code = text
    .split('\n')
    .filter((zeile) => !/^\s*(?:\/\/|\*|\/\*)/.test(zeile))
    .join('\n')
  const ergebnis = {}
  for (const art of ARTEN) {
    const werte = new Set()
    for (const muster of MUSTER[art]) for (const treffer of code.matchAll(muster)) werte.add(treffer.groups.wert)
    ergebnis[art] = [...werte].sort()
  }
  return ergebnis
}

/**
 * Formprüfung der Bremse (L2): positive Ganzzahl als Grenze, je Art eine Liste von Strings.
 * @param bremse - geparstes JSON
 * @returns Liste der Formfehler; leer = gültig
 */
export function pruefeBremseForm(bremse) {
  if (bremse === null || typeof bremse !== 'object' || Array.isArray(bremse)) return ['ist kein Objekt']
  const fehler = []
  if (!Number.isSafeInteger(bremse.obergrenze_zeilen) || bremse.obergrenze_zeilen < 1) fehler.push("'obergrenze_zeilen' ist keine positive Ganzzahl")
  for (const art of ARTEN) {
    const liste = bremse.routen?.[art]
    if (!Array.isArray(liste) || !liste.every((w) => typeof w === 'string')) fehler.push(`'routen.${art}' ist keine Liste von Strings`)
  }
  return fehler
}

/**
 * Die Prüfung (a1)–(a3), (b1)–(b3); erwartet eine formgültige Bremse.
 * @param eingabe - serverText, bremse (lokal), bremseMain (Referenz oder null)
 * @returns Liste der Befunde; leer = grün
 */
export function pruefeWachstumsbremse({ serverText, bremse, bremseMain }) {
  const befunde = []
  const ist = zaehleZeilen(serverText)
  const grenze = bremse.obergrenze_zeilen
  if (ist > grenze) befunde.push(`(a1) ${SERVER_PFAD} hat ${ist} Zeilen, Grenze ${grenze} — neue Teile nach scripts/leitstand/<thema>.mjs; zum Ausgleich reine Helfer auslagern (ARCHITECTURE.md §1).`)
  if (ist < grenze) befunde.push(`(a3) ${SERVER_PFAD} hat ${ist} Zeilen, Grenze ${grenze} — Grenze in ${BREMSE_PFAD} auf ${ist} senken (straffe Ratsche).`)
  if (bremseMain !== null && grenze > bremseMain.obergrenze_zeilen) befunde.push(`(a2) Grenze ${grenze} höher als auf main (${bremseMain.obergrenze_zeilen}) — die Grenze darf nur sinken: Grenze auf höchstens ${bremseMain.obergrenze_zeilen} zurücksetzen und den Server entsprechend kürzen (reine Helfer nach scripts/leitstand/ auslagern).`)
  const erhoben = erhebeRouten(serverText)
  for (const art of ARTEN) {
    const bestand = new Set(bremse.routen[art])
    const imServer = new Set(erhoben[art])
    for (const wert of imServer) if (!bestand.has(wert)) befunde.push(`(b1) neue Route im Server (${art}): ${wert} — neue Routen in scripts/leitstand/routen-*.mjs.`)
    for (const wert of bestand) if (!imServer.has(wert)) befunde.push(`(b3) Bestandseintrag ohne Route im Server (${art}): ${wert} — aus ${BREMSE_PFAD} entfernen (straffe Ratsche).`)
    if (bremseMain !== null) {
      const mainBestand = new Set(bremseMain.routen[art])
      for (const wert of bestand) if (!mainBestand.has(wert)) befunde.push(`(b2) Bestand erweitert gegenüber main (${art}): ${wert} — der Bestand darf nur schrumpfen: Route nach scripts/leitstand/routen-*.mjs verlegen und den Eintrag aus ${BREMSE_PFAD} entfernen.`)
    }
  }
  return befunde
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
 * Liest und prüft die Bremse aus einem Dateiinhalt (L2): fehlt der Text, ist er kein JSON oder fehlt ein Teil ⇒ Befunde (f).
 * @param text - Inhalt von scripts/wachstumsbremse-server.json oder null, wenn die Datei fehlt
 * @returns { bremse, befunde } — bremse null bei Befunden
 */
export function ladeBremse(text) {
  if (text === null) return { bremse: null, befunde: [`(f) ${BREMSE_PFAD} fehlt`] }
  let bremse
  try {
    bremse = JSON.parse(text)
  } catch (fehler) {
    return { bremse: null, befunde: [`(f) ${BREMSE_PFAD} ist kein gültiges JSON: ${fehler instanceof Error ? fehler.message : String(fehler)}`] }
  }
  const form = pruefeBremseForm(bremse).map((f) => `(f) ${BREMSE_PFAD}: ${f}`)
  return form.length === 0 ? { bremse, befunde: [] } : { bremse: null, befunde: form }
}

/**
 * Liest die Bremse auf der Basis von main: Toplevel muss die Wurzel sein; je Ref (`origin/main`, dann `main`) die JSON auf
 * der merge-base mit HEAD; fehlt sie dort überall (z. B. gestapelter Branch nach Squash-Merge), die Spitze des Refs. Jeder
 * Hinweis ohne Referenz endet mit „(a2)/(b2) nicht geprüft“.
 * @param wurzel - Wurzel des geprüften Baums
 * @param git - führt git mit Argumenten in der Wurzel aus und liefert stdout (injizierbar)
 * @returns { bremse, hinweis } — bremse null, wenn keine Referenz lesbar ist
 */
export function leseReferenz(wurzel, git = (argumente) => execFileSync('git', argumente, { cwd: wurzel, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) {
  const ohne = (grund) => ({ bremse: null, hinweis: `Referenz nicht lesbar: ${grund} — (a2)/(b2) nicht geprüft` })
  try {
    if (vergleichsform(git(['rev-parse', '--show-toplevel']).trim()) !== vergleichsform(wurzel)) return ohne('die Wurzel ist kein eigenes git-Repo')
  } catch {
    return ohne('kein git-Repo (oder git fehlt)')
  }
  /** Bremse an einem Stand (Revision): { bremse } | { fehlt } | { kaputt } */
  const anStand = (revision) => {
    let text
    try {
      text = git(['show', `${revision}:${BREMSE_PFAD}`])
    } catch {
      return { fehlt: true }
    }
    const { bremse } = ladeBremse(text)
    return bremse === null ? { kaputt: true } : { bremse }
  }
  const refs = []
  for (const ref of ['origin/main', 'main']) {
    try {
      refs.push({ ref, basis: git(['merge-base', 'HEAD', ref]).trim() })
    } catch {
      // Ref fehlt (CI mit fetch-depth 1, Kopie ohne main) — nächster Ref.
    }
  }
  if (refs.length === 0) return ohne('weder origin/main noch main')
  for (const { ref, basis } of refs) {
    const stand = anStand(basis)
    if (stand.bremse) return { bremse: stand.bremse, hinweis: `Referenz: ${BREMSE_PFAD} auf merge-base mit ${ref} (${basis.slice(0, 7)})` }
    if (stand.kaputt) return ohne(`${BREMSE_PFAD} auf der merge-base mit ${ref} ist kein gültiger Stand`)
  }
  for (const { ref } of refs) {
    const stand = anStand(ref)
    if (stand.bremse) return { bremse: stand.bremse, hinweis: `Referenz: ${BREMSE_PFAD} auf der Spitze von ${ref} (merge-base ohne die Datei — Branch auf altem Stand? main einmergen)` }
  }
  return ohne(`${BREMSE_PFAD} fehlt auf main (vor dem ersten Merge)`)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/check-wachstumsbremse-server.mjs')) {
  const wurzel = join(import.meta.dirname, '..')
  console.log('\n=== Wachstumsbremse-Server-Check (F45 W1) ===\n')
  const bremsePfad = join(wurzel, BREMSE_PFAD)
  const { bremse, befunde: formBefunde } = ladeBremse(existsSync(bremsePfad) ? readFileSync(bremsePfad, 'utf8') : null)
  let befunde = formBefunde
  if (bremse !== null) {
    const { bremse: bremseMain, hinweis } = leseReferenz(wurzel)
    console.log(`  ${hinweis}`)
    const serverText = readFileSync(join(wurzel, SERVER_PFAD), 'utf8')
    befunde = pruefeWachstumsbremse({ serverText, bremse, bremseMain })
    if (befunde.length === 0) console.log(`  ✓ ${SERVER_PFAD}: ${zaehleZeilen(serverText)} Zeilen = Grenze; Routen-Literale = Bestand (${ARTEN.map((a) => `${a} ${bremse.routen[a].length}`).join(', ')}).`)
  }
  if (befunde.length > 0) {
    console.error(`\n✗ ${befunde.length} Befund(e):`)
    for (const b of befunde) console.error(`  - ${b}`)
    process.exit(1)
  }
  console.log('\n✓ Keine Befunde (scripts/check-wachstumsbremse-server.mjs).')
}
