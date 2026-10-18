#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2b2b2a-crlf.mjs
 *
 * Zweck: Gate für F45 B2b-3b-2b-2b-2a „Zeilenenden im Arbeitsordner“. Befund aus dem Nachweislauf Rückfrage-Kanal
 * (17.10.2026): Mit `core.autocrlf=true` bekam der Arbeitsordner CRLF, E-183 (Rohbytes-Hash) lehnte jeden schreibenden
 * Lauf ab. Der Verhaltensbeleg steht in src/arbeitsordner/arbeitsordner.test.ts (Wegwerf-Repo mit autocrlf=true); dieses
 * Gate hält die Bausteine fest, damit ein Rückbau nicht unbemerkt bleibt.
 *
 * Prüft:
 * (a) Konstante CHECKOUT_OHNE_UMWANDLUNG in src/arbeitsordner/index.ts trägt `core.autocrlf=false` und `core.eol=lf`; jeder
 *     `git worktree add` beginnt damit (mindestens zwei Aufrufe: neuer und vorhandener Branch); der E-183-Fehlschlag trägt
 *     den Zeilenenden-Hinweis, gekoppelt an die Wiederaufnahme (alter CRLF-Arbeitsordner ⇒ aufräumen).
 * (b) Skelett: vorlagen/projekt-skelett/.gitattributes trägt die Zeile `* text=auto eol=lf`; planeSkelettKopie kopiert sie
 *     in ein leeres Ziel und lässt eine vorhandene, abweichende `.gitattributes` unangetastet (Nachrüst-Grenze).
 * (c) Doku: docs/architektur/arbeitsordner.md nennt `core.autocrlf=false`, `core.eol=lf`, die Skelett-`.gitattributes` und
 *     die Nachrüst-Grenze.
 * (d) Unverändert: E-183 hasht weiter Rohbytes (ermittleIstZustand ohne Zeilenenden-Normalisierung), externe Repos
 *     verlangen weiter `* -text` (src/authorization-boundary).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Wichtig: (a) und (d) sind Textprüfungen — sie halten Bausteine fest, kein Verhalten; Rot nur in die sichere Richtung
 * (ein umgestelltes `-c` macht (a) rot). Schreibt nur in eigene Temp-Ordner (b), die am Ende entfernt werden.
 *
 * Aufruf: node scripts/check-f45-b2b3b2b2b2a-crlf.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { planeSkelettKopie } from '../src/projekt-anlegen/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const WURZEL = join(import.meta.dirname, '..')
const SKELETT = join(WURZEL, 'vorlagen', 'projekt-skelett')
const befunde = []
console.log('\n=== F45-B2b-3b-2b-2b-2a-CRLF-Check ===\n')

/**
 * Meldet einen Fall: ✓ bei erfüllter Bedingung, sonst ein Befund.
 * @param bedingung - erfüllt?
 * @param ok - Text bei Erfolg
 * @param fehler - Befundtext
 */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/**
 * Liest eine Datei relativ zur Repo-Wurzel.
 * @param relativ - Pfad relativ zur Repo-Wurzel
 * @returns Inhalt, leerer Text, wenn die Datei fehlt
 */
function text(relativ) {
  try {
    return readFileSync(join(WURZEL, relativ), 'utf8')
  } catch {
    return ''
  }
}

const aufraeumen = []
try {
  // ── (a) worktree add ohne CRLF-Umwandlung ──────────────────────────────────────────────────────────────────────────
  {
    const quelle = text('src/arbeitsordner/index.ts')
    const konstante = quelle.includes("const CHECKOUT_OHNE_UMWANDLUNG = ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf'] as const")
    pruefe(konstante, '(a) CHECKOUT_OHNE_UMWANDLUNG trägt core.autocrlf=false und core.eol=lf.', "(a) Konstante CHECKOUT_OHNE_UMWANDLUNG fehlt oder ohne '-c', 'core.autocrlf=false', '-c', 'core.eol=lf'")
    const alle = quelle.split("'worktree', 'add'").length - 1
    const geschuetzt = quelle.split("[...CHECKOUT_OHNE_UMWANDLUNG, 'worktree', 'add'").length - 1
    pruefe(alle >= 2 && geschuetzt === alle, `(a) ${geschuetzt}/${alle} worktree-add-Aufrufe mit CHECKOUT_OHNE_UMWANDLUNG.`, `(a) worktree add: ${geschuetzt} von ${alle} Aufrufen beginnen mit ...CHECKOUT_OHNE_UMWANDLUNG (erwartet alle, mindestens 2)`)
    pruefe(quelle.includes('${zeilenendenHinweis(pfad, vorhanden !== undefined, aufraeumenHinweis)}'), '(a) E-183-Fehlschlag trägt den Zeilenenden-Hinweis (nur bei Wiederaufnahme).', '(a) E-183-Fehlschlag in bereiteArbeitsordnerVor ohne zeilenendenHinweis(pfad, vorhanden !== undefined, …)')
  }

  // ── (b) Skelett-.gitattributes und Kopierregel ─────────────────────────────────────────────────────────────────────
  {
    const zeilen = text('vorlagen/projekt-skelett/.gitattributes').split(/\r?\n/).map((zeile) => zeile.trim())
    pruefe(zeilen.includes('* text=auto eol=lf'), '(b) Skelett-.gitattributes trägt `* text=auto eol=lf`.', '(b) vorlagen/projekt-skelett/.gitattributes fehlt oder ohne Zeile `* text=auto eol=lf`')
    const leer = mkdtempSync(join(tmpdir(), 'crlf-gate-'))
    aufraeumen.push(leer)
    pruefe(planeSkelettKopie(SKELETT, leer).kopieren.includes('.gitattributes'), '(b) planeSkelettKopie kopiert .gitattributes in ein leeres Ziel.', '(b) planeSkelettKopie nimmt .gitattributes nicht mit')
    const eigen = mkdtempSync(join(tmpdir(), 'crlf-gate-'))
    aufraeumen.push(eigen)
    writeFileSync(join(eigen, '.gitattributes'), '*.bin binary\n')
    const plan = planeSkelettKopie(SKELETT, eigen)
    pruefe(plan.vorhanden.includes('.gitattributes') && !plan.kopieren.includes('.gitattributes'), '(b) vorhandene, abweichende .gitattributes bleibt (nur additiv).', '(b) planeSkelettKopie würde eine vorhandene .gitattributes überschreiben')
  }

  // ── (c) Doku ───────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const doku = text('docs/architektur/arbeitsordner.md')
    const fehlt = ['core.autocrlf=false', 'core.eol=lf', 'vorlagen/projekt-skelett/.gitattributes', 'Nachrüsten'].filter((s) => !doku.includes(s))
    pruefe(fehlt.length === 0, '(c) docs/architektur/arbeitsordner.md nennt Zeilenenden-Schutz und Nachrüst-Grenze.', `(c) docs/architektur/arbeitsordner.md: fehlt ${fehlt.join(', ')}`)
  }

  // ── (d) Invarianten unverändert ────────────────────────────────────────────────────────────────────────────────────
  {
    const policy = text('src/invocation-policy/index.ts')
    const ist = policy.split('export function ermittleIstZustand')[1]?.split('\nexport function')[0] ?? ''
    pruefe(ist.includes('sha256Hex(settingsInhalt)') && !/\\r|eol|replace\(/.test(ist), '(d) E-183 hasht weiter Rohbytes (keine Normalisierung in ermittleIstZustand).', '(d) ermittleIstZustand normalisiert Zeilenenden oder hasht nicht mehr den Rohinhalt — Invariante E-183 verletzt')
    pruefe(text('src/authorization-boundary/index.ts').includes("zeile.trim() === '* -text'"), '(d) authorization-boundary verlangt weiter `* -text`.', "(d) src/authorization-boundary prüft nicht mehr auf '* -text'")
  }
} catch (fehler) {
  befunde.push(`Abbruch: ${fehler.stack ?? fehler}`)
} finally {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde (scripts/check-f45-b2b3b2b2b2a-crlf.mjs).')
