/**
 * Datei: scripts/check-git-starter.mjs
 *
 * Zweck: Gate „Git nur über den Git-Starter“ (F45 S, F-1000). Ein Prozessstart mit bloßem Programmnamen
 * 'git' durchsucht unter Windows zuerst das cwd — die Repo-Wurzel eines Projekts, in die ein Lauf schreiben
 * kann. Kern und Leitstand starten Git deshalb nur über src/git-starter (fuehreGitSync bzw. gitProgramm).
 * Dieses Gate findet (Groß-/Kleinschreibung egal, auch 'git.exe'/'git.com'):
 * - einen Aufruf mit bloßem 'git' als erstem Argument — execFileSync, execFile, spawn, spawnSync oder ein
 *   eigener Wrapper;
 * - exec/execSync/spawn… mit einem Befehlstext, der mit 'git ' beginnt;
 * - den Umweg über eine Konstante (const|let|var X = 'git') und ein Startziel-Array ['git', …];
 * in:
 * - src/ (alle .ts/.mjs/.js außer Tests *.test.*)
 * - scripts/leitstand*.mjs und scripts/leitstand/ (außer Tests *.test.mjs)
 * - scripts/zustand-sichern.mjs
 * Kommentare zählen nicht; ohneKommentare liest Texte, Template-Literale und Regex-Literale mit, damit ein
 * '/*' oder '//' darin keinen Code ausblendet (Prüfpass F45 S, cr 1). Ausnahmen nur über AUSNAHMEN (mit
 * Grund). Reine Mess-, Spike- und Verify-Skripte (scripts/spike-*, scripts/verify-*,
 * scripts/messe-chat.mjs), Gates und Tests liegen außerhalb des Umfangs: Sie laufen nie im Leitstand- oder
 * Kernprozess gegen ein Projekt-Repo.
 * Durchsetzungsgrad: geprüft, nicht ERZWUNGEN — ein über mehrere Schritte zusammengesetzter Programmname
 * ('g' + 'it', Wert aus einer Datei) fällt nicht auf; der Scanner unterscheidet Regex und Division nur
 * heuristisch (nach ')' gilt '/' als Division — ein Regex-Literal mit Backtick direkt nach 'if (…)' könnte
 * die Template-Zählung kippen; ein Fehler dieser Art führt meist zu einem Treffer zu viel, selten zu einem
 * übersehenen).
 * Grün- und Rot-Fälle: scripts/check-git-starter.test.mjs.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-git-starter.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Ausnahmen (repo-relativer Pfad mit '/' → Grund). Heute leer. */
export const AUSNAHMEN = Object.freeze({})

/** Bloßes git als Textliteral: 'git', "git.exe", `GIT.com`. */
const GIT_LITERAL = String.raw`(['"\x60])git(?:\.exe|\.com)?\1`

/** Die Muster des Gates (Groß-/Kleinschreibung egal). */
const MUSTER = Object.freeze([
  // Aufruf mit bloßem 'git' als erstem Argument: name( 'git' , … ) bzw. name('git').
  new RegExp(String.raw`\b[A-Za-z_$][\w$]*\s*\(\s*${GIT_LITERAL}\s*[,)]`, 'gi'),
  // Befehlstext, der mit 'git ' beginnt (Shell-Form).
  /\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(\s*(['"`])git\s/gi,
  // Umweg über eine Konstante.
  new RegExp(String.raw`\b(?:const|let|var)\s+[A-Za-z_$][\w$]*(?:\s*:\s*[\w$]+)?\s*=\s*${GIT_LITERAL}`, 'gi'),
  // Startziel-Array ['git', …].
  new RegExp(String.raw`\[\s*${GIT_LITERAL}\s*,`, 'gi'),
])

/** Schlüsselwörter, nach denen ein '/' ein Regex-Literal beginnt. */
const VOR_REGEX_WOERTER = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await'])

/**
 * Ersetzt Kommentare durch Leerzeichen (Zeilenumbrüche bleiben, damit Zeilennummern stimmen). Texte
 * ('…', "…"), Template-Literale (auch mit ${…}) und Regex-Literale werden mitgelesen und bleiben
 * unverändert — ein '/*' oder '//' darin ist kein Kommentar. Ein '/' gilt als Regex-Beginn, wenn davor
 * (ohne Leerraum) nichts, ein Operator/Trenner oder ein Schlüsselwort wie return steht. Rein.
 * @param text - Quelltext
 * @returns Quelltext ohne Kommentare
 */
export function ohneKommentare(text) {
  const aus = text.split('')
  const leere = (von, bis) => {
    for (let k = von; k < bis; k++) if (aus[k] !== '\n') aus[k] = ' '
  }
  /** Stapel: 'code' (mit Klammertiefe für ${…}) oder 'template'. */
  const stapel = [{ art: 'code', tiefe: 0 }]
  let letztesZeichen = ''
  let letztesWort = ''
  let i = 0
  const n = text.length
  while (i < n) {
    const oben = stapel[stapel.length - 1]
    const z = text[i]
    if (oben.art === 'template') {
      if (z === '\\') i += 2
      else if (z === '`') {
        stapel.pop()
        letztesZeichen = '`'
        letztesWort = ''
        i++
      } else if (z === '$' && text[i + 1] === '{') {
        stapel.push({ art: 'code', tiefe: 0 })
        letztesZeichen = '{'
        letztesWort = ''
        i += 2
      } else i++
      continue
    }
    // Code.
    if (z === '/' && text[i + 1] === '/') {
      const ende = text.indexOf('\n', i)
      const bis = ende < 0 ? n : ende
      leere(i, bis)
      i = bis
      continue
    }
    if (z === '/' && text[i + 1] === '*') {
      const ende = text.indexOf('*/', i + 2)
      const bis = ende < 0 ? n : ende + 2
      leere(i, bis)
      i = bis
      continue
    }
    if (z === "'" || z === '"') {
      let k = i + 1
      while (k < n && text[k] !== z && text[k] !== '\n') k += text[k] === '\\' ? 2 : 1
      i = k + 1
      letztesZeichen = z
      letztesWort = ''
      continue
    }
    if (z === '`') {
      stapel.push({ art: 'template' })
      i++
      continue
    }
    if (z === '/') {
      const regexBeginn = letztesZeichen === '' || '(,=:[!&|?{};+-*%<>~^'.includes(letztesZeichen) || VOR_REGEX_WOERTER.has(letztesWort)
      if (regexBeginn) {
        let k = i + 1
        let inKlasse = false
        while (k < n && text[k] !== '\n') {
          if (text[k] === '\\') k += 2
          else {
            if (text[k] === '[') inKlasse = true
            else if (text[k] === ']') inKlasse = false
            else if (text[k] === '/' && !inKlasse) break
            k++
          }
        }
        i = k + 1
        letztesZeichen = ')'
        letztesWort = ''
        continue
      }
    }
    if (z === '{') oben.tiefe++
    else if (z === '}') {
      if (oben.tiefe === 0 && stapel.length > 1) {
        stapel.pop()
        i++
        continue
      }
      oben.tiefe--
    }
    if (/[A-Za-z_$0-9]/.test(z)) {
      let k = i
      while (k < n && /[\w$]/.test(text[k])) k++
      letztesWort = text.slice(i, k)
      letztesZeichen = 'a'
      i = k
      continue
    }
    if (!/\s/.test(z)) {
      letztesZeichen = z
      letztesWort = ''
    }
    i++
  }
  return aus.join('')
}

/**
 * Findet Git-Aufrufe mit bloßem Programmnamen in einem Quelltext. Rein.
 * @param text - Quelltext
 * @returns [{ zeile, auszug }] (Zeile 1-basiert)
 */
export function findeBlosseGitAufrufe(text) {
  const bereinigt = ohneKommentare(text)
  const treffer = []
  for (const muster of MUSTER) {
    for (const m of bereinigt.matchAll(muster)) {
      const zeile = bereinigt.slice(0, m.index).split('\n').length
      treffer.push({ zeile, auszug: m[0].replace(/\s+/g, ' ').trim() })
    }
  }
  return treffer.sort((a, b) => a.zeile - b.zeile)
}

/**
 * Alle Dateien im Umfang des Gates (repo-relativ, '/' als Trenner).
 * @param wurzel - Repo-Wurzel
 * @returns Pfade
 */
export function dateienImUmfang(wurzel) {
  const pfade = []
  const sammle = (ordner, passt) => {
    const absolut = join(wurzel, ordner)
    if (!existsSync(absolut)) return
    for (const eintrag of readdirSync(absolut, { withFileTypes: true })) {
      const rel = `${ordner}/${eintrag.name}`
      if (eintrag.isDirectory()) {
        if (eintrag.name !== 'node_modules') sammle(rel, passt)
      } else if (eintrag.isFile() && passt(eintrag.name)) pfade.push(rel)
    }
  }
  const keinTest = (name) => !/\.test\.[cm]?[jt]s$/.test(name)
  sammle('src', (name) => /\.(?:ts|mjs|js)$/.test(name) && keinTest(name))
  sammle('scripts/leitstand', (name) => /\.mjs$/.test(name) && keinTest(name))
  for (const eintrag of readdirSync(join(wurzel, 'scripts'))) {
    if (/^leitstand.*\.mjs$/.test(eintrag) && keinTest(eintrag)) pfade.push(`scripts/${eintrag}`)
  }
  pfade.push('scripts/zustand-sichern.mjs')
  return pfade.sort()
}

/**
 * Prüft alle Dateien im Umfang.
 * @param wurzel - Repo-Wurzel
 * @param lese - (pfad) => Inhalt (für Tests überschreibbar)
 * @returns Befunde (leer = sauber)
 */
export function pruefeGitStarter(wurzel, lese = (pfad) => readFileSync(join(wurzel, pfad), 'utf8')) {
  const befunde = []
  for (const pfad of dateienImUmfang(wurzel)) {
    if (Object.hasOwn(AUSNAHMEN, pfad)) continue
    for (const t of findeBlosseGitAufrufe(lese(pfad))) befunde.push(`${pfad}:${t.zeile}: Git mit bloßem Namen — über src/git-starter starten (${t.auszug})`)
  }
  return befunde
}

// Nur als Skript ausführen, nicht beim Import durch den Test.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/check-git-starter.mjs')) {
  console.log('\n=== Git-Starter-Check (F-1000: kein Git-Aufruf mit bloßem Namen in Kern und Leitstand) ===\n')
  // Selbstprüfung: das Muster muss einen bekannten Rotfall finden, sonst ist das Gate blind.
  const kalibrierung = findeBlosseGitAufrufe("execFileSync(\n  'git', ['status'])\nspawn(\"git.exe\")\nexecSync('git status')")
  if (kalibrierung.length !== 3) {
    console.error(`✗ Kalibrierung: ${kalibrierung.length} statt 3 Treffern im Rotfall — Muster defekt`)
    process.exit(1)
  }
  const befunde = pruefeGitStarter(process.cwd())
  if (befunde.length > 0) {
    for (const befund of befunde) console.error(`✗ ${befund}`)
    process.exit(1)
  }
  console.log(`✓ Keine Befunde: ${dateienImUmfang(process.cwd()).length} Dateien in src/, scripts/leitstand*, scripts/zustand-sichern.mjs starten Git nur über den Starter.`)
}
