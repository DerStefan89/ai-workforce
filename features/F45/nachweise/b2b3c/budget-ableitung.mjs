/**
 * Datei: features/F45/nachweise/b2b3c/budget-ableitung.mjs
 *
 * Zweck: Ableitung der Budget-Defaults je Kontrolltiefe (F45 B2b-3c, F-981) aus realen Laufakten. Je Ablauf
 * (lineage-workflow-*) werden alle lauf_ids aller Versionen gesammelt (Korrekturrunden inklusive), deren
 * Laufakten-`verbrauch` summiert (input + output + cache_read + cache_write — dieselbe Summe wie src/budget) und der
 * Ablauf seiner Vorlage zugeordnet: zuerst über das Router-Ergebnis des Auftrags (`vorlage`, angehoben wie
 * bestimmeEffektiveKontrolltiefe), sonst über die Schrittrollen (architekt/advisor ⇒ hoch, code-reviewer ⇒ standard,
 * sonst fast-lane). Ergebnis: Median je Vorlage × 3, aufgerundet auf 100 000 Tokens. Läufe ohne `verbrauch` zählen
 * nicht mit (nie geschätzt); ein Ablauf ohne einen einzigen gemessenen Lauf fällt heraus. Mehrere Wurzeln sind
 * erlaubt (Fremdprojekte); ein Ablauf, dessen Kennung schon in einer früheren Wurzel stand (Worktree-Kopie), zählt
 * nur einmal. Zusätzlich: Tokens je Lauf der Rolle `ausfuehrung` (Grundlage für eine Vorlage ohne eigene Abläufe).
 * Nur lesend (Lineage-Registry), schreibt nichts.
 *
 * Aufruf: node features/F45/nachweise/b2b3c/budget-ableitung.mjs [kontrollzustand-Wurzel …]
 * Ausgabe: JSON auf stdout (je Vorlage Anzahl, Einzelsummen, Median, Vorschlag; Ausführungsläufe; gemessene Abläufe).
 */

import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { kontrolltiefeAusSchritten, tokensDesVerbrauchs } from '../../../../src/budget/index.ts'
import { ladeArtefaktVersion, listeVersionen } from '../../../../src/lineage-registry/index.ts'
import { bestimmeEffektiveKontrolltiefe } from '../../../../src/router/index.ts'

const FAKTOR = 3
const RUNDUNG = 100_000
const wurzeln = (process.argv.length > 2 ? process.argv.slice(2) : ['kontrollzustand']).map((w) => resolve(w))

/** Letzte zwei Pfadteile (ohne persönliche Pfade in der Ausgabe). @param pfad - absoluter Pfad @returns Kurzform */
function kurz(pfad) {
  return pfad.split(/[\\/]/).slice(-2).join('/')
}

/** Median einer Zahlenliste. @param werte - Zahlen @returns Median oder null */
function median(werte) {
  if (werte.length === 0) return null
  const s = [...werte].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Vorschlag aus einem Median: × FAKTOR, aufgerundet auf RUNDUNG. @param m - Median oder null @returns Tokens oder null */
function vorschlag(m) {
  return m === null ? null : Math.ceil((m * FAKTOR) / RUNDUNG) * RUNDUNG
}

const proTiefe = { 'fast-lane': [], standard: [], hoch: [] }
const ausfuehrungsLaeufe = []
const gemessen = []
const gesehen = new Set()

for (const basisVerzeichnis of wurzeln) {
  const optionen = { basisVerzeichnis, schreiber: () => {} }
  const tokensDesLaufs = (laufId) => tokensDesVerbrauchs(ladeArtefaktVersion(`laufakte-${laufId}`, undefined, optionen)?.daten?.verbrauch)
  const tiefeDesAblaufs = (daten) => {
    const router = ladeArtefaktVersion(`router-${daten.auftrag_id}`, undefined, optionen)?.daten
    if (typeof router?.vorlage === 'string') {
      const herkunft = ladeArtefaktVersion(`auftrag-${daten.auftrag_id}`, undefined, optionen)?.daten?.herkunft?.art
      return { tiefe: bestimmeEffektiveKontrolltiefe(router.vorlage, herkunft).kontrolltiefe, quelle: 'router' }
    }
    return { tiefe: kontrolltiefeAusSchritten(daten.schritte ?? []), quelle: 'rollen' }
  }
  const ablaeufe = existsSync(basisVerzeichnis)
    ? readdirSync(basisVerzeichnis)
        .filter((n) => n.startsWith('lineage-workflow-'))
        .map((n) => n.slice('lineage-'.length))
    : []
  for (const artefaktId of ablaeufe) {
    if (gesehen.has(artefaktId)) continue
    gesehen.add(artefaktId)
    const versionen = listeVersionen(artefaktId, optionen)
    if (versionen.length === 0) continue
    const laufIds = new Set()
    const ausfuehrungIds = new Set()
    for (const v of versionen) {
      for (const s of v.daten?.schritte ?? []) {
        if (typeof s.lauf_id !== 'string') continue
        laufIds.add(s.lauf_id)
        if (s.rolle === 'ausfuehrung') ausfuehrungIds.add(s.lauf_id)
      }
    }
    let summe = 0
    let anzahlGemessen = 0
    for (const laufId of laufIds) {
      const t = tokensDesLaufs(laufId)
      if (t === null) continue
      summe += t
      anzahlGemessen += 1
      if (ausfuehrungIds.has(laufId)) ausfuehrungsLaeufe.push(t)
    }
    if (anzahlGemessen === 0) continue
    const { tiefe, quelle } = tiefeDesAblaufs(versionen[versionen.length - 1].daten)
    proTiefe[tiefe].push(summe)
    gemessen.push({ wurzel: kurz(basisVerzeichnis), ablauf: artefaktId, tiefe, quelle, laeufe: laufIds.size, gemessen: anzahlGemessen, summe })
  }
}

const ergebnis = Object.fromEntries(
  Object.entries(proTiefe).map(([tiefe, summen]) => {
    const m = median(summen)
    return [tiefe, { anzahl: summen.length, summen: [...summen].sort((a, b) => a - b), median: m, vorschlag: vorschlag(m) }]
  })
)
const mAusfuehrung = median(ausfuehrungsLaeufe)
const ausfuehrung = { anzahl: ausfuehrungsLaeufe.length, tokens: [...ausfuehrungsLaeufe].sort((a, b) => a - b), median: mAusfuehrung, vorschlag: vorschlag(mAusfuehrung) }
console.log(JSON.stringify({ wurzeln: wurzeln.map(kurz), faktor: FAKTOR, rundung: RUNDUNG, ergebnis, ausfuehrung, gemessen }, null, 2))
