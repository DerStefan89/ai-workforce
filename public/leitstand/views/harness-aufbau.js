/**
 * Datei: public/leitstand/views/harness-aufbau.js
 *
 * Zweck: Register „Harness-Aufbau“ der Workforce `#/capabilities` (F46 D6, docs/design/abgleich-f46.md
 * §4.14, Bild 01-workforce-harness--Main): das Skelett „Dein Harness“ mit sechs Bausteinen (Regeln, Wissen,
 * Gedächtnis, Rollen & Fähigkeiten, Bremsen, Prüfung & Betrieb) aus GET /api/harness — echte Dateien und
 * Anzahlen, fehlende Orte als „fehlt“ — und ein Detailpanel: Klick auf eine Datei lädt ihren Inhalt lesend
 * und gekappt (GET /api/harness/datei), Klick auf einen Ordner zeigt seine direkten Einträge (Dateien davon
 * wieder öffenbar). Bremsen tragen ein Schloss und den Satz „Sichtbar, aber nicht direkt änderbar.“
 *
 * „kommt“ (abgleich-f46.md §4.14/§5): Vergleich mit der Vorlage (Vorlage im Repo nicht eindeutig),
 * „Genutzt von“-Kürzel und „Wer nutzt den Harness?“ (Fixpaket B1), „Änderung vorschlagen“ (E-F46-2) und
 * „Harness bearbeiten“ (01-Bearbeiten). Keine Platzhalter der Vorlage.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (initHarnessAufbau, renderHarness, zeigeHarnessFehler,
 *   oeffneHarnessOrt, setzeHarnessZurueck)
 *
 * Wichtig:
 * - Rein lesend. Kein Schreibweg, kein Terminal; „In VS Code öffnen“ ist ein vscode://file/-Link
 *   (kopf-werkzeuge.js baueVsCodeLink), den der Rechner des Nutzers öffnet.
 * - Dateiinhalte, Namen und Pfade sind Serverwerte und gehen roh durch escapeHtml — nie als HTML oder
 *   Markdown gerendert.
 * - Kein Poll: geladen beim Betreten, per „Neu laden“ und beim Projektwechsel (capabilities.js).
 */

import { holeHarnessDatei } from '../api.js'
import { BAUSTEIN_IDS, findeHarnessEintrag, harnessLeer, knotenFuerBaustein } from '../harness-anzeige.js'
import { formatiereDatum, formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { baueVsCodeLink } from '../kopf-werkzeuge.js'
import { escapeHtml } from '../render.js'

/** Schloss (dekorativ; der Name „nur lesend“ steht als Text daneben). */
const SCHLOSS_SVG = '<svg class="icon harness-schloss" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>'

/** Zuletzt geladene Antwort von GET /api/harness oder null. */
let letzterHarness = null

/** Gewählter Knoten { pfad, art } oder null. */
let auswahl = null

/** Laufende Nummer der Detail-Anfragen (Überholschutz). */
let detailAnfrage = 0

/**
 * Größe in Bytes als kurzer Text (B, KB) in der aktuellen Sprache.
 * @param bytes - Größe
 * @returns Text oder '—'
 */
function groesseText(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return t('harness.groesse.bytes', { zahl: formatiereZahl(bytes) })
  return t('harness.groesse.kb', { zahl: formatiereZahl(bytes / 1024, { maximumFractionDigits: 1 }) })
}

/**
 * Zeitpunkt als Datum und Uhrzeit, sonst '—'.
 * @param iso - ISO-Zeitpunkt
 * @returns Text
 */
function zeitText(iso) {
  return typeof iso === 'string' && iso !== '' ? formatiereDatum(iso, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

/**
 * Ein Knoten im Skelett: Knopf (aria-pressed) für einen lesbaren Ort, sonst ein Kasten mit „fehlt“ bzw.
 * „nicht lesbar“ (Grund für Screenreader und als title).
 * @param knoten - Ergebnis von knotenFuerBaustein
 * @returns HTML
 */
function knotenHtml(knoten) {
  const name = `<span class="harness-knoten-name">${escapeHtml(knoten.name)}</span>`
  const schloss = knoten.geschuetzt ? `${SCHLOSS_SVG}<span class="sr-only">${tHtml('harness.nurLesend')}</span>` : ''
  const anzahl = knoten.art === 'ordner' && Number.isInteger(knoten.anzahl) ? `<span class="harness-knoten-anzahl"><span aria-hidden="true">· ${escapeHtml(formatiereZahl(knoten.anzahl))}</span><span class="sr-only"> ${tHtml('harness.eintraege', { anzahl: knoten.anzahl })}</span></span>` : ''
  if (knoten.fehler) {
    return `<li><div class="harness-knoten" data-zustand="fehler" title="${escapeHtml(knoten.grund ?? '')}">${name}${schloss}<span class="harness-knoten-status">${tHtml('harness.nichtLesbar')}<span class="sr-only">: ${escapeHtml(knoten.grund ?? '')}</span></span></div></li>`
  }
  if (!knoten.vorhanden) {
    return `<li><div class="harness-knoten" data-zustand="fehlt">${name}${schloss}<span class="harness-knoten-status">${tHtml('harness.fehlt')}</span></div></li>`
  }
  const gewaehlt = auswahl !== null && auswahl.pfad === knoten.pfad
  return `<li><button type="button" class="harness-knoten" data-harness-pfad="${escapeHtml(knoten.pfad)}" data-harness-art="${knoten.art}"${knoten.geschuetzt ? ' data-geschuetzt="true"' : ''} aria-pressed="${gewaehlt}" aria-controls="harness-detail"><span class="harness-knoten-zeile">${name}${anzahl}${schloss}</span></button></li>`
}

/**
 * Eine Spalte des Skeletts: Kopf (Titel, Ort) und die Knoten als Liste.
 * @param baustein - { id, ort, eintraege }
 * @returns HTML
 */
function spalteHtml(baustein) {
  const id = BAUSTEIN_IDS.includes(baustein.id) ? baustein.id : 'unbekannt'
  const titelId = `harness-spalte-${id}`
  const knoten = knotenFuerBaustein(baustein)
  return `<section class="harness-spalte" data-baustein="${escapeHtml(id)}" aria-labelledby="${titelId}">
    <div class="harness-spalte-kopf"><h3 id="${titelId}">${tHtml(`harness.baustein.${id}`)}</h3><code>${escapeHtml(baustein.ort ?? '')}</code></div>
    <ul class="harness-knoten-liste">${knoten.map(knotenHtml).join('')}</ul>
  </section>`
}

/** Rendert das Skelett aus letzterHarness. */
function renderSkelett() {
  const ziel = document.getElementById('harness-skelett')
  if (letzterHarness === null) return
  const bausteine = Array.isArray(letzterHarness.bausteine) ? letzterHarness.bausteine : []
  const leer = harnessLeer(letzterHarness) ? `<div class="note amber harness-leer">${tHtml('harness.leer')}</div>` : ''
  ziel.innerHTML = `${leer}<div class="harness-wurzel"><span class="harness-wurzel-eyebrow">${tHtml('harness.wurzel.eyebrow')}</span><strong>${escapeHtml(letzterHarness.name ?? '')}</strong><span class="harness-wurzel-teile">${tHtml('harness.wurzel.teile')}</span></div>
    <div class="harness-spalten">${bausteine.map(spalteHtml).join('')}</div>`
}

/**
 * Kopf des Detailpanels: Eyebrow (Baustein · Art · nur lesend), Pfad, Kennzahlen.
 * @param treffer - findeHarnessEintrag
 * @param art - 'datei' | 'ordner'
 * @param meta - { groesse?, geaendert?, anzahl? }
 * @returns HTML
 */
function detailKopf(treffer, art, meta) {
  const geschuetzt = treffer.eintrag.geschuetzt === true
  const teile = [t(`harness.baustein.${BAUSTEIN_IDS.includes(treffer.baustein.id) ? treffer.baustein.id : 'unbekannt'}`), t(art === 'ordner' ? 'harness.art.ordner' : 'harness.art.datei'), t('harness.nurLesend')]
  const kennzahlen = [
    art === 'ordner' ? [t('harness.detail.anzahl'), Number.isInteger(meta.anzahl) ? formatiereZahl(meta.anzahl) : '—'] : [t('harness.detail.groesse'), groesseText(meta.groesse)],
    [t('harness.detail.geaendert'), zeitText(meta.geaendert)],
  ]
  const kommtZeile = (schluessel) => `<div><dt>${tHtml(schluessel)}</dt><dd>${kommtBadge()}</dd></div>`
  return `<div class="harness-detail-eyebrow${geschuetzt ? ' geschuetzt' : ''}">${geschuetzt ? SCHLOSS_SVG : ''}<span>${escapeHtml(teile.join(' · '))}</span></div>
    <h2 id="harness-detail-titel" class="harness-detail-pfad">${escapeHtml(auswahl.pfad)}</h2>
    <dl class="harness-detail-daten">${kennzahlen.map(([dt, dd]) => `<div><dt>${escapeHtml(dt)}</dt><dd>${escapeHtml(dd)}</dd></div>`).join('')}${kommtZeile('harness.detail.genutztVon')}${kommtZeile('harness.detail.vorlage')}</dl>`
}

/**
 * Fuß des Detailpanels: „Änderung vorschlagen“ (kommt), „In VS Code öffnen“, bei Bremsen der Satz
 * „Sichtbar, aber nicht direkt änderbar.“
 * @param geschuetzt - Bremse?
 * @returns HTML
 */
function detailFuss(geschuetzt) {
  const link = baueVsCodeLink(`${letzterHarness?.absoluterPfad ?? ''}/${auswahl.pfad}`)
  const vscode = link === null ? '' : `<a class="button" href="${escapeHtml(link)}">${tHtml('harness.vscode')}</a>`
  const satz = geschuetzt ? `<span class="harness-detail-satz">${tHtml('harness.nichtAenderbar')}</span>` : ''
  return `<div class="harness-detail-fuss">${kommtKnopf(t('harness.aenderungVorschlagen'))}${vscode}${satz}</div>`
}

/** Rendert das Detail eines Ordners (direkte Einträge; Dateien sind wieder öffenbar). @param treffer - findeHarnessEintrag */
function renderOrdnerDetail(treffer) {
  const e = treffer.eintrag
  const eintraege = Array.isArray(e.eintraege) ? e.eintraege : []
  const zeile = (k) => {
    const name = `${escapeHtml(k.name)}${k.art === 'ordner' ? '/' : ''}`
    if (k.art !== 'datei') return `<li><span class="harness-ordner-eintrag" data-art="${k.art === 'ordner' ? 'ordner' : 'sonstiges'}">${name}</span></li>`
    return `<li><button type="button" class="harness-ordner-eintrag" data-harness-pfad="${escapeHtml(`${e.pfad}/${k.name}`)}" data-harness-art="datei">${name}</button> <span class="harness-ordner-groesse">${escapeHtml(groesseText(k.groesse))}</span></li>`
  }
  const liste = eintraege.length === 0 ? `<p class="leer">${tHtml('harness.ordnerLeer')}</p>` : `<ul class="harness-ordner-liste">${eintraege.map(zeile).join('')}</ul>`
  const muster = typeof e.muster === 'string' ? `<p class="hinweis">${tHtml('harness.muster', {}, { muster: `<code>${escapeHtml(e.muster)}</code>` })}</p>` : ''
  const gekappt = e.gekappt === true ? `<p class="hinweis">${tHtml('harness.ordnerGekappt', { anzahl: eintraege.length, gesamt: e.anzahl })}</p>` : ''
  document.getElementById('harness-detail').innerHTML = `${detailKopf(treffer, 'ordner', { anzahl: e.anzahl, geaendert: e.geaendert })}${muster}${liste}${gekappt}${detailFuss(e.geschuetzt === true)}`
}

/**
 * Lädt und rendert das Detail einer Datei (lesend, gekappt). Überholschutz über detailAnfrage.
 * @param treffer - findeHarnessEintrag
 */
async function ladeDateiDetail(treffer) {
  const nummer = detailAnfrage
  const container = document.getElementById('harness-detail')
  const meta = treffer.datei ?? treffer.eintrag
  const geschuetzt = treffer.eintrag.geschuetzt === true
  const kopf = detailKopf(treffer, 'datei', { groesse: meta.groesse, geaendert: meta.geaendert })
  container.innerHTML = `${kopf}<p class="leer">${tHtml('werkstatt.laedt')}</p>${detailFuss(geschuetzt)}`
  let inhalt
  try {
    const antwort = await holeHarnessDatei(auswahl.pfad)
    if (nummer !== detailAnfrage) return
    if (antwort.status === 'ok') {
      const gekuerzt = antwort.gekuerzt === true ? `<p class="hinweis">${tHtml('harness.gekuerzt')}</p>` : ''
      inhalt = `<pre class="harness-detail-inhalt" tabindex="0" aria-label="${escapeHtml(t('harness.inhalt', { pfad: auswahl.pfad }))}">${escapeHtml(antwort.text ?? '')}</pre>${gekuerzt}`
    } else if (antwort.status === 'binaer') {
      inhalt = `<p class="hinweis">${tHtml('harness.binaer')}</p>`
    } else if (antwort.status === 'fehlt') {
      inhalt = `<div class="note amber">${tHtml('harness.dateiFehlt')}</div>`
    } else {
      inhalt = `<div class="note red">${tHtml('harness.dateiFehler', { grund: antwort.grund ?? '' })}</div>`
    }
  } catch (fehler) {
    if (nummer !== detailAnfrage) return
    const meldung = fehler instanceof Error ? fehler.message : String(fehler)
    // 400 heißt hier: der Pfad steht nicht (mehr) in der Liste des Servers — die Datei ist inzwischen weg.
    if (meldung.startsWith('400')) inhalt = `<div class="note amber">${tHtml('harness.dateiFehlt')}</div>`
    else {
      console.error('harness-aufbau: GET …/harness/datei fehlgeschlagen', fehler)
      inhalt = `<div class="note red">${tHtml('harness.dateiFehler', { grund: meldung })}</div>`
    }
  }
  container.innerHTML = `${kopf}${inhalt}${detailFuss(geschuetzt)}`
}

/**
 * Leerzustand des Detailpanels mit eigenem Bereichsnamen; ohne einen einzigen vorhandenen Ort ein Satz, der nicht
 * zu einer unmöglichen Wahl auffordert.
 */
function zeigeDetailLeer() {
  const container = document.getElementById('harness-detail')
  container.removeAttribute?.('aria-labelledby')
  container.setAttribute('aria-label', t('harness.detail'))
  const schluessel = letzterHarness !== null && harnessLeer(letzterHarness) ? 'harness.detailLeerOhneOrte' : 'harness.detailLeer'
  container.innerHTML = `<p class="leer harness-detail-leer">${tHtml(schluessel)}</p>`
}

/** Rendert das Detailpanel zur aktuellen Auswahl (Leerzustand ohne Auswahl oder bei verschwundenem Ort). */
function renderDetail() {
  const container = document.getElementById('harness-detail')
  const treffer = auswahl === null || letzterHarness === null ? null : findeHarnessEintrag(letzterHarness, auswahl.pfad)
  const lesbar = treffer !== null && treffer.eintrag.vorhanden === true && treffer.eintrag.status === 'ok'
  // Jede neue Darstellung macht eine noch laufende Dateianfrage ungültig — auch ein Ordner (sonst überschriebe
  // die späte Antwort einer zuvor gewählten Datei das Ordnerdetail).
  detailAnfrage++
  if (!lesbar) {
    auswahl = null
    zeigeDetailLeer()
    return
  }
  container.removeAttribute?.('aria-label')
  container.setAttribute('aria-labelledby', 'harness-detail-titel')
  if (auswahl.art === 'ordner' && treffer.datei === undefined) renderOrdnerDetail(treffer)
  else void ladeDateiDetail(treffer)
}

/**
 * Wählt einen Ort (Knoten oder Datei eines Ordners) und zeigt ihn im Detail.
 * @param pfad - repo-relativer Pfad
 * @param art - 'datei' | 'ordner'
 * @param fokus - true setzt den Fokus auf das Detail (Tastaturweg zum Inhalt)
 */
function waehleOrt(pfad, art, fokus = false) {
  auswahl = { pfad, art: art === 'ordner' ? 'ordner' : 'datei' }
  for (const knopf of document.querySelectorAll('#harness-skelett [data-harness-pfad]')) knopf.setAttribute('aria-pressed', String(knopf.dataset.harnessPfad === pfad))
  renderDetail()
  // Unter 1100 px steht das Detail unter dem Skelett — dorthin, sonst bliebe der Klick ohne sichtbare Antwort.
  const schmal = window.matchMedia?.('(max-width: 1100px)').matches === true
  if (fokus || schmal) document.getElementById('harness-detail').focus()
}

/**
 * Antwort von GET /api/harness darstellen; eine noch gültige Auswahl bleibt (frisch geladen).
 * @param harness - Projektion
 */
export function renderHarness(harness) {
  // Ein Körper ohne Bausteine passt nicht zum Vertrag — als Fehler zeigen (rendereQuelle), nicht als „kein Harness“.
  if (!Array.isArray(harness?.bausteine)) throw new Error('Antwort von GET …/harness ohne bausteine')
  letzterHarness = harness
  renderSkelett()
  renderDetail()
}

/**
 * Fehlerzustand des Registers (die Bibliothek bleibt davon unberührt).
 * @param grund - Fehlertext
 */
export function zeigeHarnessFehler(grund) {
  letzterHarness = null
  auswahl = null
  detailAnfrage++
  document.getElementById('harness-skelett').innerHTML = `<div class="note red">${tHtml('werkstatt.ladeFehler', { grund })}</div>`
  zeigeDetailLeer()
}

/** Ladezustand (Routeneintritt, Neu laden). */
export function zeigeHarnessLaedt() {
  document.getElementById('harness-skelett').innerHTML = `<p class="leer">${tHtml('werkstatt.laedt')}</p>`
}

/** Projektwechsel: Auswahl, letzte Antwort und Detail verwerfen (alles gehört zum alten Projekt). */
export function setzeHarnessZurueck() {
  auswahl = null
  letzterHarness = null
  detailAnfrage++
  zeigeDetailLeer()
}

/** Zuletzt geladene Antwort (für den Abgleich in der Capability Library) oder null. */
export function aktuellerHarness() {
  return letzterHarness
}

/**
 * Öffnet einen Ort im Detail (Link „Im Harness-Aufbau zeigen“ der Library).
 * @param pfad - Pfad eines Eintrags der Liste
 */
export function oeffneHarnessOrt(pfad) {
  const treffer = letzterHarness === null ? null : findeHarnessEintrag(letzterHarness, pfad)
  if (treffer === null) return
  waehleOrt(pfad, treffer.datei === undefined ? treffer.eintrag.art : 'datei', true)
}

/** Klick-Delegation für Skelett und Ordnerliste im Detail; einmalig beim Init. */
export function initHarnessAufbau() {
  const beiKlick = (ereignis) => {
    const knopf = ereignis.target instanceof Element ? ereignis.target.closest('[data-harness-pfad]') : null
    if (knopf === null) return
    // Aus der Ordnerliste heraus geht der Fokus ins Detail (der Knopf selbst wird ersetzt).
    waehleOrt(knopf.dataset.harnessPfad, knopf.dataset.harnessArt, knopf.classList.contains('harness-ordner-eintrag'))
  }
  document.getElementById('harness-skelett').addEventListener('click', beiKlick)
  document.getElementById('harness-detail').addEventListener('click', beiKlick)
}
