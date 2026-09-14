/**
 * Datei: src/workboard/features.ts
 *
 * Zweck: Reiner Parser für features/<id>/feature.md (F21 WS-1, AK2). Liest
 * `## Titel` und `Status: <WERT>` aus bereits gelesenem Dateiinhalt (kein
 * eigenes readFileSync). Die gültige Statusmenge wird NICHT neu definiert,
 * sondern 1:1 aus feature-status.ts übernommen — derselben Menge, gegen die
 * scripts/check-feature.mjs bereits prüft (kein zweiter Regelsatz, D5).
 *
 * STATUS_MUSTER ist bewusst NICHT auf den '## Status'-Abschnitt beschränkt
 * (matcht die erste beliebige Zeile im Dokument, die mit 'Status:' beginnt)
 * — exakt derselbe, unskopierte Regex wie in scripts/check-feature.mjs
 * (D5: kein zweiter, abweichender Regelsatz für dieselbe Zeile).
 */

import { gueltigeStatusWerte } from './feature-status.ts'
import type { Befund, FeatureWorkitem, ParseErgebnis } from './types.ts'

const STATUS_MUSTER = /^Status:\s*(\S+)/m

/**
 * Erster nicht-leerer Zeileninhalt nach der '## Titel'-Überschrift, VOR der
 * nächsten '##'-Überschrift — anders als ein einzelner Regex mit `\s*\n+`
 * kann diese zeilenweise Suche eine leere Titel-Sektion nicht versehentlich
 * mit dem Text der nächsten Überschrift verwechseln (QA-Befund F21 WS-1).
 * @returns getrimmter Titeltext, oder null bei fehlender/leerer Sektion
 */
function extrahiereTitel(inhalt: string): string | null {
  const zeilen = inhalt.split(/\r?\n/)
  const startIndex = zeilen.findIndex((zeile) => /^## Titel\s*$/.test(zeile))
  if (startIndex === -1) return null
  for (let i = startIndex + 1; i < zeilen.length; i++) {
    const zeile = zeilen[i]
    if (/^##\s/.test(zeile)) return null
    if (zeile.trim() !== '') return zeile.trim()
  }
  return null
}

export interface FeatureDatei {
  /** Ordnername unter features/, z. B. 'F20' — zugleich die id des Workitems. */
  ordner: string
  pfad: string
  /** Dateiinhalt, oder null, wenn unter pfad keine feature.md existiert (Befund 'feature_md_fehlt'). */
  inhalt: string | null
}

/**
 * Parst eine Liste bereits gelesener feature.md-Dateien.
 * @param dateien - je Feature-Ordner Ordnername, Pfad und Dateiinhalt (oder null, siehe FeatureDatei)
 * @returns Feature-Workitems plus Befunde (fehlende feature.md, fehlender Titel, fehlender/unbekannter Status)
 */
export function parseFeatureAkten(dateien: FeatureDatei[]): ParseErgebnis<FeatureWorkitem> {
  const workitems: FeatureWorkitem[] = []
  const befunde: Befund[] = []

  for (const { ordner, pfad, inhalt } of dateien) {
    if (inhalt === null) {
      befunde.push({ quelle: 'feature', art: 'feature_md_fehlt', meldung: `${pfad}: feature.md fehlt`, id: ordner })
      continue
    }

    const titel = extrahiereTitel(inhalt)
    if (titel === null) {
      befunde.push({ quelle: 'feature', art: 'fehlendes_titel_feld', meldung: `${pfad}: Abschnitt '## Titel' fehlt oder ist leer`, id: ordner })
    }

    const statusTreffer = inhalt.match(STATUS_MUSTER)
    const status = statusTreffer ? statusTreffer[1] : undefined
    if (!status || !gueltigeStatusWerte.includes(status)) {
      befunde.push({ quelle: 'feature', art: 'status_fehlt_oder_unbekannt', meldung: `${pfad}: Status fehlt oder unbekannt`, id: ordner })
    }

    workitems.push({
      quelle: 'feature',
      typ: 'FEATURE',
      id: ordner,
      titel: titel ?? '',
      status: status ?? 'UNBEKANNT',
      pfad,
    })
  }

  return { workitems, befunde }
}
