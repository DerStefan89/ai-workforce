/**
 * Datei: public/leitstand/views/workflow-entscheiden.js
 *
 * Zweck: Seite Entscheiden `#/workflows/<id>` (F46 D2, Bilder 09-entscheidungen--Entscheiden und
 * --Entscheiden-Abnahme, docs/design/abgleich-f46.md §4.5). Je nach Zustand zeigt die Seite die
 * Freigabe oder die Abnahme — ohne Umschalter (der Umschalter der Vorlage ist E). Dieses Modul
 * bestimmt den Modus und baut Kopf und Freigabe-Teil; den Abnahme-Teil baut views/workflow-abnahme.js
 * (renderAbnahmeSeite, renderAbnahmePanel).
 *
 * Freigabe (naechster.art haltFreigabe bei gültiger Fassung): an einem Halt der Plan-Stufe zuerst „Plan, den du
 * freigibst“ (Plan v1/v2) bzw. „Plan v1 — wird überarbeitet“ und „Befunde des Advisors“ (F45 B2b-1b-2b, F-1106,
 * detail.planFreigabe); danach „Was startet, wenn du freigibst“ (die
 * Schritte in Planreihenfolge mit Rolle und Worker, der fällige Schritt markiert), Werkzeugsatz und
 * Zeitgrenze des fälligen Schritts, sein Risiko; Kontrolltiefe („kommt“, F-372: das Router-Ergebnis hat
 * keinen Lesepfad) und Schätzung („kommt“, Fixpaket B5); „Arbeitspaket“ („kommt“, Fixpaket B2);
 * „Empfehlung zu Fähigkeiten“ (F36, die Katalog-Empfehlung des Details, nur lesend); rechts „Deine
 * Entscheidung“ mit Freigeben · Freigeben & installieren · Ablehnen.
 * F45 B2b-3b-2b-2b-2b-2 (F-1144): vor „Was startet“ die Karte „Auftrag für diesen Schritt“ — der Auftragstext wörtlich und
 * vollständig (detail.auftragstext aus GET /api/workflows/<id>), als Text, lange Texte mit Vorschau und aufklappbarem „Ganzer Auftrag“; ohne
 * Text ein Hinweis. Oben die Zeile zur abweichenden Claude-Code-Version des Projekts (detail.projektCliHinweis, nur Warnung, projekt-cli-hinweis.js).
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
import { renderProjektCliZeile } from '../projekt-cli-hinweis.js'
import { escapeHtml } from '../render.js'
import { rollenName, workerName } from '../rollen-anzeige.js'
import { renderArbeitsordnerKarte } from './arbeitsordner-anzeige.js'
import { renderEntscheidungsPanel } from './entscheidung-panel.js'
import { abnahmeEinleitung, abnahmeLage, FARBE_SCHWERE } from './workflow-abnahme.js'
import { ordneSchritteNachPlan, renderEinrichtungsListe } from './workflow-detail.js'

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
 * „Arbeitspaket“ (Umfang, Nicht hier, Risiko, Fertig wenn) — „kommt“ (Fixpaket B2). F45 B2a-2 (F-1071): trägt der Auftrag
 * eine Einrichtungsliste, steht sie hier mit Abhaken — auf der Freigabe-Seite ist die Timeline eingeklappt, und genau
 * hier entscheidet Stefan, ob der Bau startet.
 * @param einrichtung - detail.einrichtung oder null
 * @param workflowId - Kennung des Ablaufs
 * @returns HTML
 */
function renderArbeitspaket(einrichtung, workflowId) {
  const liste = renderEinrichtungsListe(einrichtung, workflowId)
  const rest = `<p class="subtle">${tHtml('entscheiden.freigabe.arbeitspaketText')}</p>`
  if (liste === null) {
    return `<section class="entscheiden-karte" aria-labelledby="freigabe-arbeitspaket" aria-disabled="true">
    <h2 id="freigabe-arbeitspaket">${tHtml('entscheiden.freigabe.arbeitspaket')} ${kommtBadge()}</h2>
    ${rest}
  </section>`
  }
  return `<section class="entscheiden-karte entscheiden-einrichtung" aria-labelledby="freigabe-arbeitspaket">
    <h2 id="freigabe-arbeitspaket">${tHtml('entscheiden.freigabe.arbeitspaket')}</h2>
    <h3>${tHtml('ablauf.einrichtung.titel')}</h3>
    ${liste.html}
    <p class="subtle">${kommtBadge()} ${tHtml('entscheiden.freigabe.arbeitspaketText')}</p>
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

/** Feste Wertemengen des Advisor-Schemas (schemas/ergebnis-architecture-advisor.schema.json) mit übersetztem Text. */
const ADVISOR_URTEILE = new Set(['FREIGEGEBEN', 'FREIGEGEBEN_MIT_AUFLAGEN', 'UEBERARBEITEN'])
const ADVISOR_SCHWEREN = new Set(Object.keys(FARBE_SCHWERE))
const ADVISOR_EVIDENZEN = new Set(['FAKT', 'SCHLUSSFOLGERUNG', 'ANNAHME', 'OFFENE_UNSICHERHEIT'])
/** Statusfarbe (Klasse von .ablauf-status) je Advisor-Urteil — Anzeige, keine Regel. */
const FARBE_ADVISOR_URTEIL = { FREIGEGEBEN: 'ok', FREIGEGEBEN_MIT_AUFLAGEN: 'warten', UEBERARBEITEN: 'fehler' }

/**
 * Übersetzt einen Wert einer festen Wertemenge; ein unbekannter erscheint roh (Muster workflow-abnahme.js).
 * @param menge - bekannte Werte @param praefix - Schlüsselpräfix @param wert - Serverwert
 * @returns Text
 */
function wertText(menge, praefix, wert) {
  return menge.has(wert) ? t(`${praefix}.${wert}`) : String(wert ?? '')
}

/**
 * F45 B2b-1b-2b (Plan 2b P3, F-1106): „Plan, den du freigibst“ (Freigabe der Ausführung, Kennzeichen Plan v1/v2) bzw.
 * „Plan v1 — wird überarbeitet“ (Freigabe des Architekten für Plan v2, mit dem ehrlichen Satz, dass Plan v1 hier nicht unverändert freigebbar ist):
 * Zusammenfassung, Module (Name · Zweck), Stefans Entscheidungen (Frage → Antwort). Keine internen Kennungen.
 * @param planFreigabe - detail.planFreigabe (nicht null)
 * @returns HTML
 */
function renderPlanKarte(planFreigabe) {
  const vorV2 = planFreigabe.art === 'plan_v2'
  const titel = vorV2 ? tHtml('entscheiden.plan.titelV1Ueberarbeitet') : `${tHtml('entscheiden.plan.titel')} <span class="ablauf-marke">${tHtml('entscheiden.plan.fassung', { zahl: planFreigabe.fassung === 2 ? 2 : 1 })}</span>`
  const plan = planFreigabe.plan ?? {}
  let inhalt
  if (typeof plan.fehler === 'string') inhalt = `<p class="fehler">${tHtml('entscheiden.plan.nichtLesbar')}</p>`
  else {
    const module = Array.isArray(plan.module) ? plan.module : []
    const entscheidungen = Array.isArray(plan.entscheidungen) ? plan.entscheidungen : []
    inhalt = [
      typeof plan.zusammenfassung === 'string' && plan.zusammenfassung !== '' ? `<p>${escapeHtml(plan.zusammenfassung)}</p>` : '',
      module.length === 0 ? '' : `<h3>${tHtml('entscheiden.plan.module')}</h3><ul class="entscheiden-plan-liste">${module.map((m) => `<li><strong>${escapeHtml(m.name ?? '')}</strong>${m.zweck ? ` · <span class="subtle">${escapeHtml(m.zweck)}</span>` : ''}</li>`).join('')}</ul>`,
      entscheidungen.length === 0 ? '' : `<h3>${tHtml('entscheiden.plan.entscheidungen')}</h3><ul class="entscheiden-plan-liste">${entscheidungen.map((e) => `<li>${escapeHtml(e.frage ?? '')} <span aria-hidden="true">→</span><span class="sr-only">:</span> <strong>${escapeHtml(e.gewaehlt ?? '')}</strong></li>`).join('')}</ul>`,
    ].join('')
  }
  // Der Knopfname kommt aus der Option der Spalte „Deine Entscheidung“ — so stimmt er in jeder Sprache mit der Seite überein.
  const behalten = vorV2 ? `<p class="subtle">${tHtml('entscheiden.plan.v1Behalten', { knopf: t('entscheiden.freigabe.option.ablehnen') })}</p>` : ''
  return `<section class="entscheiden-karte entscheiden-plan" aria-labelledby="freigabe-plan">
    <h2 id="freigabe-plan">${titel}</h2>
    ${inhalt}${behalten}
  </section>`
}

/**
 * F45 B2b-1b-2b: „Befunde des Advisors“ — Urteil-Badge, Begründung, je Befund Schwere-Badge, Fundstelle, Zusammenfassung
 * und Korrekturrichtung (Listenmuster der Review-Befunde). Der Hinweis darüber sagt, was mit den Befunden geschieht:
 * „Kein Plan v2: <Grund>“, gehen an den Architekten (vor Plan v2), in Plan v2 eingearbeitet (nur, wenn genau dieser
 * Advisor-Lauf der Anlass war). Ohne Advisor keine Karte.
 * @param planFreigabe - detail.planFreigabe (nicht null)
 * @returns HTML oder ''
 */
function renderAdvisorKarte(planFreigabe) {
  const advisor = planFreigabe.advisor
  if (advisor === null || advisor === undefined) return ''
  const kopf = `<h2 id="freigabe-advisor">${tHtml('entscheiden.advisor.titel')}</h2>`
  if (typeof advisor.fehler === 'string') return `<section class="entscheiden-karte entscheiden-plan" aria-labelledby="freigabe-advisor">${kopf}<p class="fehler">${tHtml('entscheiden.advisor.nichtLesbar')}</p></section>`
  let hinweis = ''
  if (typeof planFreigabe.keinPlanV2 === 'string') hinweis = `<p class="entscheiden-plan-hinweis">${tHtml('entscheiden.advisor.keinPlanV2', { grund: planFreigabe.keinPlanV2 })}</p>`
  else if (planFreigabe.art === 'plan_v2') hinweis = `<p class="entscheiden-plan-hinweis">${tHtml('entscheiden.advisor.anArchitekten')}</p>`
  else if (planFreigabe.fassung === 2 && planFreigabe.advisorIstAnlass === true) hinweis = `<p class="entscheiden-plan-hinweis">${tHtml('entscheiden.advisor.eingearbeitet')}</p>`
  const urteil = `<p><span class="ablauf-status ${FARBE_ADVISOR_URTEIL[advisor.urteil] ?? 'neutral'}">${escapeHtml(wertText(ADVISOR_URTEILE, 'entscheiden.advisor.urteil', advisor.urteil))}</span></p>`
  const begruendung = typeof advisor.begruendung === 'string' && advisor.begruendung !== '' ? `<p>${escapeHtml(advisor.begruendung)}</p>` : ''
  const befunde = Array.isArray(advisor.befunde) ? advisor.befunde : []
  const liste =
    befunde.length === 0
      ? `<p class="subtle">${tHtml('entscheiden.advisor.keine')}</p>`
      : `<ul class="abnahme-liste abnahme-befunde">${befunde
          .map(
            (b) => `<li class="abnahme-befund">
      <p><span class="ablauf-status ${FARBE_SCHWERE[b.schwere] ?? 'neutral'}">${escapeHtml(wertText(ADVISOR_SCHWEREN, 'abnahme.schwere', b.schwere))}</span> <span class="subtle">${escapeHtml(b.id ?? '')} · ${escapeHtml(wertText(ADVISOR_EVIDENZEN, 'entscheiden.advisor.evidenz', b.evidenz))}</span> <code>${escapeHtml(b.fundstelle ?? '')}</code></p>
      <p>${escapeHtml(b.zusammenfassung ?? '')}</p>
      <p>${tHtml('entscheiden.advisor.korrektur', { text: String(b.korrekturrichtung ?? '') })}</p>
    </li>`
          )
          .join('')}</ul>`
  return `<section class="entscheiden-karte entscheiden-plan" aria-labelledby="freigabe-advisor">${kopf}${hinweis}${urteil}${begruendung}${liste}</section>`
}

/** Ab hier gilt ein Auftragstext als lang: Vorschau der ersten Zeilen, der ganze Text aufklappbar (F-1144). */
export const AUFTRAG_LANG = Object.freeze({ zeilen: 12, zeichen: 1200 })

/**
 * Vorschau eines langen Auftragstexts: die ersten AUFTRAG_LANG.zeilen / 2 Zeilen, höchstens AUFTRAG_LANG.zeichen / 2 Zeichen.
 * @param text - Auftragstext
 * @returns Vorschau (Text, wörtlich gekürzt)
 */
function auftragVorschau(text) {
  return text.split('\n').slice(0, Math.floor(AUFTRAG_LANG.zeilen / 2)).join('\n').slice(0, Math.floor(AUFTRAG_LANG.zeichen / 2))
}

/**
 * F45 B2b-3b-2b-2b-2b-2 (F-1144): „Auftrag für diesen Schritt“ — der Auftragstext wörtlich und vollständig, nur als Text
 * (escaped, Zeilenumbrüche erhalten). Kurz ⇒ ganz; lang ⇒ Vorschau und darunter <details data-klappe="auftrag"> mit dem ganzen Text (die
 * Vorschau verschwindet beim Aufklappen, views/workflows.js hält den Zustand über den Poll). Kein Text ⇒ ein Hinweis statt leerer Fläche.
 * Der Satz darunter sagt ehrlich, dass das System den Auftrag beim Start je nach Rolle ergänzt bzw. umrahmt (Regeln, Arbeitspaket,
 * Abnahmekriterien, Anpassungswünsche) — der zusammengesetzte Prompt entsteht erst beim Start (code-reviewer V9, qa 4).
 * @param auftragstext - detail.auftragstext (Text oder null)
 * @returns HTML
 */
export function renderAuftragKarte(auftragstext) {
  const kopf = `<h2 id="freigabe-auftrag">${tHtml('entscheiden.auftrag.titel')}</h2>`
  if (typeof auftragstext !== 'string' || auftragstext.trim() === '') {
    return `<section class="entscheiden-karte entscheiden-auftrag" aria-labelledby="freigabe-auftrag">${kopf}<p class="note amber entscheiden-auftrag-fehlt">${tHtml('entscheiden.auftrag.fehlt')}</p></section>`
  }
  const zeilen = auftragstext.split('\n').length
  const lang = zeilen > AUFTRAG_LANG.zeilen || auftragstext.length > AUFTRAG_LANG.zeichen
  const text = (inhalt, klasse) => `<pre class="entscheiden-auftrag-text${klasse}">${escapeHtml(inhalt)}</pre>`
  const inhalt = lang
    ? `${text(`${auftragVorschau(auftragstext)}\n…`, ' entscheiden-auftrag-vorschau')}<details class="entscheiden-auftrag-klappe" data-klappe="auftrag"><summary>${tHtml('entscheiden.auftrag.ganz', { zeichen: formatiereZahl(auftragstext.length) })}</summary>${text(auftragstext, '')}</details>`
    : text(auftragstext, '')
  return `<section class="entscheiden-karte entscheiden-auftrag" aria-labelledby="freigabe-auftrag">${kopf}${inhalt}<p class="subtle">${tHtml('entscheiden.auftrag.zusatz')}</p></section>`
}

/**
 * Hauptspalte der Freigabe. F45 B2b-1b-2b: vor „Was startet“ der Plan und die Befunde des Advisors (detail.planFreigabe). F45
 * B2b-3b-2b-2b-2b-2: oben die Zeile zur abweichenden Claude-Code-Version, dann (nach dem Plan) der Auftrag des Schritts.
 * @param detail - { workflowId, daten, naechster, empfehlung, arbeitsordner, codeStand, einrichtung, planFreigabe, auftragstext, projektCliHinweis } — F45 B1a-1: arbeitsordner aus GET /api/workflows/<id>, codeStand aus code-stand.js; F45 B2a-2: einrichtung aus GET /api/workflows/<id>; F45 B2b-1b-2b: planFreigabe aus GET /api/workflows/<id> (oder null); F45 B2b-3b-2b-2b-2b-2: auftragstext aus GET /api/workflows/<id>, projektCliHinweis aus GET /api/zustand
 * @returns HTML
 */
export function renderFreigabeSeite(detail) {
  const planFreigabe = detail.planFreigabe ?? null
  const planKarten = planFreigabe === null ? '' : `${renderPlanKarte(planFreigabe)}${renderAdvisorKarte(planFreigabe)}`
  return `<div class="entscheiden-inhalt">${renderProjektCliZeile(detail.projektCliHinweis, 'freigabe')}${planKarten}${renderAuftragKarte(detail.auftragstext ?? null)}${renderWasStartet(detail)}${renderArbeitsordnerKarte(detail.arbeitsordner ?? null, detail.codeStand ?? null)}${renderArbeitspaket(detail.einrichtung ?? null, detail.workflowId ?? '')}${renderFaehigkeiten(detail.empfehlung ?? null)}</div>`
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
