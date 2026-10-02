/**
 * Datei: public/leitstand/views/workflow-entscheiden.js
 *
 * Zweck: Seite Entscheiden `#/workflows/<id>` (F46 D2, Bilder 09-entscheidungen--Entscheiden und
 * --Entscheiden-Abnahme, docs/design/abgleich-f46.md §4.5). Je nach Zustand zeigt die Seite die
 * Freigabe oder die Abnahme — ohne Umschalter (der Umschalter der Vorlage ist E). Dieses Modul
 * bestimmt den Modus und baut Kopf und Freigabe-Teil; den Abnahme-Teil baut views/workflow-abnahme.js
 * (renderAbnahmeSeite, renderAbnahmePanel).
 *
 * Freigabe (naechster.art haltFreigabe bei gültiger Fassung): „Was startet, wenn du freigibst“ (die
 * Schritte in Planreihenfolge mit Rolle und Worker, der fällige Schritt markiert), Werkzeugsatz und
 * Zeitgrenze des fälligen Schritts, sein Risiko; Kontrolltiefe („kommt“, F-372: das Router-Ergebnis hat
 * keinen Lesepfad) und Schätzung („kommt“, Fixpaket B5); „Arbeitspaket“ („kommt“, Fixpaket B2);
 * „Empfehlung zu Fähigkeiten“ (F36, die Katalog-Empfehlung des Details, nur lesend); rechts „Deine
 * Entscheidung“ mit Freigeben · Freigeben & installieren · Ablehnen.
 *
 * Reine Funktionen: kein fetch, kein DOM. Die Entscheidung selbst läuft unverändert über die
 * bestehenden Wege in views/workflows.js: „<Option> bestätigen“ öffnet den Freigabedialog (Kennzeichen
 * beim Öffnen, „Anzeige = Start“, Ablehnen im selben Dialog als Veto); „Freigeben & installieren“
 * führt zu den Installationsknöpfen dieses Dialogs (F36 WS-5a).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js
 * - public/leitstand/views/workflow-entscheiden.test.mjs (node:test)
 *
 * Wichtig: Servertexte (ziel, risiko, IDs, Werkzeugsatz, Katalogeinträge) bleiben roh und werden
 * escaped; alle übrigen Texte über t()/tHtml(). Keine Beispielwerte der Vorlage.
 */

import { renderInstallierbarHinweis } from '../empfehlung-anzeige.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge } from '../kommt.js'
import { escapeHtml } from '../render.js'
import { rollenName, workerName } from '../rollen-anzeige.js'
import { renderEntscheidungsPanel } from './entscheidung-panel.js'
import { abnahmeEinleitung, abnahmeLage } from './workflow-abnahme.js'
import { ordneSchritteNachPlan } from './workflow-detail.js'

/** Optionen der Freigabe in der Reihenfolge der Vorlage. */
export const FREIGABE_OPTIONEN = ['freigeben', 'installieren', 'ablehnen']

/**
 * Modus der Seite: Freigabe vor Abnahme; sonst null (heutige Ablaufseite).
 * @param detail - { daten, naechster, ungueltig } des geladenen Workflows, oder null
 * @param abnahme - Antwort von GET …/abnahme desselben Workflows, oder null
 * @returns 'freigabe' | 'abnahme' | null
 */
export function entscheidungsModus(detail, abnahme) {
  if (detail !== null && detail !== undefined && detail.ungueltig !== true && detail.naechster?.art === 'haltFreigabe') return 'freigabe'
  // Die Abnahme folgt der Abnahme-Projektion (abnahmeLage) und nur, solange das Detail nicht
  // gerade etwas anderes meldet (z. B. ein Freigabe-Halt nach „Anpassung anfordern“).
  if (abnahme !== null && abnahme !== undefined && abnahmeLage(abnahme) === 'entscheidbar' && (detail?.daten?.status ?? abnahme.workflowStatus) === abnahme.workflowStatus) return 'abnahme'
  return null
}

/**
 * Kopf der Seite je Modus: Eyebrow (Art · Eintrag), Überschrift (die Frage) und Einleitung; ohne
 * Modus der heutige Kopf (Ziel als Überschrift).
 * @param modus - entscheidungsModus
 * @param ziel - daten.ziel (Servertext) bzw. Rückfall
 * @param abnahme - Antwort von GET …/abnahme oder null (Einleitung der Abnahme)
 * @returns { art, eintrag, titel, beschreibung } — Texte, kein HTML; art ist der übersetzte Art-Text oder null
 */
export function seitenKopf(modus, ziel, abnahme) {
  if (modus === 'freigabe') return { art: t('entscheiden.freigabe.art'), eintrag: ziel, titel: t('entscheiden.freigabe.titel'), beschreibung: t('entscheiden.freigabe.einleitung') }
  if (modus === 'abnahme') return { art: t('entscheiden.abnahme.art'), eintrag: ziel, titel: t('entscheiden.abnahme.titel'), beschreibung: abnahmeEinleitung(abnahme) }
  return { art: null, eintrag: null, titel: ziel, beschreibung: t('ablauf.beschreibung') }
}

/**
 * Zeitgrenze lesbar: ganze Minuten, darunter Sekunden.
 * @param ms - zeitgrenze_ms
 * @returns Text oder null
 */
export function zeitgrenzeText(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return null
  return ms >= 60000 ? t('entscheiden.freigabe.minuten', { zahl: formatiereZahl(Math.round(ms / 60000)) }) : t('entscheiden.freigabe.sekunden', { zahl: formatiereZahl(Math.round(ms / 1000)) })
}

/**
 * Eine Kennzahl der Freigabe (Kontrolltiefe, Schätzung, Werkzeugsatz, Zeitgrenze).
 * @param schluessel - i18n-Suffix der Beschriftung
 * @param wertHtml - fertiges HTML des Werts
 * @returns HTML
 */
function kennzahl(schluessel, wertHtml) {
  return `<div class="entscheiden-kennzahl"><dt>${tHtml(`entscheiden.freigabe.${schluessel}`)}</dt><dd>${wertHtml}</dd></div>`
}

/**
 * „Was startet, wenn du freigibst“: die Schritte in Planreihenfolge (Nummer, Rolle, Worker), der
 * fällige Schritt (naechster.schrittId) markiert, erledigte als erledigt; darunter die Kennzahlen
 * und das Risiko des fälligen Schritts.
 * @param detail - { daten, naechster }
 * @returns HTML
 */
function renderWasStartet(detail) {
  const schritte = Array.isArray(detail.daten?.schritte) ? ordneSchritteNachPlan(detail.daten.schritte) : []
  const faelligId = detail.naechster?.schrittId ?? null
  const faellig = schritte.find(({ schritt }) => schritt.schritt_id === faelligId)?.schritt ?? null
  const liste = schritte
    .map(({ schritt }, index) => {
      const lage = schritt.schritt_id === faelligId ? 'faellig' : schritt.status === 'ERFOLGREICH' ? 'erledigt' : 'offen'
      const marke = lage === 'offen' ? '' : `<span class="entscheiden-schritt-marke">${tHtml(`entscheiden.freigabe.schritt.${lage}`)}</span>`
      const wer = [workerName(schritt.worker), schritt.modell].filter((teil) => typeof teil === 'string' && teil !== '').map(escapeHtml).join(' · ')
      return `<li class="entscheiden-schritt entscheiden-schritt-${lage}"${lage === 'faellig' ? ' aria-current="step"' : ''}>
        <span class="entscheiden-schritt-nr">${index + 1}</span>
        <span class="entscheiden-schritt-name">${escapeHtml(rollenName(schritt.rolle) || schritt.schritt_id)}</span>
        <span class="entscheiden-schritt-wer">${wer}</span>${marke}
      </li>`
    })
    .join('')
  const zeitgrenze = zeitgrenzeText(faellig?.zeitgrenze_ms)
  const kennzahlen = [
    kennzahl('kontrolltiefe', kommtBadge()),
    kennzahl('schaetzung', kommtBadge()),
    kennzahl('werkzeugsatz', faellig?.werkzeugsatz ? `<code>${escapeHtml(faellig.werkzeugsatz)}</code>` : '–'),
    kennzahl('zeitgrenze', zeitgrenze === null ? '–' : escapeHtml(zeitgrenze)),
  ].join('')
  const risiko = typeof faellig?.risiko === 'string' && faellig.risiko.trim() !== '' ? `<p class="entscheiden-risiko"><span class="subtle">${tHtml('entscheiden.freigabe.risiko')}</span> ${escapeHtml(faellig.risiko)}</p>` : ''
  return `<section class="entscheiden-karte" aria-labelledby="freigabe-was-startet">
    <h2 id="freigabe-was-startet">${tHtml('entscheiden.freigabe.wasStartet')}</h2>
    ${schritte.length === 0 ? `<p class="subtle">${tHtml('ablauf.ungueltig.keineSchritte')}</p>` : `<ol class="entscheiden-schritte">${liste}</ol>`}
    <dl class="entscheiden-kennzahlen">${kennzahlen}</dl>
    ${risiko}
  </section>`
}

/**
 * „Arbeitspaket“ (Umfang, Nicht hier, Risiko, Fertig wenn) — „kommt“ (Fixpaket B2).
 * @returns HTML
 */
function renderArbeitspaket() {
  return `<section class="entscheiden-karte" aria-labelledby="freigabe-arbeitspaket" aria-disabled="true">
    <h2 id="freigabe-arbeitspaket">${tHtml('entscheiden.freigabe.arbeitspaket')} ${kommtBadge()}</h2>
    <p class="subtle">${tHtml('entscheiden.freigabe.arbeitspaketText')}</p>
  </section>`
}

/**
 * „Empfehlung zu Fähigkeiten“ (F36) nur lesend: „wird genutzt“ und „vorgeschlagen“ je Eintrag mit
 * Grund. Die Installationsknöpfe stehen im Freigabedialog (F36 WS-5a), damit dort „Anzeige = Start“
 * gilt.
 * @param empfehlung - detail.empfehlung oder null
 * @returns HTML
 */
function renderFaehigkeiten(empfehlung) {
  const kopf = `<h2 id="freigabe-faehigkeiten">${tHtml('entscheiden.freigabe.faehigkeiten')}</h2>`
  let inhalt
  if (empfehlung === null || empfehlung === undefined) inhalt = `<p class="subtle">${tHtml('entscheiden.freigabe.keineEmpfehlung')}</p>`
  else if (typeof empfehlung.fehler === 'string') inhalt = `<p class="fehler">${escapeHtml(t('empfehlung.nichtErmittelbar', { fehler: empfehlung.fehler }))}</p>`
  else {
    const zeile = (e, art) =>
      `<li><span class="faehigkeit-chip faehigkeit-chip-${art}">${tHtml(`entscheiden.freigabe.chip.${art}`)}</span> <code>${escapeHtml(e.id)}</code> ${escapeHtml(e.name ?? '')}${e.grund ? ` · <span class="subtle">${escapeHtml(e.grund)}</span>` : ''}</li>`
    const zeilen = [...(empfehlung.wirdGenutzt ?? []).map((e) => zeile(e, 'genutzt')), ...(empfehlung.passtNichtImLauf ?? []).map((e) => zeile(e, 'vorgeschlagen'))]
    const weitere = (empfehlung.weitereAnzahl?.wirdGenutzt ?? 0) + (empfehlung.weitereAnzahl?.passtNichtImLauf ?? 0)
    if (weitere > 0) zeilen.push(`<li class="subtle">${tHtml('entscheiden.freigabe.weitere', { anzahl: weitere, zahl: formatiereZahl(weitere) })}</li>`)
    inhalt = zeilen.length === 0 ? `<p class="subtle">${tHtml('empfehlung.keine')}</p>` : `<ul class="faehigkeiten-liste">${zeilen.join('')}</ul>`
  }
  return `<section class="entscheiden-karte" aria-labelledby="freigabe-faehigkeiten">${kopf}${inhalt}<p class="subtle">${tHtml('entscheiden.freigabe.installierenHinweis')}</p></section>`
}

/**
 * Hauptspalte der Freigabe.
 * @param detail - { daten, naechster, empfehlung }
 * @returns HTML
 */
export function renderFreigabeSeite(detail) {
  return `<div class="entscheiden-inhalt">${renderWasStartet(detail)}${renderArbeitspaket()}${renderFaehigkeiten(detail.empfehlung ?? null)}</div>`
}

/**
 * Ob „Freigeben & installieren“ etwas zu installieren hätte — dieselbe Bedingung wie der Hinweis im
 * Freigabedialog (renderInstallierbarHinweis, F-826).
 * @param empfehlung - detail.empfehlung oder null
 * @returns true, wenn ein installierbarer Eintrag vorgeschlagen ist
 */
export function hatInstallierbares(empfehlung) {
  return renderInstallierbarHinweis(empfehlung) !== ''
}

/**
 * Spalte „Deine Entscheidung“ der Freigabe. „<Option> bestätigen“ (data-aktion freigabe-bestaetigen)
 * öffnet den bestehenden Freigabedialog; die Option steht dabei in data-option des Knopfs.
 * @param detail - { workflowId, empfehlung }
 * @returns HTML
 */
export function renderFreigabePanel(detail) {
  const installierbar = hatInstallierbares(detail.empfehlung ?? null)
  return renderEntscheidungsPanel({
    art: 'freigabe',
    frageHtml: tHtml('entscheiden.freigabe.frage'),
    name: 'wf-freigabe-option',
    optionen: FREIGABE_OPTIONEN.map((option) => ({
      wert: option,
      titel: t(`entscheiden.freigabe.option.${option}`),
      info: option === 'installieren' && !installierbar ? t('entscheiden.freigabe.info.nichtsZuInstallieren') : t(`entscheiden.freigabe.info.${option}`),
      erlaubt: option !== 'installieren' || installierbar,
      bestaetigen: t(`entscheiden.freigabe.bestaetigen.${option}`),
    })),
    feldId: 'wf-entscheidung-begruendung',
    knopfKlasse: 'wf-aktion',
    knopfDaten: { aktion: 'freigabe-bestaetigen', 'workflow-id': detail.workflowId, option: '' },
  })
}
