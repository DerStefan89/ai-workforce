/**
 * Datei: scripts/leitstand/pruefbericht-testhilfe.mjs
 *
 * Zweck: Testhilfe für Gates, die „Freigeben & installieren“ über die Server-Route prüfen (F45 F-2b-2, Advisor C5): seit
 * F-2b-2 verlangt die Installation einen Prüfbericht zur angezeigten Version (Rückruf pruefeBericht, nicht abschaltbar). Diese
 * Hilfe legt nach einem erfolgreichen „vorbereiten“ einen passenden Bericht in der Ablage der Gate-Instanz an — mit
 * derselben Funktion wie der Server (registrierePruefbericht) —, damit die Statuscodes der Bestandsgates (Zielordner 409,
 * Prüfung 422 …) unverändert hinter der Bericht-Sperre geprüft werden.
 *
 * Wird aufgerufen von: scripts/check-f36-ws5a-installation.mjs, scripts/check-f36-ws5b-skill.mjs,
 * scripts/check-f45-f2b2-pruefung.mjs.
 *
 * Wichtig: Nur für Wegwerf-Ablagen der Gates — nie gegen den Kontrollzustand der Workforce.
 */

import { createHash } from 'node:crypto'
import { registrierePruefbericht } from '../../src/sammlung/pruefbericht.ts'
import { angezeigteQuelleAus } from './routen-pruefung.mjs'

/** sha256 einer leeren Datei (die WS-5a-Attrappe installiert ein leeres cli.js). */
export const LEER_SHA256 = createHash('sha256').update('').digest('hex')

/** Leere Fakten (die Gates prüfen keinen Inhalt). */
const LEERE_FAKTEN = Object.freeze({ dateien: 0, bytes: 0, uebersprungen: { je_grund: {}, liste: [] }, umbenannt: [], skripte: {}, paket: null, hooks: [], skill_dateien: [], agent_dateien: [] })

/**
 * Legt einen Bericht zur angezeigten Quelle an.
 * @param daten - Antwort von …/installation/vorbereiten (McpVorbereitung | SkillVorbereitung)
 * @param profilReferenz - Profilreferenz der Gate-Instanz
 * @param basisVerzeichnis - Ablage der Gate-Instanz
 * @param urteil - Urteil (Standard GEEIGNET)
 * @param erstelltAm - Zeitstempel (Standard jetzt)
 * @param dateien - geprüfte Dateiliste [{ pfad, sha256 }] (F-1075: muss dem entsprechen, was die Gate-Installation schreibt)
 * @returns { artefakt_id, version }
 */
export function legePassendenBerichtAn(daten, profilReferenz, basisVerzeichnis, urteil = 'GEEIGNET', erstelltAm = new Date().toISOString(), dateien = [{ pfad: 'cli.js', sha256: LEER_SHA256 }]) {
  const a = angezeigteQuelleAus(daten)
  const quelle = a.art === 'git' ? { art: 'git', repo: a.repo, ref: daten.ref, sha: a.sha, pfad: a.quellPfad } : a
  const typ = a.art === 'git' ? 'skill' : 'mcp'
  return registrierePruefbericht(
    daten.id,
    {
      ergebnis: { urteil, typ, gepinnte_version: a.art === 'git' ? a.sha : a.version, befunde: [], auflagen: urteil === 'MIT_AUFLAGEN' ? ['Gate-Auflage'] : [], zusammenfassung: 'Gate-Bericht (Testhilfe).' },
      quelle,
      typ,
      katalog_id: daten.id,
      sammlung_id: null,
      urteil_sammlung: null,
      ausnahme_begruendung: null,
      fakten: LEERE_FAKTEN,
      inhalt: { dateien },
      herkunft: { commit_zeit: null, geaendert: null, pfleger: [], lizenz_registry: null },
      lauf_id: `gate-${daten.id}`,
      auftrag_id: `gate-${daten.id}`,
      erstellt_am: erstelltAm,
    },
    null,
    profilReferenz,
    { basisVerzeichnis, schreiber: () => {} }
  )
}

/**
 * Umhüllt eine post-Hilfe der Gates: nach jedem erfolgreichen …/installation/vorbereiten wird ein passender Bericht angelegt.
 * @param post - (pfad, body) => { status, inhalt }
 * @param profilReferenz - Profilreferenz
 * @param basisVerzeichnis - Ablage
 * @param dateienFuer - (vorbereitung) => geprüfte Dateiliste; Standard: ein leeres cli.js (WS-5a-Attrappe)
 * @returns umhüllte post-Hilfe
 */
export function mitPassendemBericht(post, profilReferenz, basisVerzeichnis, dateienFuer = () => [{ pfad: 'cli.js', sha256: LEER_SHA256 }]) {
  return async (pfad, body) => {
    const antwort = await post(pfad, body)
    if (antwort.status === 200 && /\/installation\/vorbereiten$/.test(pfad)) legePassendenBerichtAn(antwort.inhalt, profilReferenz, basisVerzeichnis, 'GEEIGNET', new Date().toISOString(), dateienFuer(antwort.inhalt))
    return antwort
  }
}
