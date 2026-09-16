/**
 * Datei: scripts/check-f24-capabilities.mjs
 *
 * Zweck: F24-Gate (Capabilities v1, WS-1, AK7). Prüft mechanisch, was
 * features/F24/feature.md AK7 nennt — AK1 (alle 22 Einträge, plus der
 * "installiert, aber OFFEN"-Fall als eigener Rot-Fall: ein typ:'extern'-
 * Eintrag zeigt erkennbar "noch nicht freigegeben", nicht denselben Text
 * wie eine technisch nicht vorhandene Ressource), AK5 (ASSESSED bleibt eine
 * benannte Leerstelle, kein Eintrag erreicht sie in v1) und AK6
 * (Startvorlagen-Pfad ist Teil der Antwort). Geprüft wird DIREKT gegen die
 * reale ressourcen.json und die reale, standardmäßig geladene Startvorlage
 * startvorlagen/beispielprojekt.json (Muster scripts/check-f19-
 * ressourcen.mjs — die echte Projektionsfunktion, kein zweiter Regelsatz),
 * bewusst NICHT startvorlagen/ai-workforce.json: nur gegen die Default-
 * Vorlage ist codex real technisch nicht verfügbar — genau der Kontrastfall,
 * den AK1 von "installiert, aber OFFEN" unterscheiden verlangt (derselbe
 * Rot-Fall, den F-391/Schritt 0 dieses Auftrags sichtbar macht).
 *
 * AK2-AK4 sind hier NICHT geprüft — features/F24/feature.md AK7 nennt sie
 * nicht (Coverage/Gap-Verlinkung/Rollen-Besetzung laufen über code-reviewer-/
 * QA-Pass und den dort dokumentierten realen Test).
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f24-capabilities.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync } from 'node:fs'
import { loeseRessourcenAuf } from '../src/ressourcen/index.ts'
import { projeziereLibrary } from '../src/capabilities-ansicht/index.ts'

const REPO_WURZEL = process.cwd()
const STARTVORLAGE_PFAD = 'startvorlagen/beispielprojekt.json'
const befunde = []

console.log('\n=== F24-Capabilities-Check ===\n')

const rohDaten = JSON.parse(readFileSync('ressourcen.json', 'utf-8'))
const aufgeloest = loeseRessourcenAuf(rohDaten.ressourcen, REPO_WURZEL, STARTVORLAGE_PFAD)
const ansicht = projeziereLibrary(aufgeloest, STARTVORLAGE_PFAD)

// ─── (1) AK1: alle 22 Einträge ──────────────────────────────────────────────
if (ansicht.eintraege.length !== 22) {
  befunde.push(`(1) GET /api/ressourcen liefert ${ansicht.eintraege.length} Einträge statt der erwarteten 22`)
} else {
  console.log('✓ (1) 22 Einträge.')
}

// ─── (2) AK1 Rot-Fall: "installiert, aber OFFEN" != technisch nicht vorhanden ──
const externEintraege = ansicht.eintraege.filter((e) => e.typ === 'extern')
const technischNichtVorhanden = ansicht.eintraege.find((e) => e.typ !== 'extern' && !e.verfuegbar)

if (externEintraege.length === 0) {
  befunde.push('(2) kein typ:\'extern\'-Eintrag vorhanden — der "installiert, aber OFFEN"-Fall kann nicht geprüft werden')
} else if (technischNichtVorhanden === undefined) {
  befunde.push(`(2) gegen ${STARTVORLAGE_PFAD} ist kein 'worker'/'skill'-Eintrag technisch nicht verfügbar — der Kontrast-Rotfall (F-391/F-337) kann nicht geprüft werden`)
} else {
  for (const eintrag of externEintraege) {
    if (!eintrag.anzeigeGrund.toLowerCase().includes('noch nicht freigegeben')) {
      befunde.push(`(2) '${eintrag.id}' (typ 'extern', freigabe 'OFFEN'): anzeigeGrund '${eintrag.anzeigeGrund}' nennt nicht erkennbar "noch nicht freigegeben"`)
    }
    if (eintrag.anzeigeGrund === eintrag.grund) {
      befunde.push(`(2) '${eintrag.id}': anzeigeGrund ist identisch zum generischen Kern-Text ('${eintrag.grund}') — keine Unterscheidung von einer technisch nicht vorhandenen Ressource`)
    }
    if (eintrag.anzeigeGrund === technischNichtVorhanden.anzeigeGrund) {
      befunde.push(`(2) '${eintrag.id}' (extern/OFFEN) und '${technischNichtVorhanden.id}' (technisch nicht vorhanden) tragen denselben anzeigeGrund`)
    }
  }
  if (befunde.length === 0) {
    console.log(`✓ (2) extern/OFFEN (z. B. '${externEintraege[0].id}') und technisch nicht vorhanden ('${technischNichtVorhanden.id}') tragen erkennbar unterschiedlichen anzeigeGrund.`)
  }
}

// ─── (3) AK5: ASSESSED bleibt eine benannte Leerstelle ─────────────────────
const befundeVor3 = befunde.length
if (ansicht.assessedHinweis.trim().length === 0) {
  befunde.push('(3) assessedHinweis ist leer — die strukturell leere Phase ASSESSED würde still verschwinden statt benannt zu sein')
}
const assessedTreffer = ansicht.eintraege.filter((e) => e.phasen.includes('ASSESSED'))
if (assessedTreffer.length > 0) {
  befunde.push(`(3) ${assessedTreffer.length} Eintrag/Einträge erreichen ASSESSED in v1 (Nicht-Ziel — kein Scout-Artefakt vorhanden, F27)`)
}
if (befunde.length === befundeVor3) {
  console.log(`✓ (3) ASSESSED bleibt strukturell leer und ist benannt ('${ansicht.assessedHinweis}').`)
}

// ─── (4) AK6: Startvorlagen-Pfad ist Teil der Antwort ──────────────────────
if (typeof ansicht.startvorlagePfad !== 'string' || ansicht.startvorlagePfad.length === 0) {
  befunde.push('(4) startvorlagePfad fehlt oder ist leer — die Library-/Rollen-View könnte die aktiv geladene Startvorlage nicht anzeigen (AK6)')
} else if (ansicht.startvorlagePfad !== STARTVORLAGE_PFAD) {
  befunde.push(`(4) startvorlagePfad ('${ansicht.startvorlagePfad}') weicht vom übergebenen Pfad ('${STARTVORLAGE_PFAD}') ab`)
} else {
  console.log(`✓ (4) startvorlagePfad ('${ansicht.startvorlagePfad}') ist Teil der Antwort.`)
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
