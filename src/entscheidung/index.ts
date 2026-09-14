/**
 * Datei: src/entscheidung/index.ts
 *
 * Zweck: Schema-Validator für das Entscheidungsartefakt (F23 WS-1a, löst
 * state/findings.md F-350/F-379). Format Muster
 * src/aenderungsuebersicht/index.ts (validiereAenderungsuebersichtDaten).
 *
 * leiteArtAusHerkunftAb ist KEIN Teil der Validierung selbst (E-M4-6): ein
 * VOR diesem Auftrag geschriebenes Entscheidungsartefakt trägt kein
 * 'art'-Feld im Payload — ein Leser leitet es aus der Lineage-
 * herkunft.schritt ab, statt das alte Artefakt für ungültig zu erklären.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (fünf Schreibstellen,
 * herkunft.schritt entscheidung-workflow-planaenderung/-freigabe/-stopp,
 * entscheidung-terminal, entscheidung-kenntnisnahme — validiereEntscheidungsDaten
 * läuft dort jeweils vor registriereKernArtefakt), scripts/check-f23-abnahme.mjs
 * (Block (f), Schema-Beispiele).
 */

import type { EntscheidungArt } from './types.ts'

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

const ENTSCHEIDUNG_ARTEN: EntscheidungArt[] = ['freigabe', 'stopp', 'planaenderung', 'terminal', 'kenntnisnahme', 'abnahme']

/** Je 'art' eigene, exklusive 'ergebnis'-Wertemenge (F-379: die fünf zuvor überladenen Familien, plus 'abnahme' ohne eigene Schreibstelle). */
const ERGEBNIS_WERTE_JE_ART: Record<EntscheidungArt, string[]> = {
  freigabe: ['FREIGEGEBEN', 'ABGELEHNT'],
  stopp: ['GESTOPPT'],
  planaenderung: ['FREIGABEPFLICHT_ABGESCHWAECHT'],
  terminal: ['ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN'],
  kenntnisnahme: ['VERWEIGERT', 'FEHLGESCHLAGEN'],
  abnahme: ['ANGENOMMEN', 'ANPASSUNG_ANGEFORDERT', 'ABGELEHNT'],
}

const BASIS_FELDER = new Set(['entscheidung_schema', 'art', 'ergebnis', 'begruendung', 'entschieden_am'])
const PLANAENDERUNG_FELDER = new Set([...BASIS_FELDER, 'abgeschwaechte_freigaben'])
const ABGESCHWAECHTE_FREIGABE_FELDER = new Set(['schritt_id', 'vorher', 'nachher'])

function istBekannteArt(wert: unknown): wert is EntscheidungArt {
  return typeof wert === 'string' && (ENTSCHEIDUNG_ARTEN as string[]).includes(wert)
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/kontrollzustand-entscheidung-payload.schema.json. Muster
 * validiereAenderungsuebersichtDaten (src/aenderungsuebersicht/index.ts,
 * D5 — handgeschrieben statt ajv).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereEntscheidungsDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  if (!('entscheidung_schema' in daten)) {
    verstoesse.push("Pflichtfeld 'entscheidung_schema' fehlt")
  } else if (daten.entscheidung_schema !== 'v0') {
    verstoesse.push("'entscheidung_schema' muss 'v0' sein")
  }

  if (!('art' in daten)) {
    verstoesse.push("Pflichtfeld 'art' fehlt")
  } else if (!istBekannteArt(daten.art)) {
    verstoesse.push(`'art' muss eines von ${ENTSCHEIDUNG_ARTEN.join(', ')} sein, erhalten: ${JSON.stringify(daten.art)}`)
  }

  if (!('begruendung' in daten)) {
    verstoesse.push("Pflichtfeld 'begruendung' fehlt")
  } else if (!istNichtLeererString(daten.begruendung)) {
    verstoesse.push("'begruendung' muss ein nicht-leerer String sein")
  }

  if (!('entschieden_am' in daten)) {
    verstoesse.push("Pflichtfeld 'entschieden_am' fehlt")
  } else if (!istNichtLeererString(daten.entschieden_am)) {
    verstoesse.push("'entschieden_am' muss ein nicht-leerer String sein")
  }

  if (!('ergebnis' in daten)) {
    verstoesse.push("Pflichtfeld 'ergebnis' fehlt")
  }

  // Ohne bekannte 'art' lässt sich weder die erlaubte Feldmenge noch die erlaubte
  // 'ergebnis'-Wertemenge bestimmen (additionalProperties:false gilt je Zweig) — die
  // Basisverstöße oben stehen bereits, ein Rateversuch hier würde nur Folgefehler erzeugen.
  if (!istBekannteArt(daten.art)) {
    return verstoesse
  }
  const art = daten.art

  const erlaubteFelder = art === 'planaenderung' ? PLANAENDERUNG_FELDER : BASIS_FELDER
  for (const feld of Object.keys(daten)) {
    if (!erlaubteFelder.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' für art '${art}' (additionalProperties: false)`)
  }

  const erlaubteErgebnisse = ERGEBNIS_WERTE_JE_ART[art]
  if ('ergebnis' in daten && (typeof daten.ergebnis !== 'string' || !erlaubteErgebnisse.includes(daten.ergebnis))) {
    verstoesse.push(`'ergebnis' muss bei art '${art}' eines von ${erlaubteErgebnisse.join(', ')} sein, erhalten: ${JSON.stringify(daten.ergebnis)}`)
  }

  if (art === 'planaenderung') {
    if (!('abgeschwaechte_freigaben' in daten)) {
      verstoesse.push("Pflichtfeld 'abgeschwaechte_freigaben' fehlt (Pflicht bei art 'planaenderung')")
    } else if (!Array.isArray(daten.abgeschwaechte_freigaben)) {
      verstoesse.push("'abgeschwaechte_freigaben' muss ein Array sein")
    } else {
      daten.abgeschwaechte_freigaben.forEach((eintrag, index) => {
        const praefix = `abgeschwaechte_freigaben[${index}]`
        if (!istObjekt(eintrag)) {
          verstoesse.push(`'${praefix}' ist kein Objekt`)
          return
        }
        for (const feld of Object.keys(eintrag)) {
          if (!ABGESCHWAECHTE_FREIGABE_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${praefix}.${feld}' (additionalProperties: false)`)
        }
        for (const feld of ABGESCHWAECHTE_FREIGABE_FELDER) {
          if (!(feld in eintrag)) verstoesse.push(`Pflichtfeld '${praefix}.${feld}' fehlt`)
        }
        if ('schritt_id' in eintrag && !istNichtLeererString(eintrag.schritt_id)) {
          verstoesse.push(`'${praefix}.schritt_id' muss ein nicht-leerer String sein`)
        }
        if ('vorher' in eintrag && eintrag.vorher !== 'ZWINGEND') {
          verstoesse.push(`'${praefix}.vorher' muss 'ZWINGEND' sein`)
        }
        if ('nachher' in eintrag && eintrag.nachher !== null && typeof eintrag.nachher !== 'string') {
          verstoesse.push(`'${praefix}.nachher' muss ein String oder null sein`)
        }
      })
    }
  }

  return verstoesse
}

/** Mapping von herkunft.schritt auf die fünf real geschriebenen Arten (F23 WS-1a). 'abnahme' hat keine Schreibstelle und deshalb keinen herkunft.schritt-Wert. */
const HERKUNFT_SCHRITT_ZU_ART: Record<string, EntscheidungArt> = {
  'entscheidung-workflow-planaenderung': 'planaenderung',
  'entscheidung-workflow-freigabe': 'freigabe',
  'entscheidung-workflow-stopp': 'stopp',
  'entscheidung-terminal': 'terminal',
  'entscheidung-kenntnisnahme': 'kenntnisnahme',
}

/**
 * Leitet 'art' aus der Lineage-herkunft.schritt eines Entscheidungsartefakts
 * ab (E-M4-6) — für ein VOR F23 WS-1a geschriebenes Artefakt, dessen Payload
 * selbst kein 'art'-Feld trägt. KEIN Teil von validiereEntscheidungsDaten:
 * die prüft ausschließlich den Payload, wie validiereAenderungsuebersichtDaten.
 * @param herkunftSchritt - herkunft.schritt eines Entscheidungsartefakts
 * @returns die abgeleitete Art, oder null bei unbekanntem herkunft.schritt
 */
export function leiteArtAusHerkunftAb(herkunftSchritt: string): EntscheidungArt | null {
  return HERKUNFT_SCHRITT_ZU_ART[herkunftSchritt] ?? null
}
