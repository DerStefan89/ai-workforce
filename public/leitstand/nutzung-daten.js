/**
 * Datei: public/leitstand/nutzung-daten.js
 *
 * Zweck: Reine Aggregation der Seite „Nutzung“ (F44 WS-6b, Vorlage V10 d_nutzung, Abgleich F-725
 * I1–I3) über der Antwort von GET …/verbrauch (scripts/leitstand/routen-verbrauch.mjs:
 * { status: 'ok', gruppen: [{ rolle, worker, modell, auftragId, anzahlLaeufe, ohneBeobachtung,
 * verbrauch: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, dauerMs } }],
 * laeufeGesamt, ohneBeobachtungGesamt }). Drei Kennzahlen, Summen für „Was wurde verarbeitet?“,
 * Balkenbreiten und die Zeilen der technischen Aufschlüsselung (Rolle + Worker, Modell).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/nutzung.js
 * - public/leitstand/nutzung-daten.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein DOM, kein Netz, keine Abhängigkeit.
 * - Defensiv (F-603): ein Nicht-Array als gruppen ergibt leere Summen bzw. keine Zeilen, ein
 *   fehlender oder nicht-numerischer Zählwert zählt als 0 — keine Funktion wirft.
 * - „Gelesen“ enthält die Cache-Tokens (Vermerk WS-6b): inputTokens allein zählt bei
 *   Prompt-Caching nur den ungecachten Rest der Eingabe.
 * - null bei Rolle oder Modell bleibt eine eigene Gruppe („unbekannt“), keine Ausgrenzung.
 */

/**
 * Zählwert aus der Antwort, defensiv gelesen.
 * @param wert - beliebiger Wert
 * @returns endliche Zahl > 0, sonst 0
 */
function zahl(wert) {
  return typeof wert === 'number' && Number.isFinite(wert) && wert > 0 ? wert : 0
}

/**
 * Gruppen der Antwort als Array (F-603).
 * @param gruppen - antwort.gruppen
 * @returns Gruppen als Array (sonst leer), ohne null-Einträge
 */
function gruppenVon(gruppen) {
  return Array.isArray(gruppen) ? gruppen.filter((g) => g !== null && typeof g === 'object') : []
}

/**
 * Die drei Kennzahlen (I1).
 * @param antwort - Antwort von GET …/verbrauch mit status 'ok'
 * @returns { ausfuehrungen, mitNutzungsdaten, nichtErfasst }; mitNutzungsdaten nie negativ
 */
export function kennzahlen(antwort) {
  const ausfuehrungen = zahl(antwort?.laeufeGesamt)
  const nichtErfasst = zahl(antwort?.ohneBeobachtungGesamt)
  return { ausfuehrungen, mitNutzungsdaten: Math.max(0, ausfuehrungen - nichtErfasst), nichtErfasst }
}

/**
 * Summen für „Was wurde verarbeitet?“ (I2) über alle Gruppen.
 * @param gruppen - antwort.gruppen
 * @returns { gelesen: Eingabe + Cache gelesen + Cache geschrieben, ausZwischenspeicher: Cache gelesen, erzeugt: Ausgabe, eingabe, cacheGelesen, cacheGeschrieben }
 */
export function verarbeitet(gruppen) {
  const summe = { eingabe: 0, cacheGelesen: 0, cacheGeschrieben: 0, erzeugt: 0 }
  for (const g of gruppenVon(gruppen)) {
    summe.eingabe += zahl(g.verbrauch?.inputTokens)
    summe.cacheGelesen += zahl(g.verbrauch?.cacheReadTokens)
    summe.cacheGeschrieben += zahl(g.verbrauch?.cacheWriteTokens)
    summe.erzeugt += zahl(g.verbrauch?.outputTokens)
  }
  return { ...summe, gelesen: summe.eingabe + summe.cacheGelesen + summe.cacheGeschrieben, ausZwischenspeicher: summe.cacheGelesen }
}

/**
 * Balkenbreiten in Prozent, nur relativ zueinander: der größere Wert ist voll, beide 0 → 0. Ein Wert
 * über 0 bekommt mindestens 1 %, damit er neben einem sehr großen nicht verschwindet.
 * @param a - erster Wert
 * @param b - zweiter Wert
 * @returns [Breite a, Breite b] als ganze Prozent 0–100
 */
export function balkenBreiten(a, b) {
  const max = Math.max(zahl(a), zahl(b))
  if (max === 0) return [0, 0]
  const breite = (wert) => (zahl(wert) === 0 ? 0 : Math.max(1, Math.round((zahl(wert) / max) * 100)))
  return [breite(a), breite(b)]
}

/**
 * Neue, leere Zeile der Aufschlüsselung.
 * @param felder - Schlüsselfelder der Zeile (rolle/worker/modelle bzw. modell)
 * @returns Zeile mit allen Zählern 0
 */
function leereZeile(felder) {
  return { ...felder, anzahlLaeufe: 0, ohneBeobachtung: 0, eingabe: 0, ausgabe: 0, cacheGelesen: 0, cacheGeschrieben: 0 }
}

/**
 * Addiert eine Gruppe in eine Zeile (verändert die Zeile).
 * @param zeile - Zeile aus leereZeile()
 * @param g - Gruppe aus der Antwort
 */
function addiere(zeile, g) {
  zeile.anzahlLaeufe += zahl(g.anzahlLaeufe)
  zeile.ohneBeobachtung += zahl(g.ohneBeobachtung)
  zeile.eingabe += zahl(g.verbrauch?.inputTokens)
  zeile.ausgabe += zahl(g.verbrauch?.outputTokens)
  zeile.cacheGelesen += zahl(g.verbrauch?.cacheReadTokens)
  zeile.cacheGeschrieben += zahl(g.verbrauch?.cacheWriteTokens)
}

/**
 * Rolle, Worker oder Modell als nicht-leerer String, sonst null (eigene Gruppe „unbekannt“).
 * @param wert - Rohwert
 * @returns String oder null
 */
function textOderNull(wert) {
  return typeof wert === 'string' && wert !== '' ? wert : null
}

/**
 * Zeilen „nach Rolle und Worker“ (I3): je Paar Rolle + Worker eine Zeile mit den beobachteten
 * Modellen (in Reihenfolge des ersten Auftretens, null = unbekannt) und getrennten Cache-Werten.
 * Sortiert absteigend nach Läufen, bei Gleichstand in Reihenfolge der Quelle.
 * @param gruppen - antwort.gruppen
 * @returns [{ rolle, worker, modelle: (string|null)[], anzahlLaeufe, ohneBeobachtung, eingabe, ausgabe, cacheGelesen, cacheGeschrieben }]
 */
export function nachRolleUndWorker(gruppen) {
  const zeilen = new Map()
  for (const g of gruppenVon(gruppen)) {
    const rolle = textOderNull(g.rolle)
    const worker = textOderNull(g.worker)
    const schluessel = JSON.stringify([rolle, worker])
    let zeile = zeilen.get(schluessel)
    if (zeile === undefined) {
      zeile = leereZeile({ rolle, worker, modelle: [] })
      zeilen.set(schluessel, zeile)
    }
    const modell = textOderNull(g.modell)
    if (!zeile.modelle.includes(modell)) zeile.modelle.push(modell)
    addiere(zeile, g)
  }
  return [...zeilen.values()].sort((a, b) => b.anzahlLaeufe - a.anzahlLaeufe)
}

/**
 * Zeilen „nach Modell“ (I3, eigene Tabelle wie bisher): je Modell eine Zeile, null als eigene
 * Gruppe. Sortiert absteigend nach Läufen.
 * @param gruppen - antwort.gruppen
 * @returns [{ modell: string|null, anzahlLaeufe, ohneBeobachtung, eingabe, ausgabe, cacheGelesen, cacheGeschrieben }]
 */
export function nachModell(gruppen) {
  const zeilen = new Map()
  for (const g of gruppenVon(gruppen)) {
    const modell = textOderNull(g.modell)
    let zeile = zeilen.get(modell)
    if (zeile === undefined) {
      zeile = leereZeile({ modell })
      zeilen.set(modell, zeile)
    }
    addiere(zeile, g)
  }
  return [...zeilen.values()].sort((a, b) => b.anzahlLaeufe - a.anzahlLaeufe)
}
