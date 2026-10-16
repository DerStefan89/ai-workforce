/**
 * Datei: scripts/render-pfadprobe.mjs
 *
 * Zweck: Pfadprobe für Render-Nachweise (F45 B2b-3e-1, F-1125, features/F45/plan-b2b3e1-v2.md §1): findet persönliche Pfade
 * (`C:\Users\<echter Name>`, `AppData`, `/Users/…`, `/home/…`, Claude-Projektkennung `C--Users-…`) in einem Text. Der
 * Render-Helfer (scripts/render-nachweis.mjs) prüft damit vor jedem Screenshot den sichtbaren Text der Seite und vor dem
 * Schreiben das Protokoll — ein Treffer bricht ab, es entsteht kein Bild. Platzhalter (`C:\Users\<name>`, `<HOME>\AppData`,
 * `/home/<name>`) gelten als sauber. Rein, ohne Importe.
 *
 * Eigenes Modul statt eines bestehenden Helfers: `hatRestpfad` (features/F45/nachweise/b2b1b/schwaerze.mjs) sucht den Namen
 * aus `homedir()` — in der neutralen Umgebung (scripts/neutrale-umgebung.mjs) wäre das der neutrale Name, die Prüfung liefe
 * ins Leere; `neutralisiereText` (src/rueckfrage) ersetzt bekannte Orte, statt unbekannte zu finden.
 *
 * Wird aufgerufen von: scripts/render-nachweis.mjs, scripts/neutrale-umgebung.mjs, scripts/check-f45-b2b3e1-pfade.mjs,
 * scripts/render-pfadprobe.test.mjs, features/F45/nachweise/b2b3e1/instanz.mjs und render/erzeuge-nachweis.mjs.
 *
 * Wichtig: Die Probe liest die ganze Seite, auch wenn das Bild nur einen Ausschnitt zeigt — zu streng, aber sicher. Text in
 * Bildern/Canvas und `title`-Tooltips sieht sie nicht (stehen nicht im Screenshot). Bewusst streng (Fehltreffer brechen nur
 * ab): `LOCALAPPDATA`, `%APPDATA%`, `api/users/1`, `https://…/home/x` treffen. Bekannte Lücken (F-1125 Restpunkte):
 * URL-kodierte Pfade (`C%3A%5CUsers…`), `\\wsl$\…\home\…` mit Backslash, `/root/…`, Nutzerordner auf anderen Laufwerken
 * ohne `Users`, über getrennte Elemente verteilte Pfade, unsichtbare Zeichen (U+200B) hinter Trennern.
 */

/** Muster persönlicher Pfade (Auftrag F-1125 plus Delta-Pass: Claude-Projektkennung und posix-Home). Je Aufruf neu als RegExp. */
const MUSTER = String.raw`Users[\\/]+[^\\/<\r\n]{1,64}|AppData|[A-Za-z]:[\\/]+Users|[A-Za-z]--Users-[^\s\\/<]+|/home/[^\\/<\s]+`

/** Wie viele Zeichen um eine Fundstelle in der Meldung stehen. */
const UMFELD = 20

/**
 * Findet persönliche Pfade in einem Text.
 * @param text - geprüfter Text (sichtbarer Seitentext, Protokoll)
 * @returns Liste { treffer, stelle } in Textreihenfolge; leer = sauber
 */
export function findePersoenlichePfade(text) {
  const quelle = String(text ?? '')
  const funde = []
  // Neue RegExp je Aufruf: eine /g-RegExp auf Modulebene behielte lastIndex zwischen Aufrufen (Advisor A7).
  for (const m of quelle.matchAll(new RegExp(MUSTER, 'gi'))) {
    const treffer = m[0]
    const stelle = m.index
    // Platzhalter: `C:\Users\<name>` und `<HOME>\AppData` sind geschwärzt, kein persönlicher Pfad.
    if (/^[A-Za-z]:[\\/]+Users$/i.test(treffer) && /^[\\/]+</.test(quelle.slice(stelle + treffer.length))) continue
    if (/^AppData$/i.test(treffer) && /<[^<>\\/\s]+>[\\/]+$/.test(quelle.slice(Math.max(0, stelle - 40), stelle))) continue
    funde.push({ treffer, stelle })
  }
  return funde
}

/**
 * Bricht bei einem persönlichen Pfad ab.
 * @param text - geprüfter Text
 * @param ort - wo geprüft wurde (z. B. „Screenshot 01-de-1440.webp“), steht in der Meldung
 * @throws Error mit Ort und den Fundstellen (je ±20 Zeichen Umfeld), wenn findePersoenlichePfade etwas findet
 */
export function pruefeAufPersoenlichePfade(text, ort) {
  const quelle = String(text ?? '')
  const funde = findePersoenlichePfade(quelle)
  if (funde.length === 0) return
  const stellen = funde.map(({ treffer, stelle }) => `„…${quelle.slice(Math.max(0, stelle - UMFELD), stelle + treffer.length + UMFELD).replace(/\s+/g, ' ')}…“`)
  throw new Error(`Pfadprobe (F-1125): persönlicher Pfad in ${ort} — ${stellen.join('; ')}. Kein Bild/Protokoll geschrieben.`)
}

/**
 * Sammelt den sichtbaren Text der Seite — läuft im Browser über page.evaluate, darf deshalb nichts außerhalb nutzen.
 * Sichtbar: `document.body.innerText` (ohne display:none und geschlossene <details>) plus Wert und Platzhalter sichtbarer
 * Eingabefelder (stehen nicht in innerText).
 * @returns Text, Teile durch Zeilenumbruch getrennt
 */
export function sammleSichtbarenText() {
  const teile = [document.body?.innerText ?? '']
  for (const feld of document.querySelectorAll('input, textarea, select')) {
    if (feld.getClientRects().length === 0 || feld.type === 'hidden') continue
    teile.push(String(feld.value ?? ''))
    // Bei <select> ist die Beschriftung der gewählten Option sichtbar, nicht ihr value (code-reviewer 5).
    if (feld.selectedOptions?.[0]) teile.push(feld.selectedOptions[0].text)
    if (typeof feld.placeholder === 'string' && feld.placeholder !== '') teile.push(feld.placeholder)
  }
  return teile.join('\n')
}
