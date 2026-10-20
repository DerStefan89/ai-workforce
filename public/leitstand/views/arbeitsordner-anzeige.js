/**
 * Datei: public/leitstand/views/arbeitsordner-anzeige.js
 *
 * Zweck: Anzeige des eigenen Arbeitsordners je Ablauf (F45 B1a-1, E-F45-3 = A, F-954): jeder schreibende Ablauf
 * arbeitet in einem eigenen Git-Worktree `<Projektordner>-laeufe/<Kurzname>` (Hash der Ablauf-ID) auf dem Branch
 * `wf/<Ablauf-ID>`. Die Karte steht auf der Freigabe- und der Abnahme-Seite (dort mit Löschliste und dem Abschnitt „Bereit
 * zum Sichern“, F45 B2b-4a-2b-2) und auf der Ablaufseite eines beendeten Ablaufs (Abschnitt; Aufräumen unter den Aktionen).
 * - renderArbeitsordnerKarte: Karte „Wo gearbeitet wird“ auf der Freigabe-Seite (Branch, Arbeitsordner,
 *   Basis-Commit, offene Änderungen des Projektordners — blockieren nicht) mit allen Zuständen (nicht angelegt,
 *   wird vorbereitet, bereit, fehlgeschlagen, aufgeräumt, Bestand).
 * - renderArbeitsordnerAktion: Zeile unter den Aktionen des Ablaufs mit Status und dem Knopf „Arbeitsordner
 *   aufräumen“ (nur bei beendetem Ablauf oder fehlgeschlagener Vorbereitung).
 * - renderAufraeumenDialog: Dialog mit Pflichtbegründung und ausdrücklichem „Änderungen verwerfen“.
 * - umgebungArbeitsordnerZeile: Zeile für „Wo gearbeitet wird“ in „Auftrag anlegen“ (Muster vor dem Start).
 * - renderArbeitsordnerListe: lesende Liste aller Arbeitsordner auf der Seite Code.
 *
 * Reine Funktionen: kein fetch, kein DOM. Quellen: Feld `arbeitsordner` von GET /api/workflows/<id> (nur aus dem
 * Kontrollzustand), die Leseroute GET …/code (code-stand.js) für die offenen Änderungen des Projektordners und
 * GET …/arbeitsordner für die Liste.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflow-entscheiden.js, public/leitstand/views/workflows.js,
 *   public/leitstand/views/workflow-eingriffe.js, public/leitstand/views/auftrag-umgebung.js,
 *   public/leitstand/views/code.js
 * - public/leitstand/views/ablauf-sichern-anzeige.js (aufraeumenMoeglich: Aufräumen-Element des Abschnitts „Bereit zum Sichern“)
 * - public/leitstand/views/arbeitsordner-anzeige.test.mjs (node:test)
 *
 * Wichtig: Pfade, Branches, Commits und Gründe sind Server- bzw. Projektinhalte und werden escaped; alle übrigen
 * Texte über t()/tHtml(). Lange Pfade brechen um (Klasse arbeitsordner-pfad).
 */

import { formatiereZahl, t, tHtml } from '../i18n.js'
import { escapeHtml } from '../render.js'
import { dialogKopf } from './workflow-eingriffe.js'

/**
 * Kürzt einen Servertext für Listen (Design-Prüfung B1a-1, Befund 7); der volle Text steht im Ablauf.
 * @param text - Text
 * @param max - Höchstlänge
 * @returns Text, ggf. mit „…“
 */
function kuerze(text, max) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Workflow-Status, in denen ein Ablauf beendet ist (Aufräumen erlaubt). */
const BEENDET = new Set(['ABGESCHLOSSEN', 'GESTOPPT'])

/**
 * Kurzform eines Commit-Hashs.
 * @param hash - Commit oder null
 * @returns 7 Zeichen oder null
 */
export function kurzCommit(hash) {
  return typeof hash === 'string' && hash.length >= 7 ? hash.slice(0, 7) : null
}

/**
 * Muster des Arbeitsordners vor dem Start: `<Projektordner>-laeufe/<Ablauf-ID>` im Trenner des Pfads.
 * @param projektPfad - absoluter Projektordner (GET …/code absoluterPfad) oder null
 * @returns { pfad, branch } oder null ohne Projektpfad
 */
export function arbeitsordnerMuster(projektPfad) {
  if (typeof projektPfad !== 'string' || projektPfad.trim() === '') return null
  const ohneEnde = projektPfad.replace(/[\\/]+$/, '')
  const trenner = ohneEnde.includes('\\') ? '\\' : '/'
  // Der Ordner heißt nach einem kurzen Hash der Ablauf-ID (F-1025, Windows-Pfadgrenze), der Branch nach der ID selbst.
  return { pfad: `${ohneEnde}-laeufe${trenner}<${t('arbeitsordner.platzhalterKurz')}>`, branch: `wf/<${t('arbeitsordner.platzhalterId')}>` }
}

/**
 * Text der offenen Änderungen des Projektordners aus dem Code-Stand.
 * @param codeStand - aktuellerCodeStand() oder null
 * @returns { zustand: 'ok'|'laedt'|'fehler'|'leer', text }
 */
export function projektAenderungenText(codeStand) {
  const dateien = codeStand?.daten?.dateien
  if (dateien?.status === 'ok' && typeof dateien.anzahl === 'number') {
    return { zustand: 'ok', text: t('arbeitsordner.projektAenderungen', { anzahl: dateien.anzahl, zahl: formatiereZahl(dateien.anzahl) }) }
  }
  if (codeStand?.zustand === 'laedt') return { zustand: 'laedt', text: t('arbeitsordner.projektLaedt') }
  if (codeStand?.zustand === 'fehler' || (dateien !== undefined && dateien?.status !== 'ok')) return { zustand: 'fehler', text: t('arbeitsordner.projektNichtLesbar') }
  return { zustand: 'leer', text: t('arbeitsordner.projektLaedt') }
}

/**
 * Lagetext eines Arbeitsordners.
 * @param ao - Feld arbeitsordner aus GET /api/workflows/<id>
 * @returns { art: 'info'|'laedt'|'ok'|'fehler', text }
 */
export function arbeitsordnerLage(ao) {
  if (ao === null || ao === undefined || ao.status === 'kein_bedarf') return { art: 'info', text: t('arbeitsordner.lage.keinBedarf') }
  if (ao.status === 'bestand') return { art: 'info', text: t('arbeitsordner.lage.bestand') }
  if (ao.status === 'fehlt') return { art: 'info', text: t('arbeitsordner.lage.fehlt') }
  if (ao.vorbereitungLaeuft === true || ao.status === 'IN_VORBEREITUNG') return { art: 'laedt', text: t('arbeitsordner.lage.vorbereitung') }
  if (ao.status === 'BEREIT') {
    const npm = ao.vorbereitung?.npm_ci
    return { art: 'ok', text: npm?.ergebnis === 'OK' ? t('arbeitsordner.lage.bereitNpm', { sekunden: formatiereZahl(Math.round((npm.dauer_ms ?? 0) / 1000)) }) : t('arbeitsordner.lage.bereit') }
  }
  if (ao.status === 'FEHLGESCHLAGEN') return { art: 'fehler', text: t('arbeitsordner.lage.fehlgeschlagen', { grund: ao.grund ?? '–' }) }
  if (ao.status === 'ENTFERNT') {
    const branch = ao.aufraeumen?.branch_geloescht === true ? t('arbeitsordner.lage.branchGeloescht') : t('arbeitsordner.lage.branchBleibt')
    return { art: 'info', text: t('arbeitsordner.lage.entfernt', { branch }) }
  }
  return { art: 'info', text: String(ao.status ?? '–') }
}

/**
 * Eine Kennzahl der Karte (dieselbe Form wie die Kennzahlen der Freigabe).
 * @param schluessel - i18n-Schlüssel der Beschriftung
 * @param wertHtml - fertiges HTML
 * @returns HTML
 */
function kennzahl(schluessel, wertHtml) {
  return `<div class="entscheiden-kennzahl"><dt>${tHtml(schluessel)}</dt><dd>${wertHtml}</dd></div>`
}

/**
 * Zusammenfassung der geprüften Löschliste (F-715) mit allen abgelehnten Pfaden und Gründen.
 * @param loeschliste - aenderungsuebersicht.daten.loeschliste oder null
 * @returns HTML oder ''
 */
function loeschlisteHtml(loeschliste) {
  if (loeschliste === null || loeschliste === undefined) return ''
  const geloescht = Array.isArray(loeschliste.geloescht) ? loeschliste.geloescht : []
  const abgelehnt = Array.isArray(loeschliste.abgelehnt) ? loeschliste.abgelehnt : []
  const kopf = `<p class="subtle">${tHtml('arbeitsordner.loeschliste.zusammenfassung', { geloescht: formatiereZahl(geloescht.length), abgelehnt: formatiereZahl(abgelehnt.length) })}</p>`
  if (abgelehnt.length === 0) return kopf
  const zeilen = abgelehnt.map((e) => `<li><code class="arbeitsordner-pfad">${escapeHtml(e.pfad)}</code> — ${escapeHtml(e.grund)}</li>`).join('')
  return `${kopf}<ul class="arbeitsordner-abgelehnt fehler">${zeilen}</ul>`
}

/**
 * Karte „Wo gearbeitet wird“ (Freigabe- und Abnahme-Seite). Leer, wenn der Ablauf keinen Arbeitsordner braucht.
 * @param ao - Feld arbeitsordner aus GET /api/workflows/<id> (oder undefined bei älterem Server)
 * @param codeStand - aktuellerCodeStand() (offene Änderungen und HEAD des Projektordners)
 * @param kontext - { workflowId, workflowStatus, abnahmeOffen, loeschliste, sichernHtml, ohneKnopf } — optional (Abnahme-Seite).
 *   F45 B2b-4a-2b-2: sichernHtml = fertiger Abschnitt „Bereit zum Sichern“ bzw. Satz (views/ablauf-sichern-anzeige.js) in der Karte
 *   (kein zweiter Block); ohneKnopf = true lässt den Kartenknopf „Arbeitsordner aufräumen“ weg — dann steht er nur unter den
 *   Aktionen, der Abschnitt verweist darauf (genau ein Aufräumen je Seite, V3).
 * @returns HTML oder ''
 */
export function renderArbeitsordnerKarte(ao, codeStand, kontext = {}) {
  if (ao === null || ao === undefined || ao.status === 'kein_bedarf') return ''
  const lage = arbeitsordnerLage(ao)
  const projekt = projektAenderungenText(codeStand)
  const pfad = typeof ao.pfad === 'string' ? `<code class="arbeitsordner-pfad">${escapeHtml(ao.pfad)}</code>` : '–'
  const branch = typeof ao.branch === 'string' ? `<code>${escapeHtml(ao.branch)}</code>` : '–'
  const kopf = kurzCommit(codeStand?.daten?.branch?.commit ?? null)
  const basis =
    kurzCommit(ao.basis_commit) !== null
      ? `<code>${escapeHtml(kurzCommit(ao.basis_commit))}</code>`
      : `${tHtml('arbeitsordner.basisBeimStart')}${kopf !== null ? ` · <code>${escapeHtml(kopf)}</code>` : ''}`
  const istBestand = ao.status === 'bestand'
  const kennzahlen = istBestand
    ? kennzahl('arbeitsordner.projektordner', `<span class="${projekt.zustand === 'fehler' ? 'fehler' : ''}">${escapeHtml(projekt.text)}</span>`)
    : [
        kennzahl('arbeitsordner.branch', branch),
        kennzahl('arbeitsordner.ordner', pfad),
        kennzahl('arbeitsordner.basis', basis),
        kennzahl('arbeitsordner.projektordner', `<span class="${projekt.zustand === 'fehler' ? 'fehler' : ''}">${escapeHtml(projekt.text)}</span>`),
      ].join('')
  const lageKlasse = lage.art === 'fehler' ? 'fehler' : 'subtle'
  // Keine Live-Region (Design-Prüfung B1a-1, Befund 1): die Karte wird bei jedem Poll neu gezeichnet.
  const naechster = ao.status === 'FEHLGESCHLAGEN' ? `<p class="subtle">${tHtml('arbeitsordner.naechsterSchritt.fehlgeschlagen')}</p>` : ''
  const sichern = typeof kontext.sichernHtml === 'string' ? kontext.sichernHtml : ''
  const knopf =
    kontext.ohneKnopf !== true && typeof kontext.workflowId === 'string' && aufraeumenMoeglich(kontext.workflowStatus, ao, kontext.abnahmeOffen === true)
      ? `<div class="action-row"><button type="button" class="button wf-aktion" data-aktion="aufraeumen-oeffnen" data-workflow-id="${escapeHtml(kontext.workflowId)}" aria-haspopup="dialog">${tHtml('arbeitsordner.aufraeumen.knopf')}</button></div>`
      : ''
  return `<section class="entscheiden-karte arbeitsordner-karte" aria-labelledby="freigabe-arbeitsordner">
    <h2 id="freigabe-arbeitsordner">${tHtml('arbeitsordner.titel')}</h2>
    <dl class="entscheiden-kennzahlen">${kennzahlen}</dl>
    <p class="${lageKlasse} arbeitsordner-lage">${escapeHtml(lage.text)}</p>
    ${naechster}${loeschlisteHtml(kontext.loeschliste ?? null)}
    ${istBestand ? '' : `<p class="subtle">${tHtml('arbeitsordner.hinweisUnabhaengig')}</p>`}
    ${sichern}${knopf}
  </section>`
}

/**
 * true, wenn „Arbeitsordner aufräumen“ angeboten wird: Ordner vorhanden (nicht entfernt, nicht in Vorbereitung)
 * und Ablauf beendet (bei ABGESCHLOSSEN erst nach entschiedener Abnahme — das Ergebnis liegt nur im Arbeitsordner)
 * oder Vorbereitung fehlgeschlagen. Dieselbe Regel wie der Server (scripts/leitstand/routen-arbeitsordner.mjs).
 * @param workflowStatus - daten.status
 * @param ao - Feld arbeitsordner
 * @param abnahmeOffen - true, solange die Abnahme eines ABGESCHLOSSENEN Ablaufs nicht entschieden ist
 * @returns boolean
 */
export function aufraeumenMoeglich(workflowStatus, ao, abnahmeOffen = false) {
  if (ao === null || ao === undefined || ao.vorbereitungLaeuft === true) return false
  if (ao.status === 'FEHLGESCHLAGEN') return true
  if (ao.status !== 'BEREIT' || !BEENDET.has(workflowStatus)) return false
  return !(workflowStatus === 'ABGESCHLOSSEN' && abnahmeOffen)
}

/**
 * Zeile unter den Aktionen des Ablaufs: Lage des Arbeitsordners und ggf. „Arbeitsordner aufräumen“.
 * @param workflowId - Kennung
 * @param workflowStatus - daten.status
 * @param ao - Feld arbeitsordner
 * @param abnahmeOffen - true, solange die Abnahme eines ABGESCHLOSSENEN Ablaufs nicht entschieden ist
 * @returns HTML oder '' ohne Arbeitsordner
 */
export function renderArbeitsordnerAktion(workflowId, workflowStatus, ao, abnahmeOffen = false) {
  if (ao === null || ao === undefined || ao.status === 'kein_bedarf') return ''
  const lage = arbeitsordnerLage(ao)
  const ort = typeof ao.pfad === 'string' && ao.status !== 'bestand' ? ` <code class="arbeitsordner-pfad">${escapeHtml(ao.pfad)}</code>` : ''
  const knopf = aufraeumenMoeglich(workflowStatus, ao, abnahmeOffen)
    ? `<button type="button" class="button wf-aktion" data-aktion="aufraeumen-oeffnen" data-workflow-id="${escapeHtml(workflowId)}" aria-haspopup="dialog">${tHtml('arbeitsordner.aufraeumen.knopf')}</button>`
    : ''
  return `<div class="arbeitsordner-aktion">
    <p class="${lage.art === 'fehler' ? 'fehler' : 'subtle'}"><strong>${tHtml('arbeitsordner.titel')}:</strong> ${escapeHtml(lage.text)}${ort}</p>
    ${knopf === '' ? '' : `<div class="action-row">${knopf}</div>`}
  </div>`
}

/**
 * Dialog „Arbeitsordner aufräumen“: Pflichtbegründung, „Änderungen verwerfen“ nur ausdrücklich.
 * @param detail - { workflowId, arbeitsordner }
 * @returns HTML oder null ohne aufräumbaren Ordner
 */
export function renderAufraeumenDialog(detail) {
  const ao = detail?.arbeitsordner
  if (ao === null || ao === undefined || typeof ao.pfad !== 'string') return null
  return `${dialogKopf('arbeitsordner.aufraeumen.titel')}
    <p class="subtle">${tHtml('arbeitsordner.aufraeumen.text')}</p>
    <p><code class="arbeitsordner-pfad">${escapeHtml(ao.pfad)}</code> · <code>${escapeHtml(ao.branch ?? '')}</code></p>
    <label class="field" for="wf-aufraeumen-begruendung">${tHtml('arbeitsordner.aufraeumen.begruendung')}</label>
    <textarea id="wf-aufraeumen-begruendung" rows="3" aria-required="true" aria-describedby="workflow-dialog-meldung"></textarea>
    <label class="check"><input type="checkbox" id="wf-aufraeumen-verwerfen" /><span>${tHtml('arbeitsordner.aufraeumen.verwerfen')}<br /><span class="subtle">${tHtml('arbeitsordner.aufraeumen.verwerfenHinweis')}</span></span></label>
    <div class="dialog-actions"><button type="button" class="button wf-dialog-abbrechen">${tHtml('ablauf.dialog.abbrechen')}</button><button type="button" class="button danger wf-aktion" data-aktion="aufraeumen" data-workflow-id="${escapeHtml(detail.workflowId)}">${tHtml('arbeitsordner.aufraeumen.bestaetigen')}</button></div>
    <p id="workflow-dialog-meldung" class="fehler" tabindex="-1" hidden></p>`
}

/**
 * Zeile „Eigener Arbeitsordner je Ablauf“ für „Wo gearbeitet wird“ in „Auftrag anlegen“.
 * @param codeDaten - Antwort von GET …/code oder null
 * @param codeStand - aktuellerCodeStand() (Ladezustand der offenen Änderungen)
 * @returns { muster: { pfad, branch } | null, basis: string | null, aenderungen: { zustand, text } }
 */
export function umgebungArbeitsordnerZeile(codeDaten, codeStand) {
  return {
    muster: arbeitsordnerMuster(codeDaten?.absoluterPfad ?? null),
    basis: kurzCommit(codeDaten?.branch?.commit ?? null),
    aenderungen: projektAenderungenText(codeStand),
  }
}

/**
 * Lesende Liste aller Arbeitsordner des Projekts (Seite Code).
 * @param zustand - { zustand: 'laedt'|'ok'|'fehler', daten: { arbeitsordner: [...] } | null, fehler }
 * @returns HTML
 */
export function renderArbeitsordnerListe(zustand) {
  const kopf = `<h2 id="code-arbeitsordner-titel">${tHtml('arbeitsordner.liste.titel')}</h2>`
  if (zustand?.zustand === 'laedt' && zustand.daten === null) return `${kopf}<p class="subtle">${tHtml('arbeitsordner.liste.laedt')}</p>`
  if (zustand?.zustand === 'fehler') return `${kopf}<p class="fehler">${escapeHtml(t('arbeitsordner.liste.fehler', { meldung: zustand.fehler ?? '' }))}</p>`
  const liste = Array.isArray(zustand?.daten?.arbeitsordner) ? zustand.daten.arbeitsordner : []
  if (liste.length === 0) return `${kopf}<p class="subtle">${tHtml('arbeitsordner.liste.leer')}</p>`
  const zeilen = liste
    .map((e) => {
      const lage = arbeitsordnerLage({ status: e.status, grund: e.grund, aufraeumen: null })
      return `<li class="arbeitsordner-eintrag">
        <a href="#/workflows/${encodeURIComponent(e.workflowId)}"><code>${escapeHtml(e.branch ?? e.workflowId)}</code></a>
        <span class="${lage.art === 'fehler' ? 'fehler' : 'subtle'}">${escapeHtml(kuerze(e.status === 'ENTFERNT' ? t('arbeitsordner.liste.entfernt') : lage.text, 240))}</span>
        ${e.status === 'ENTFERNT' ? '' : `<code class="arbeitsordner-pfad">${escapeHtml(e.pfad ?? '')}</code>`}
        ${e.status !== 'ENTFERNT' && e.ordnerVorhanden === false ? `<span class="fehler">${tHtml('arbeitsordner.liste.ordnerFehlt')}</span>` : ''}
      </li>`
    })
    .join('')
  return `${kopf}<ul class="arbeitsordner-liste">${zeilen}</ul>`
}
