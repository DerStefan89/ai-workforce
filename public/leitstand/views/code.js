/**
 * Datei: public/leitstand/views/code.js
 *
 * Zweck: Entwicklung › Code `#/code` (F46 D4, Bild docs/design/neu/06-entwicklung-code--Main.webp,
 * docs/design/abgleich-f46.md §4.12 und §3 Schritt 7). Was sich im Repo geändert hat und wie Stefan es
 * im eigenen Terminal sichert — der Leitstand führt nichts davon aus.
 *
 * Drei Ebenen (Leitprinzip): Kopf mit Reiterzeile; „Arbeitsstand jetzt“ (Branch, Basis, Commits
 * voraus, Dateien nach Ordnern mit Art und Zeilen, Diff der gewählten Datei, „In VS Code öffnen“,
 * „Sichern“ mit echtem Befehlsblock), rechts „Commit-Freigabe“ und „Prüfstand“; darunter „Verlauf auf
 * main“ mit Zuordnung und Filter und „Später auf dieser Seite“.
 *
 * Datenquelle: GET …/code über code-stand.js (beim Betreten und per „Aktualisieren“, nie aus dem
 * Poll), der Diff über GET …/code/diff?pfad=… (nur bei Wahl einer Datei bzw. „Aktualisieren“).
 * „kommt“ (kommt.js): „Ins Terminal“ (E-F46-1), Prüfstand-Ergebnis, Tests und CI (F-962), „von dieser
 * Änderung berührt“, die vier Kacheln „Später auf dieser Seite“.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initCodeView beim Bootstrap)
 *
 * Wichtig:
 * - Git-Ausgaben, Pfade, Branch und Commit-Betreffe werden immer escaped; Pfade stehen nie roh in
 *   einem Attribut außer escaped in data-pfad.
 * - Jeder Bereich wird nur bei geändertem HTML neu geschrieben (Fokus bleibt).
 * - Keine eigene Live-Region (die einzige gehört der Persona).
 */

import { holeCodeDiff } from '../api.js'
import { kopiereBefehlsblock, renderBefehlsblock } from '../befehlsblock.js'
import { commitUrl, FREIGABE_MINUTEN, filtereVerlauf, freigabeZustand, gruppiereNachOrdner, nameVon, sicherBefehle, summeZeilen, verlaufArt, zerlegeAbstand } from '../code-daten.js'
import { abonniereCodeStand, aktuellerCodeStand, ladeCodeStand } from '../code-stand.js'
import { entwicklungsReiterHtml } from '../entwicklung-reiter.js'
import { formatiereDatum, formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { baueVsCodeLink, pruefeGithubUrl } from '../kopf-werkzeuge.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { abonniere } from '../zustand.js'
import { escapeHtml } from '../render.js'
import { registriere } from '../router.js'
import { oeffneEntwicklungsRegister } from './workboard.js'

/** Filter des Verlaufs in Anzeige-Reihenfolge. */
const VERLAUF_FILTER = ['alle', 'feature', 'fix', 'doku']

/** Kacheln „Später auf dieser Seite“ (abgleich-f46.md §4.12, §5 „Später“). */
const SPAETER = ['branches', 'lauf', 'karte', 'brennpunkte']

/** true, solange #/code sichtbar ist. */
let seiteAktiv = false

/** Gewählte Datei (Pfad) oder null. */
let gewaehlt = null

/** Diff der gewählten Datei: { pfad, zustand: 'laedt' | 'ok' | 'fehler', antwort, fehler } oder null. */
let diff = null

/** Überholschutz für Diff-Abrufe. */
let diffNummer = 0

/** Letztes aktiverLauf aus dem Poll (Hinweis in „Sichern“, kein Git). */
let aktiverLauf

/** Gewählter Filter des Verlaufs. */
let verlaufFilter = 'alle'

/** Zuletzt geschriebenes HTML je Bereich (Element-id → HTML). */
const letztesHtml = new Map()

/**
 * Schreibt innerHTML nur bei geändertem Inhalt.
 * @param id - Element-id
 * @param html - neuer Inhalt
 */
function schreibe(id, html) {
  if (letztesHtml.get(id) === html) return
  letztesHtml.set(id, html)
  const element = document.getElementById(id)
  const fokusSchluessel = document.activeElement !== null && element.contains(document.activeElement) ? fokusMerkmal(document.activeElement) : null
  element.innerHTML = html
  if (fokusSchluessel !== null) element.querySelector(fokusSchluessel)?.focus()
}

/**
 * Selektor, der dasselbe Bedienelement nach dem Neuschreiben wiederfindet (Datei, Filter, Kopieren).
 * @param element - fokussiertes Element
 * @returns Selektor oder null
 */
function fokusMerkmal(element) {
  if (element.dataset?.pfad !== undefined) return `[data-pfad="${CSS.escape(element.dataset.pfad)}"]`
  if (element.dataset?.verlaufFilter !== undefined) return `[data-verlauf-filter="${CSS.escape(element.dataset.verlaufFilter)}"]`
  if (element.hasAttribute?.('data-befehl-kopieren')) return '[data-befehl-kopieren]'
  return null
}

/**
 * Notiz für einen Feldfehler bzw. Hinweis.
 * @param ton - 'red' | 'amber'
 * @param titelSchluessel - Wörterbuchschlüssel des Titels
 * @param grund - Servertext oder null
 * @returns HTML
 */
function notiz(ton, titelSchluessel, grund) {
  return `<div class="note ${ton}"><strong>${tHtml(titelSchluessel)}</strong>${grund ? `<p><code>${escapeHtml(grund)}</code></p>` : ''}</div>`
}

/**
 * „Ins Terminal“ als „kommt“ (E-F46-1).
 * @returns HTML
 */
function insTerminal() {
  return kommtKnopf(t('code.insTerminal'))
}

// ─── Arbeitsstand ────────────────────────────────────────────────────────────

/**
 * Kopfzeile „Arbeitsstand jetzt“: Branch, Basis, Commits voraus/zurück, Summe.
 * @param daten - Antwort der Route
 * @returns HTML
 */
function standKopfHtml(daten) {
  const { branch, basis, dateien } = daten
  let branchHtml
  if (branch?.status !== 'ok') branchHtml = `<span class="code-branch" data-zustand="fehler">${tHtml('code.branch.fehler')}</span>`
  else if (branch.losgeloest) branchHtml = `<span class="code-branch"><code>${escapeHtml(branch.commit ?? '')}</code> ${tHtml('code.branch.losgeloest')}</span>`
  else branchHtml = `<span class="code-branch"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9" /></svg><code>${escapeHtml(branch.name)}</code></span>`
  let basisHtml
  if (basis?.status === 'ok') {
    const zurueck = basis.zurueck > 0 ? ` · ${tHtml('code.basis.zurueck', { anzahl: basis.zurueck, zahl: formatiereZahl(basis.zurueck) })}` : ''
    basisHtml = `<span class="subtle">${tHtml('code.basis.voraus', { ref: basis.ref, anzahl: basis.voraus, zahl: formatiereZahl(basis.voraus) })}${zurueck}</span>`
  } else {
    // Der Grund steht sichtbar daneben (nicht nur im title, Prüfpass dg 10).
    basisHtml = `<span class="subtle">${tHtml('code.basis.fehler')}${basis?.grund ? ` — <code>${escapeHtml(basis.grund)}</code>` : ''}</span>`
  }
  let summe = ''
  if (dateien?.status === 'ok' && dateien.anzahl > 0) {
    const { plus, minus } = summeZeilen(dateien.eintraege)
    summe = `<span class="code-summe">${tHtml('code.summe', { anzahl: dateien.anzahl, zahl: formatiereZahl(dateien.anzahl), plus: formatiereZahl(plus), minus: formatiereZahl(minus) })}</span>`
  }
  return `<div class="code-karte-kopf"><h2 id="code-stand-titel">${tHtml('code.stand.titel')}</h2>${branchHtml}${basisHtml}${summe}</div>`
}

/**
 * Eine Datei der Liste als Knopf (Art, Name, Zeilen).
 * @param datei - Eintrag der Route
 * @returns HTML
 */
function dateiKnopf(datei) {
  const art = ['A', 'M', 'D', 'R', '??'].includes(datei.art) ? datei.art : 'M'
  const artText = t(`code.art.${art === '??' ? 'neu' : art}`)
  const plus = typeof datei.plus === 'number' ? `<span class="code-plus">+${escapeHtml(formatiereZahl(datei.plus))}</span>` : ''
  const minus = typeof datei.minus === 'number' && datei.minus > 0 ? `<span class="code-minus">−${escapeHtml(formatiereZahl(datei.minus))}</span>` : ''
  const alt = datei.art === 'R' && datei.alterPfad ? ` title="${escapeHtml(`${datei.alterPfad} → ${datei.pfad}`)}"` : ` title="${escapeHtml(datei.pfad)}"`
  return `<button type="button" class="code-datei" data-pfad="${escapeHtml(datei.pfad)}" aria-pressed="${datei.pfad === gewaehlt}"${alt}>
      <span class="code-art" data-art="${art === '??' ? 'neu' : art}" aria-hidden="true">${escapeHtml(t(`code.art.kurz.${art === '??' ? 'neu' : art}`))}</span><span class="sr-only">${escapeHtml(artText)}:</span>
      <span class="code-datei-name">${escapeHtml(nameVon(datei.pfad))}</span>${plus}${minus}
    </button>`
}

/**
 * Dateiliste nach Ordnern.
 * @param dateien - Feld dateien (status ok)
 * @returns HTML
 */
function dateienHtml(dateien) {
  const gruppen = gruppiereNachOrdner(dateien.eintraege)
    .map(
      (g) => `<div class="code-gruppe" role="group" aria-label="${escapeHtml(g.ordner === '' ? t('code.ordner.wurzel') : g.ordner)}">
        <p class="code-ordner">${escapeHtml(g.ordner === '' ? t('code.ordner.wurzel') : g.ordner)}</p>
        ${g.dateien.map(dateiKnopf).join('')}
      </div>`
    )
    .join('')
  const gekappt = dateien.gekappt ? `<p class="subtle">${tHtml('code.dateien.gekappt', { zahl: formatiereZahl(dateien.eintraege.length), gesamt: formatiereZahl(dateien.anzahl) })}</p>` : ''
  return `<div class="code-dateien">${gruppen}${gekappt}</div>`
}

/**
 * Art einer Diff-Zeile.
 * @param zeile - Text
 * @returns 'plus' | 'minus' | 'hunk' | 'kopf' (Dateikopf, ausgeblendet — der Pfad steht im Kopf der Vorschau) | 'info' (neu, gelöscht, umbenannt, binär) | 'kontext'
 */
function diffArt(zeile) {
  if (zeile.startsWith('@@')) return 'hunk'
  if (/^(?:diff --git |index |--- |\+\+\+ )/.test(zeile)) return 'kopf'
  if (/^(?:new file mode|deleted file mode|similarity index|rename from|rename to|old mode|new mode|Binary files)/.test(zeile)) return 'info'
  if (zeile.startsWith('+')) return 'plus'
  if (zeile.startsWith('-')) return 'minus'
  return 'kontext'
}

/**
 * Diff-Vorschau der gewählten Datei (escaped, monospace) mit „In VS Code öffnen“.
 * @param daten - Antwort der Route
 * @returns HTML
 */
function diffHtml(daten) {
  if (gewaehlt === null) return `<div class="code-diff"><p class="subtle code-diff-leer">${tHtml('code.diff.keineWahl')}</p></div>`
  const datei = daten.dateien.eintraege.find((e) => e.pfad === gewaehlt)
  const vsLink = datei?.art !== 'D' && typeof daten.absoluterPfad === 'string' ? baueVsCodeLink(`${daten.absoluterPfad.replace(/[\\/]+$/, '')}/${gewaehlt}`) : null
  const vs =
    vsLink === null
      ? `<a class="button code-vscode" role="link" tabindex="0" aria-disabled="true" title="${tHtml(datei?.art === 'D' ? 'code.diff.geloescht' : 'kopf.vscodeOhne')}">${tHtml('code.diff.vscode')}</a>`
      : `<a class="button code-vscode" href="${escapeHtml(vsLink)}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /></svg>${tHtml('code.diff.vscode')}</a>`
  let inhalt
  if (gewaehlt.startsWith('-')) inhalt = `<p class="subtle code-diff-leer">${tHtml('code.diff.minus')}</p>`
  else if (diff === null || diff.pfad !== gewaehlt || diff.zustand === 'laedt') inhalt = `<p class="subtle code-diff-leer">${tHtml('code.diff.laedt')}</p>`
  else if (diff.zustand === 'fehler') inhalt = `<p class="fehler code-diff-leer">${tHtml('code.diff.fehler', { meldung: diff.fehler })}</p>`
  else if (diff.antwort.status !== 'ok') inhalt = `<p class="fehler code-diff-leer">${tHtml('code.diff.fehler', { meldung: diff.antwort.grund ?? diff.antwort.status })}</p>`
  else if (diff.antwort.text.trim() === '') inhalt = `<p class="subtle code-diff-leer">${tHtml('code.diff.leer')}</p>`
  else {
    const zeilen = diff.antwort.text
      .replace(/\n$/, '')
      .split('\n')
      .map((z) => ({ z, art: diffArt(z) }))
      .filter(({ art }) => art !== 'kopf')
    inhalt = `<pre class="code-diff-text"><code>${zeilen.map(({ z, art }) => `<span class="code-diff-zeile" data-art="${art}">${escapeHtml(z)}</span>`).join('')}</code></pre>${diff.antwort.gekuerzt ? `<p class="subtle code-diff-gekuerzt">${tHtml('code.diff.gekuerzt')}</p>` : ''}`
  }
  return `<div class="code-diff">
      <div class="code-diff-kopf"><code class="code-diff-pfad" title="${escapeHtml(gewaehlt)}">${escapeHtml(gewaehlt)}</code>${vs}</div>
      <div class="code-diff-inhalt" tabindex="0" role="region" aria-label="${tHtml('code.diff.region', { pfad: gewaehlt })}">${inhalt}</div>
    </div>`
}

/**
 * „Sichern“: Befehlsblock mit echten Dateien (code-daten.js sicherBefehle) oder ein Grund. Nach einem
 * gescheiterten Aktualisieren kein Befehl aus dem alten Stand (Prüfpass qa 5); läuft gerade ein Lauf,
 * ein Hinweis (aus dem Poll, Prüfpass qa 8).
 * @param daten - Antwort der Route
 * @param veraltet - true, wenn das letzte Aktualisieren scheiterte
 * @returns HTML
 */
function sichernHtml(daten, veraltet) {
  const befehle = sicherBefehle(daten, { veraltet })
  const block = befehle.zeilen ? renderBefehlsblock({ sprache: 'powershell', zeilen: befehle.zeilen }, { zusatzHtml: insTerminal(), echteWerte: true }) : `<p class="subtle code-sichern-grund">${tHtml(`code.sichern.grund.${befehle.grund}`)}</p>`
  const hinweise = (befehle.hinweise ?? []).map((h) => `<p class="subtle code-sichern-grund">${tHtml(`code.sichern.hinweis.${h}`)}</p>`).join('')
  const lauf = aktiverLauf?.aktiv === true ? `<div class="note amber"><p>${tHtml('code.sichern.laeuft')}</p></div>` : ''
  return `<div class="code-sichern">
      <div class="code-sichern-kopf"><h3>${tHtml('code.sichern.titel')}</h3><span class="subtle">${tHtml('code.sichern.hinweis')}</span></div>
      ${lauf}${block}${hinweise}
    </div>`
}

/**
 * Inhalt der Karte „Arbeitsstand jetzt“ je Zustand.
 * @param stand - Code-Stand
 * @returns HTML
 */
function standHtml(stand) {
  const daten = stand.daten
  if (daten === null) {
    if (stand.zustand === 'fehler') return `<h2 id="code-stand-titel">${tHtml('code.stand.titel')}</h2>${notiz('red', 'code.fehler.titel', stand.fehler)}`
    return `<h2 id="code-stand-titel">${tHtml('code.stand.titel')}</h2><p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  }
  if (daten.status !== 'ok') return `<h2 id="code-stand-titel">${tHtml('code.stand.titel')}</h2>${notiz('amber', 'code.nichtVerfuegbar', daten.grund ?? null)}`
  const dateien = daten.dateien
  let mitte
  if (dateien?.status !== 'ok') mitte = notiz('red', 'code.dateien.fehler', dateien?.grund ?? null)
  else if (dateien.eintraege.length === 0) mitte = `<p class="code-sauber">${tHtml('code.dateien.keine')}</p>`
  else mitte = `<div class="code-arbeitsstand">${dateienHtml(dateien)}${diffHtml(daten)}</div>`
  return `${standKopfHtml(daten)}${mitte}${sichernHtml(daten, stand.zustand === 'fehler')}`
}

// ─── Commit-Freigabe und Prüfstand ───────────────────────────────────────────

/**
 * Karte „Commit-Freigabe“ aus den Metadaten (Dateizeit; der Hook prüft den Zeitstempel in der Datei). Die
 * seit dem Laden vergangene Zeit zählt mit — jeder Poll-Tick zeichnet die Karte neu, ohne Git (Prüfpass qa 6).
 * @param daten - Antwort der Route oder null
 * @param geladenAm - Zeitpunkt der Daten (ms) oder null
 * @returns HTML
 */
function freigabeHtml(daten, geladenAm) {
  const vergangen = typeof geladenAm === 'number' ? (Date.now() - geladenAm) / 60000 : 0
  const zustand = daten === null ? { art: 'unbekannt' } : freigabeZustand(daten.freigabeCommit, vergangen)
  const chip = {
    gueltig: tHtml('code.freigabe.chip.gueltig', { anzahl: zustand.restMinuten ?? 0, zahl: formatiereZahl(zustand.restMinuten ?? 0) }),
    abgelaufen: tHtml('code.freigabe.chip.abgelaufen'),
    keine: tHtml('code.freigabe.chip.keine'),
    fehler: tHtml('code.freigabe.chip.fehler'),
    unbekannt: tHtml('entwicklung.laedt'),
  }[zustand.art]
  const text = {
    gueltig: tHtml('code.freigabe.text.gueltig', { anzahl: zustand.alterMinuten ?? 0, zahl: formatiereZahl(zustand.alterMinuten ?? 0) }),
    abgelaufen: tHtml('code.freigabe.text.abgelaufen', { anzahl: zustand.alterMinuten ?? 0, zahl: formatiereZahl(zustand.alterMinuten ?? 0) }),
    keine: tHtml('code.freigabe.text.keine'),
    fehler: tHtml('code.freigabe.text.fehler'),
    unbekannt: '',
  }[zustand.art]
  return `<div class="code-karte-kopf"><h2 id="code-freigabe-titel">${tHtml('code.freigabe.titel')}</h2><span class="code-status-chip" data-ton="${zustand.art}">${chip}</span></div>
    ${text ? `<p class="code-karte-text">${text}</p>` : ''}
    <dl class="code-felder">
      <dt>${tHtml('code.freigabe.datei')}</dt><dd><code>state/freigabe-commit.md</code></dd>
      <dt>${tHtml('code.freigabe.gilt')}</dt><dd>${tHtml('code.freigabe.giltWert', { zahl: formatiereZahl(FREIGABE_MINUTEN) })}</dd>
      <dt>${tHtml('code.freigabe.giltFuer')}</dt><dd>${tHtml('code.freigabe.giltFuerWert')}</dd>
    </dl>`
}

/**
 * Karte „Prüfstand“: Ergebnis, Tests, Prüfskripte, CI und „berührt“ kommen (F-962); der Prüfbefehl ist
 * echt (Startvorlage der Instanz).
 * @param daten - Antwort der Route oder null
 * @returns HTML
 */
function pruefstandHtml(daten) {
  const befehl = daten?.startvorlage?.status === 'ok' && typeof daten.startvorlage.pruefbefehl === 'string' ? daten.startvorlage.pruefbefehl : null
  const kachel = (schluessel) => `<div class="code-pruef-kachel"><span>${tHtml(`code.pruefstand.${schluessel}`)}</span>${kommtBadge()}</div>`
  const block = befehl === null ? `<p class="subtle">${daten === null ? tHtml('entwicklung.laedt') : tHtml('code.pruefstand.keinBefehl')}</p>` : renderBefehlsblock({ sprache: 'powershell', zeilen: [befehl] }, { zusatzHtml: insTerminal(), echteWerte: true })
  return `<div class="code-karte-kopf"><h2 id="code-pruefstand-titel">${tHtml('code.pruefstand.titel')}</h2>${kommtBadge()}</div>
    <p class="code-karte-text">${tHtml('code.pruefstand.text')}</p>
    <div class="code-pruef-kacheln">${kachel('tests')}${kachel('skripte')}${kachel('ci')}</div>
    <p class="code-eyebrow">${tHtml('code.pruefstand.beruehrt')} ${kommtBadge()}</p>
    ${block}`
}

// ─── Verlauf auf main ────────────────────────────────────────────────────────

/**
 * Nachricht ohne die Zuordnung, die als Chips daneben steht („F46 D3: “ vorn, „(#PR)“ hinten).
 * @param eintrag - Verlaufseintrag
 * @returns Text
 */
function nachrichtOhneZuordnung(eintrag) {
  let text = eintrag.betreff
  if (eintrag.zuordnung?.feature) text = text.replace(/^F\d+[a-z]?(?:\s+\S+)?\s*:\s*/, '')
  if (eintrag.zuordnung?.pr !== null && eintrag.zuordnung?.pr !== undefined) text = text.replace(/\s*\(#\d+\)\s*$/, '')
  return text === '' ? eintrag.betreff : text
}

/**
 * Karte „Verlauf auf main“.
 * @param daten - Antwort der Route oder null
 * @param remote - geprüfte GitHub-Adresse oder null
 * @returns HTML
 */
function verlaufHtml(daten, remote) {
  const verlauf = daten?.verlauf
  const filter = `<div class="code-verlauf-filter" role="group" aria-label="${tHtml('code.verlauf.filter')}">${VERLAUF_FILTER.map((f) => `<button type="button" class="filter-chip" data-verlauf-filter="${f}" aria-pressed="${f === verlaufFilter}">${tHtml(`code.verlauf.filter.${f}`)}</button>`).join('')}</div>`
  const kopf = `<div class="code-karte-kopf code-verlauf-kopf"><div><h2 id="code-verlauf-titel">${tHtml('code.verlauf.titel')}</h2><p class="subtle">${tHtml('code.verlauf.beschreibung')}${verlauf?.ref ? ` ${tHtml('code.verlauf.quelle', { ref: verlauf.ref })}` : ''}</p></div>${filter}</div>`
  if (daten === null) return `${kopf}<p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  if (daten.status !== 'ok') return `${kopf}<p class="subtle">${tHtml('code.nichtVerfuegbar')}</p>`
  if (verlauf?.status !== 'ok') return `${kopf}${notiz('red', 'code.verlauf.fehler', verlauf?.grund ?? null)}`
  const liste = filtereVerlauf(verlauf.eintraege, verlaufFilter)
  if (liste.length === 0) return `${kopf}<p class="leer">${tHtml(verlauf.eintraege.length === 0 ? 'code.verlauf.leer' : 'code.verlauf.keineTreffer')}</p>`
  const zeile = (e) => {
    const z = e.zuordnung ?? {}
    const chips = [z.feature ? `<span class="code-chip" data-art="feature">${escapeHtml(z.feature)}</span>` : '', z.ws ? `<span class="code-chip" data-art="ws">${escapeHtml(z.ws)}</span>` : '', typeof z.pr === 'number' ? `<span class="code-chip" data-art="pr">#${escapeHtml(z.pr)}</span>` : ''].join('')
    const abstand = zerlegeAbstand(e.abstandMinuten)
    const abstandText = abstand === null ? '–' : tHtml('code.verlauf.abstandWert', { stunden: abstand.stunden, minuten: String(abstand.minuten).padStart(2, '0') })
    const link = commitUrl(remote, e.hash)
    const zeit = formatiereDatum(e.zeit, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    return `<tr data-art="${verlaufArt(e)}">
        <td data-label="${tHtml('code.verlauf.spalte.commit')}"><code class="code-hash">${escapeHtml(e.kurz)}</code></td>
        <td class="subtle" data-label="${tHtml('code.verlauf.spalte.zeit')}">${escapeHtml(zeit)}</td>
        <td class="code-nachricht" title="${escapeHtml(e.betreff)}">${escapeHtml(nachrichtOhneZuordnung(e))}</td>
        <td data-label="${tHtml('code.verlauf.spalte.zuordnung')}"><span class="code-chips">${chips || '–'}</span></td>
        <td data-label="${tHtml('code.verlauf.spalte.abstand')}">${abstandText}</td>
        <td>${link === null ? '' : `<a class="text-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${tHtml('code.verlauf.github')}<span class="sr-only"> ${escapeHtml(e.kurz)}</span></a>`}</td>
      </tr>`
  }
  return `${kopf}<div class="code-tabelle-rahmen" role="region" tabindex="0" aria-label="${tHtml('code.verlauf.titel')}"><table class="code-verlauf-tabelle">
      <thead><tr><th scope="col">${tHtml('code.verlauf.spalte.commit')}</th><th scope="col">${tHtml('code.verlauf.spalte.zeit')}</th><th scope="col">${tHtml('code.verlauf.spalte.nachricht')}</th><th scope="col">${tHtml('code.verlauf.spalte.zuordnung')}</th><th scope="col">${tHtml('code.verlauf.spalte.abstand')}</th><th scope="col"><span class="sr-only">${tHtml('code.verlauf.github')}</span></th></tr></thead>
      <tbody>${liste.map(zeile).join('')}</tbody>
    </table></div>`
}

/** @returns HTML der Kacheln „Später auf dieser Seite“ (alle „kommt“). */
function spaeterHtml() {
  return `<h2 id="code-spaeter-titel">${tHtml('code.spaeter.titel')}</h2>
    <div class="code-spaeter-kacheln">${SPAETER.map((k) => `<div class="code-spaeter-kachel"><p class="code-spaeter-kopf"><span>${tHtml(`code.spaeter.${k}.titel`)}</span>${kommtBadge()}</p><p class="subtle">${tHtml(`code.spaeter.${k}.text`)}</p></div>`).join('')}</div>`
}

// ─── Laden und Rendern ───────────────────────────────────────────────────────

/** Zeichnet alle Bereiche aus dem aktuellen Code-Stand. */
function render() {
  const stand = aktuellerCodeStand()
  const daten = stand.daten
  // Die gewählte Datei bleibt, solange sie in der Liste steht; sonst die erste.
  const eintraege = daten?.status === 'ok' && daten.dateien?.status === 'ok' ? daten.dateien.eintraege : []
  if (!eintraege.some((e) => e.pfad === gewaehlt)) {
    gewaehlt = eintraege[0]?.pfad ?? null
    if (gewaehlt !== null && !gewaehlt.startsWith('-')) void ladeDiff(gewaehlt)
  }
  const hinweis = stand.zustand === 'fehler' && daten !== null ? notiz('red', 'code.fehler.veraltet', stand.fehler) : stand.zustand === 'laedt' && daten !== null ? `<p class="subtle code-laedt">${tHtml('code.aktualisiert')}</p>` : ''
  schreibe('code-hinweis', hinweis)
  schreibe('code-stand', standHtml(stand))
  schreibe('code-freigabe', freigabeHtml(daten, stand.geladenAm))
  schreibe('code-pruefstand', pruefstandHtml(daten))
  schreibe('code-verlauf', verlaufHtml(daten, pruefeGithubUrl(daten?.remoteWebUrl?.url ?? null)))
}

/**
 * Lädt den Diff einer Datei (Überholschutz).
 * @param pfad - Pfad aus der aktuellen Liste
 */
async function ladeDiff(pfad) {
  const nummer = ++diffNummer
  diff = { pfad, zustand: 'laedt', antwort: null, fehler: null }
  try {
    const antwort = await holeCodeDiff(pfad)
    if (nummer !== diffNummer) return
    diff = { pfad, zustand: 'ok', antwort, fehler: null }
  } catch (fehler) {
    if (nummer !== diffNummer) return
    console.error('GET …/code/diff fehlgeschlagen:', fehler)
    diff = { pfad, zustand: 'fehler', antwort: null, fehler: fehler instanceof Error ? fehler.message : String(fehler) }
  }
  if (seiteAktiv) render()
}

/** Betreten bzw. „Aktualisieren“: Stand neu laden, danach den Diff der gewählten Datei. */
async function ladeNeu() {
  diffNummer++
  diff = null
  render()
  await ladeCodeStand({ neu: true })
  if (gewaehlt !== null && !gewaehlt.startsWith('-') && (diff === null || diff.pfad !== gewaehlt)) void ladeDiff(gewaehlt)
}

/** Klick-Delegation der Seite: Reiter, Dateien, Filter, Kopieren, Aktualisieren. */
function initBedienung() {
  const seite = document.getElementById('view-code')
  seite.addEventListener('click', (ereignis) => {
    const reiter = ereignis.target.closest('#code-tabs [data-tab]')
    if (reiter !== null) {
      oeffneEntwicklungsRegister(reiter.dataset.tab)
      return
    }
    const datei = ereignis.target.closest('[data-pfad]')
    if (datei !== null) {
      if (datei.dataset.pfad === gewaehlt) return
      gewaehlt = datei.dataset.pfad
      // Ein Name mit führendem „-“ bekommt keinen Diff (der Server lehnt ihn als möglichen Git-Schalter ab).
      if (!gewaehlt.startsWith('-')) void ladeDiff(gewaehlt)
      render()
      return
    }
    const filter = ereignis.target.closest('[data-verlauf-filter]')
    if (filter !== null) {
      verlaufFilter = filter.dataset.verlaufFilter
      render()
      return
    }
    const kopieren = ereignis.target.closest('[data-befehl-kopieren]')
    if (kopieren !== null) {
      void kopiereBefehlsblock(kopieren)
      return
    }
    if (ereignis.target.closest('#code-aktualisieren') !== null) void ladeNeu()
  })
}

/** Bootstrap: Route #/code, Abos auf Code-Stand und Projektwechsel. */
export function initCodeView() {
  initBedienung()
  // Feste Teile einmal (ein Sprachwechsel lädt die Seite neu, i18n.js setzeSprache).
  document.getElementById('code-tabs').innerHTML = entwicklungsReiterHtml('code')
  schreibe('code-spaeter', spaeterHtml())
  registriere(/^#\/code$/, 'code', () => {
    seiteAktiv = true
    // Kam der Wechsel über den Reiter „Code“ auf #/workboard, liegt der Fokus jetzt in einer verborgenen
    // Ansicht — er geht auf den Reiter „Code“ dieser Seite (Prüfpass qa 7).
    if ((document.activeElement?.closest?.('#workboard-tabs') ?? null) !== null) document.querySelector('#code-tabs [aria-current="page"]')?.focus()
    void ladeNeu()
  })
  // Poll-Abo ohne Git: laufender Lauf (Hinweis in „Sichern“) und die ablaufende Commit-Freigabe.
  abonniere((zustand) => {
    aktiverLauf = zustand?.aktiverLauf
    if (seiteAktiv) render()
  })
  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      if (document.getElementById('view-code').hidden) seiteAktiv = false
    }, 0)
  })
  abonniereCodeStand(() => {
    if (seiteAktiv) render()
  })
  abonniereProjektWechsel(() => {
    gewaehlt = null
    diffNummer++
    diff = null
    verlaufFilter = 'alle'
    letztesHtml.clear()
  })
}
