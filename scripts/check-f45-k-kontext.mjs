#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-k-kontext.mjs
 *
 * Zweck: Gate F45 K „Kontext-Diät“ (features/F45/plan-k-v2.md, Advisor features/F45/advisor-k.md). ARCHITECTURE.md ist
 * Pflichtlektüre jeder Sitzung und bleibt ein Kern; der wörtliche Detailtext liegt in docs/architektur/. Deckel in
 * scripts/architektur-kern.json, nur senkbar:
 * (a1) Bytes von ARCHITECTURE.md > Deckel ⇒ rot (auslagern statt anheben);
 * (a2) Deckel höher als auf der Basis von main (git merge-base) ⇒ rot;
 * (f)  die JSON fehlt, ist kaputt (ein BOM wird toleriert) oder der Deckel keine positive Ganzzahl ⇒ rot; ARCHITECTURE.md fehlt ⇒ rot;
 * (v1) Verweis in ARCHITECTURE.md oder docs/architektur/*.md zeigt ins Leere ⇒ rot. Grammatik: Backtick-Datei mit Endung
 *      md/ts/tsx/js/mjs/json wie check-docs Prüfung 1 (mit `/` ⇒ Pfad existiert, ohne ⇒ Name existiert im Repo; gitignoriert
 *      ausgenommen); Backtick-Ordner mit Schluss-`/`, dessen erstes Segment ein Eintrag der Repo-Wurzel ist; relativer
 *      Markdown-Link `](…)` (auch mit Titel), aufgelöst gegen den Ordner der Datei; Anker werden nicht geprüft. Feldpfade (`daten.x`) und fremde Wurzeln (`plugins/data`, `skills/`) fallen damit heraus;
 * (v2) Datei in docs/architektur/ ohne Rückverweis `docs/architektur/<name>.md` außerhalb von HTML-Kommentaren aus
 *      ARCHITECTURE.md ⇒ rot; ein Unterordner oder eine Nicht-.md-Datei dort ⇒ rot (geprüft wird nur .md direkt im Ordner);
 * (v3) Versionsnummer in docs/architektur/*.md (Muster check-docs Prüfung 2, Datum ausgenommen) ⇒ rot.
 *
 * Durchsetzungsgrad (ARCHITECTURE.md, Einleitung): ERZWUNGEN — Deckel, Verweise, Rückverweise, (a2) bei lesbarer Referenz
 * (merge-base mit `origin/main` bzw. `main`, sonst die Spitze; ohne git „(a2) nicht geprüft“). DEKLARIERT — „jede Regel steht
 * als Satz im Kern“, Bearbeiten von Gate oder JSON. (a2) ist in einer `git archive`-Kopie nicht rot prüfbar; den Rot-Fall
 * belegt scripts/check-f45-k-kontext.test.mjs mit injiziertem git (Muster check-wachstumsbremse-server.test.mjs).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`); scripts/check-f45-k-kontext.test.mjs.
 *
 * Wichtig: reine Funktionen exportiert, Prüfung nur am Haupteinstieg. Wurzel ist der Ordner über diesem Skript — für den
 * Rot-Nachweis wird das Gate in eine präparierte Kopie gelegt (F-1127).
 *
 * Aufruf: node scripts/check-f45-k-kontext.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const KERN_PFAD = 'ARCHITECTURE.md'
export const DECKEL_PFAD = 'scripts/architektur-kern.json'
export const DETAIL_ORDNER = 'docs/architektur'

/** Ordner, die beim Sammeln der Dateinamen nicht betreten werden (wie check-docs). */
const AUSGESCHLOSSEN = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out'])

/**
 * Liest und prüft den Deckel aus einem Dateiinhalt: fehlt der Text, ist er kein JSON oder der Deckel keine positive Ganzzahl ⇒ (f).
 * @param text - Inhalt von scripts/architektur-kern.json oder null, wenn die Datei fehlt
 * @returns { deckel, befunde } — deckel null bei Befunden
 */
export function ladeDeckel(text) {
  if (text === null) return { deckel: null, befunde: [`(f) ${DECKEL_PFAD} fehlt`] }
  let json
  try {
    json = JSON.parse(text.replace(/^﻿/, ''))
  } catch (fehler) {
    return { deckel: null, befunde: [`(f) ${DECKEL_PFAD} ist kein gültiges JSON: ${fehler instanceof Error ? fehler.message : String(fehler)}`] }
  }
  const wert = json?.obergrenze_bytes
  if (!Number.isSafeInteger(wert) || wert < 1) return { deckel: null, befunde: [`(f) ${DECKEL_PFAD}: 'obergrenze_bytes' ist keine positive Ganzzahl`] }
  return { deckel: wert, befunde: [] }
}

/**
 * (a1)/(a2): Größe gegen den Deckel und den Deckel gegen main.
 * @param eingabe - kernText (Inhalt ARCHITECTURE.md), deckel (lokal), deckelMain (Referenz oder null)
 * @returns Befunde; leer = grün
 */
export function pruefeDeckel({ kernText, deckel, deckelMain }) {
  const befunde = []
  const ist = Buffer.byteLength(kernText, 'utf8')
  if (ist > deckel) befunde.push(`(a1) ${KERN_PFAD} hat ${ist} Bytes, Deckel ${deckel} (eine CRLF-Arbeitskopie zählt je Zeile 1 Byte mehr) — Einzelheiten wörtlich nach ${DETAIL_ORDNER}/<thema>.md auslagern, die Regel bleibt als Satz im Kern.`)
  if (deckelMain !== null && deckel > deckelMain) befunde.push(`(a2) Deckel ${deckel} höher als auf main (${deckelMain}) — der Deckel darf nur sinken.`)
  return befunde
}

/**
 * Sammelt alle Dateinamen unterhalb eines Ordners (für Verweise ohne `/`, wie check-docs Prüfung 1).
 * @param wurzel - Startordner
 * @returns Menge der Dateinamen
 */
export function sammleDateinamen(wurzel) {
  const namen = new Set()
  const gehe = (ordner) => {
    for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
      if (AUSGESCHLOSSEN.has(eintrag.name)) continue
      if (eintrag.isDirectory()) gehe(join(ordner, eintrag.name))
      else namen.add(eintrag.name)
    }
  }
  gehe(wurzel)
  return namen
}

/**
 * Liefert eine Prüffunktion „in .gitignore gelistet“ (Regel von check-docs: voller Pfad oder Basisname einer Zeile).
 * @param gitignoreText - Inhalt von .gitignore oder ''
 * @returns (pfad) => boolean
 */
export function gitignoreRegel(gitignoreText) {
  const zeilen = gitignoreText
    .split('\n')
    .map((z) => z.trim())
    .filter((z) => z && !z.startsWith('#') && !z.startsWith('!'))
  return (pfad) => {
    const basis = pfad.split('/').pop()
    return zeilen.some((zeile) => {
      const bereinigt = zeile.replace(/^\/+|\/+$/g, '')
      return bereinigt === pfad || bereinigt.split('/').pop() === basis
    })
  }
}

/**
 * Erhebt die Verweise einer Markdown-Datei nach der Grammatik (v1).
 * @param text - Dateiinhalt
 * @returns Liste { zeile, art: 'datei' | 'ordner' | 'link', pfad }
 */
export function erhebeVerweise(text) {
  const verweise = []
  text.split('\n').forEach((zeile, i) => {
    if (zeile.includes('check-docs-ignore:')) return
    for (const roh of new Set(zeile.match(/`[a-zA-Z0-9_\-./[\]]+\.(md|ts|tsx|js|mjs|json)`/g) ?? [])) verweise.push({ zeile: i + 1, art: 'datei', pfad: roh.replaceAll('`', '') })
    for (const roh of new Set(zeile.match(/`[a-zA-Z0-9_\-.][a-zA-Z0-9_\-./]*\/`/g) ?? [])) verweise.push({ zeile: i + 1, art: 'ordner', pfad: roh.replaceAll('`', '') })
    for (const treffer of zeile.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const ziel = treffer[1].split('#')[0]
      if (ziel === '' || /^[a-z][a-z0-9+.-]*:/i.test(ziel) || ziel.startsWith('/')) continue
      verweise.push({ zeile: i + 1, art: 'link', pfad: ziel })
    }
  })
  return verweise
}

/**
 * (v1) Prüft die Verweise einer Datei gegen das Dateisystem.
 * @param eingabe - datei (Anzeigepfad), text, existiert(pfad relativ zur Wurzel bzw. zur Datei), dateinamen (Set), ignoriert(pfad), wurzelEintraege (Set), ordnerDerDatei
 * @returns Befunde
 */
export function pruefeVerweise({ datei, text, existiert, dateinamen, ignoriert, wurzelEintraege, ordnerDerDatei }) {
  const befunde = []
  for (const { zeile, art, pfad } of erhebeVerweise(text)) {
    if (art === 'datei') {
      if (ignoriert(pfad)) continue
      if (pfad.includes('/') ? !existiert(pfad) : !dateinamen.has(pfad)) befunde.push(`(v1) ${datei}:${zeile}: Verweis auf \`${pfad}\` — Datei existiert nicht`)
    } else if (art === 'ordner') {
      const erstes = pfad.split('/')[0]
      if (!wurzelEintraege.has(erstes) || ignoriert(pfad.replace(/\/$/, ''))) continue
      if (!existiert(pfad)) befunde.push(`(v1) ${datei}:${zeile}: Verweis auf Ordner \`${pfad}\` — existiert nicht`)
    } else if (!existiert(join(ordnerDerDatei, pfad))) {
      befunde.push(`(v1) ${datei}:${zeile}: Link auf ${pfad} — Ziel existiert nicht`)
    }
  }
  return befunde
}

/**
 * (v2) Jede Detaildatei braucht einen Rückverweis aus dem Kern; HTML-Kommentare zählen nicht.
 * @param kernText - Inhalt ARCHITECTURE.md
 * @param detailNamen - Dateinamen in docs/architektur/
 * @returns Befunde
 */
export function pruefeRueckverweise(kernText, detailNamen) {
  const ohneKommentar = kernText.replace(/<!--[\s\S]*?-->/g, '')
  return detailNamen.filter((name) => !ohneKommentar.includes(`\`${DETAIL_ORDNER}/${name}\``)).map((name) => `(v2) ${DETAIL_ORDNER}/${name} hat keinen Rückverweis \`${DETAIL_ORDNER}/${name}\` aus ${KERN_PFAD}`)
}

/** Versionsmuster und Datumsausnahme wie check-docs Prüfung 2. */
const VERSIONS_MUSTER = [/\bv?\d+\.\d+\.\d+\b/g, /\b(TypeScript|Node|Biome|tsc|node:test)\s+(?:v\d[\d.]*|\d+\.\d[\d.]*)/g]
const istDatum = (treffer) => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(treffer)

/**
 * (v3) Keine Versionsnummer in einer Detaildatei — Versionen stehen nur in der Paketdatei.
 * @param datei - Anzeigepfad
 * @param text - Inhalt
 * @returns Befunde
 */
export function pruefeVersionen(datei, text) {
  const befunde = []
  text.split('\n').forEach((zeile, i) => {
    if (zeile.includes('check-docs-ignore:')) return
    for (const muster of VERSIONS_MUSTER) {
      for (const treffer of new Set(zeile.match(muster) ?? [])) {
        if (!istDatum(treffer)) befunde.push(`(v3) ${datei}:${i + 1}: Versionsnummer "${treffer}" — Versionen gehören nur in die Paketdatei`)
      }
    }
  })
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
 * Liest den Deckel auf der Basis von main (Muster leseReferenz in check-wachstumsbremse-server.mjs): Toplevel muss die Wurzel
 * sein; je Ref (`origin/main`, dann `main`) die JSON auf der merge-base mit HEAD, sonst die Spitze des Refs.
 * @param wurzel - Wurzel des geprüften Baums
 * @param git - führt git mit Argumenten in der Wurzel aus und liefert stdout (injizierbar)
 * @returns { deckel, hinweis } — deckel null, wenn keine Referenz lesbar ist
 */
export function leseReferenz(wurzel, git = (argumente) => execFileSync('git', argumente, { cwd: wurzel, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) {
  const ohne = (grund) => ({ deckel: null, hinweis: `Referenz nicht lesbar: ${grund} — (a2) nicht geprüft` })
  try {
    if (vergleichsform(git(['rev-parse', '--show-toplevel']).trim()) !== vergleichsform(wurzel)) return ohne('die Wurzel ist kein eigenes git-Repo')
  } catch {
    return ohne('kein git-Repo (oder git fehlt)')
  }
  /** Deckel an einem Stand: { deckel } | { fehlt } | { kaputt } */
  const anStand = (revision) => {
    let text
    try {
      text = git(['show', `${revision}:${DECKEL_PFAD}`])
    } catch {
      return { fehlt: true }
    }
    const { deckel } = ladeDeckel(text)
    return deckel === null ? { kaputt: true } : { deckel }
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
    if (stand.deckel) return { deckel: stand.deckel, hinweis: `Referenz: ${DECKEL_PFAD} auf merge-base mit ${ref} (${basis.slice(0, 7)})` }
    if (stand.kaputt) return ohne(`${DECKEL_PFAD} auf der merge-base mit ${ref} ist kein gültiger Stand`)
  }
  for (const { ref } of refs) {
    const stand = anStand(ref)
    if (stand.deckel) return { deckel: stand.deckel, hinweis: `Referenz: ${DECKEL_PFAD} auf der Spitze von ${ref} (merge-base ohne die Datei)` }
  }
  return ohne(`${DECKEL_PFAD} fehlt auf main (vor dem ersten Merge)`)
}

/**
 * Prüft einen Baum vollständig ((a1)(a2)(f)(v1)(v2)(v3)).
 * @param wurzel - Wurzel des geprüften Baums
 * @param git - optional injiziertes git für (a2)
 * @returns { befunde, hinweis, ist, deckel }
 */
export function pruefeBaum(wurzel, git) {
  const lies = (pfad) => (existsSync(join(wurzel, pfad)) ? readFileSync(join(wurzel, pfad), 'utf8') : null)
  const kernRoh = lies(KERN_PFAD)
  const kernText = kernRoh ?? ''
  const { deckel, befunde } = ladeDeckel(lies(DECKEL_PFAD))
  if (kernRoh === null) befunde.push(`(f) ${KERN_PFAD} fehlt`)
  let hinweis = ''
  if (deckel !== null) {
    const referenz = leseReferenz(wurzel, git)
    hinweis = referenz.hinweis
    befunde.push(...pruefeDeckel({ kernText, deckel, deckelMain: referenz.deckel }))
  }
  const detailOrdner = join(wurzel, DETAIL_ORDNER)
  const eintraege = existsSync(detailOrdner) ? readdirSync(detailOrdner, { withFileTypes: true }) : []
  for (const fremd of eintraege.filter((x) => !x.isFile() || !x.name.endsWith('.md'))) {
    befunde.push(`(v2) ${DETAIL_ORDNER}/${fremd.name}: nur .md-Dateien direkt in ${DETAIL_ORDNER}/ (sonst ungeprüft)`)
  }
  const detailNamen = eintraege.filter((x) => x.isFile() && x.name.endsWith('.md')).map((x) => x.name).sort()
  const kontext = {
    existiert: (pfad) => existsSync(join(wurzel, pfad)),
    dateinamen: sammleDateinamen(wurzel),
    ignoriert: gitignoreRegel(lies('.gitignore') ?? ''),
    wurzelEintraege: new Set(readdirSync(wurzel)),
  }
  befunde.push(...pruefeVerweise({ ...kontext, datei: KERN_PFAD, text: kernText, ordnerDerDatei: '.' }))
  for (const name of detailNamen) {
    const datei = `${DETAIL_ORDNER}/${name}`
    const text = lies(datei) ?? ''
    befunde.push(...pruefeVerweise({ ...kontext, datei, text, ordnerDerDatei: DETAIL_ORDNER }))
    befunde.push(...pruefeVersionen(datei, text))
  }
  befunde.push(...pruefeRueckverweise(kernText, detailNamen))
  return { befunde, hinweis, ist: Buffer.byteLength(kernText, 'utf8'), deckel }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/check-f45-k-kontext.mjs')) {
  const wurzel = join(import.meta.dirname, '..')
  console.log('\n=== F45-K-Kontext-Check (ARCHITECTURE-Kern) ===\n')
  const { befunde, hinweis, ist, deckel } = pruefeBaum(wurzel)
  if (hinweis) console.log(`  ${hinweis}`)
  if (befunde.length > 0) {
    console.error(`\n✗ ${befunde.length} Befund(e):`)
    for (const b of befunde) console.error(`  - ${b}`)
    process.exit(1)
  }
  console.log(`  ✓ ${KERN_PFAD}: ${ist} Bytes ≤ Deckel ${deckel}; Verweise in ${KERN_PFAD} und ${DETAIL_ORDNER}/ existieren; jede Detaildatei hat ihren Rückverweis.`)
  console.log('\n✓ Keine Befunde (scripts/check-f45-k-kontext.mjs).')
}
