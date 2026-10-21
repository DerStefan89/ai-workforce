/**
 * Datei: scripts/leitstand/jarvis-orte.mjs
 *
 * Zweck: Ortsangaben des Jarvis-Auftrags (F45 B2b-4b, F-1085 (5), F-1088 (5)) — die Blockform mit der Ortszeile des
 * Projekts und die Ortszeilen der offenen Arbeitsordner (höchstens 5, neueste zuerst, je mit Titel; gibt es mehr, sagt der
 * Auftrag das). Rein: kein I/O, nicht schreibend; die Einträge sammelt der Server (synchron, D13 — features/F45/plan-b2b4b.md §3).
 *
 * Eine Quelle: Kopf, Ortszeile, Fuß und die Pfadregel kommen aus public/leitstand/code-daten.js (BLOCK_KOPF, ortZeile,
 * BLOCK_FUSS, befehlsBlock) wie jeder Befehlsblock des Leitstands — keine zweite Quoting- oder Pfadregel; die Sortierung neueste
 * zuerst aus baueArbeitsordnerListe.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (offeneAblaufOrte, beide Jarvis-Aufrufe: POST /api/chat, POST /api/chat/zusammenfassen)
 * - scripts/check-f45-b2b4b-jarvis.mjs, scripts/leitstand/jarvis-orte.test.mjs
 */

import { resolve } from 'node:path'
import { BLOCK_FUSS, BLOCK_KOPF, befehlsBlock, ortZeile } from '../../public/leitstand/code-daten.js'
import { baueArbeitsordnerListe } from './routen-arbeitsordner.mjs'

/** Höchstzahl der Ortszeilen offener Arbeitsordner im Jarvis-Auftrag. */
export const MAX_ABLAUF_ORTE = 5

/** Höchstlänge eines Titels in Codepoints (danach „…“). */
const MAX_TITEL = 80

/**
 * Zeichen, die eine Zeile des Auftragstexts brechen oder unsichtbar verändern: C0, DEL, C1, Nullbreite/Richtungsmarken
 * (U+200B–U+200F), Zeilen-/Absatztrenner (U+2028/U+2029), Bidi-Steuerung (U+202A–U+202E, U+2066–U+2069), BOM (qa 5).
 * Global: für .search (ignoriert lastIndex) und .replace.
 */
const STOERZEICHEN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g

/**
 * Offene Arbeitsordner: wirksam BEREIT, Ordner vorhanden, absoluter Pfad (befehlsBlock) ohne Störzeichen; neueste zuerst
 * (baueArbeitsordnerListe). Höchstens MAX_ABLAUF_ORTE + 1 — der eine zusätzliche zeigt baueJarvisOrte nur, dass es weitere
 * gibt (qa 1). Aufgeräumte (ENTFERNT), IN_VORBEREITUNG und FEHLGESCHLAGEN fallen heraus.
 * @param eintraege - [{ workflowId, daten, ordnerVorhanden }] wie für GET /api/arbeitsordner (daten mit wirksamem Status)
 * @returns [{ workflowId, pfad, … }] höchstens 6
 */
export function waehleOffeneArbeitsordner(eintraege) {
  return baueArbeitsordnerListe(eintraege)
    .arbeitsordner.filter((ao) => ao.status === 'BEREIT' && ao.ordnerVorhanden === true && befehlsBlock(ao.pfad, []) !== null && ao.pfad.search(STOERZEICHEN) === -1)
    .slice(0, MAX_ABLAUF_ORTE + 1)
}

/**
 * Einzeiliger, gekürzter Text: Störzeichen und Leerraum → ein Leerzeichen, „ und “ → ' (die Regelzeile setzt den Titel in
 * „…“), höchstens MAX_TITEL Codepoints.
 * @param text - Rohtext oder kein String
 * @returns bereinigter Text, '' bei leerem/fehlendem Text
 */
function einzeilig(text) {
  if (typeof text !== 'string') return ''
  const zeichen = [...text.replace(STOERZEICHEN, ' ').replace(/\s+/g, ' ').replace(/[„“”]/g, "'").trim()]
  return zeichen.length > MAX_TITEL ? `${zeichen.slice(0, MAX_TITEL - 1).join('').trimEnd()}…` : zeichen.join('')
}

/**
 * Titel eines Ablaufs für den Jarvis-Auftrag: Auftragstitel, sonst das Ziel des Workflows, je einzeilig und gekürzt; die
 * interne Kennung nur, wenn beides fehlt.
 * @param quelle - { titel, ziel, workflowId }
 * @returns Titel
 */
export function ablaufTitel({ titel, ziel, workflowId }) {
  return einzeilig(titel) || einzeilig(ziel) || `Ablauf ${workflowId}`
}

/**
 * Optionen für baueJarvisAuftragstext (src/jarvis): Blockform mit der Ortszeile des Projekts, die Ortszeilen der ersten
 * MAX_ABLAUF_ORTE offenen Arbeitsordner und ob es weitere gibt — die einzige Stelle, die ortZeile für Jarvis aufruft.
 * @param repoWurzel - Projektordner dieser Instanz
 * @param offene - [{ workflowId, pfad, titel?, ziel? }] aus waehleOffeneArbeitsordner, um Titel/Ziel ergänzt
 * @returns { block: { kopf, ortZeile, fuss }, ablaufOrte: [{ titel, ortZeile }], weitereAblaufOrte: boolean }
 */
export function baueJarvisOrte(repoWurzel, offene) {
  return {
    block: { kopf: BLOCK_KOPF, ortZeile: ortZeile(resolve(repoWurzel)), fuss: BLOCK_FUSS },
    ablaufOrte: offene.slice(0, MAX_ABLAUF_ORTE).map((ao) => ({ titel: ablaufTitel(ao), ortZeile: ortZeile(ao.pfad) })),
    weitereAblaufOrte: offene.length > MAX_ABLAUF_ORTE,
  }
}
