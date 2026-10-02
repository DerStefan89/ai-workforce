/**
 * Datei: public/leitstand/views/roadmap.js
 *
 * Zweck: Seite `#/roadmap` — seit F46 D1 nach Design 03-roadmap--Main (docs/design/abgleich-f46.md
 * §4.2; vorher F44 WS-2a, Vorlage V10). Von oben nach unten:
 * - Kopf: Rücklink, Eyebrow, „<Projekt> · Roadmap“, aktueller Meilenstein; „Jarvis zur Roadmap
 *   fragen“ (öffnet den Chat mit vorbefüllter Eingabe, sendet nie selbst) und „+ Eintrag erfassen“
 *   als „kommt“; Register Überblick · Roadmap · Projektakte (produktplanung-kopf.js).
 * - Kennzahlen: Meilensteine x / y abgeschlossen, Features x / y abgenommen, „Bis <M> fertig“ (noch
 *   nicht berechenbar, Zahl der offenen Einträge ohne Schätzung), Plan gegen Ist („kommt“).
 * - Gesamte Roadmap: Baum Meilenstein → Feature aus roadmap.json v0. Der aktuelle Meilenstein steht
 *   oben und ist aufgeklappt, abgeschlossene sind ausgeblendet („Einblenden“), „Alles aufklappen“.
 *   Workstream-Zeilen, Balken, Zeitachse und Tage/Wochen sind „kommt“ (Fixpaket B2/B5) — es gibt
 *   keine Schätzfelder, deshalb keine Balken. Daneben das Detailpanel des gewählten Eintrags (Typ,
 *   Name, Status, Teil von, Inhalt; bei Features das Ziel aus der Akte) mit „Frag Jarvis dazu“ und
 *   „Anpassen“ („kommt“).
 * - Entwicklungsstand mit Filter Alle · Features · Bugs · Harness · Tech Debt (zieht aus der
 *   Produktübersicht hierher): offene P0–P2-Befunde und offene Features des aktuellen Meilensteins.
 * - Noch nicht eingeplant (F44 D3, bleibt).
 *
 * Zustände: Lädt · nicht_vorhanden → Leerzustand · ungueltig → Fehler mit Regelverstößen · Abruffehler
 * → Fehler mit „Erneut laden“ (F-854: nie „keine Roadmap“). Workitems und Akten scheitern je für sich.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initRoadmapView beim Bootstrap, vor starteRouter())
 * - public/leitstand/projekt-wechsel.test.mjs (Neuladen beim Projektwechsel)
 *
 * Wichtig:
 * - Laden nur beim Betreten und bei einem Projektwechsel, nie aus dem Poll; Überholschutz über den
 *   Anfragezähler. Die Akte eines gewählten Features lädt einmal je ID (holeFeatureAkte).
 * - „Frag Jarvis dazu“ nutzt chat-dock.js oeffneChatMitEntwurf (F44 WS-8b): Dock öffnen, Eingabe
 *   befüllen — nie senden. Keine Schreibaktion auf dieser Seite.
 * - Projektinhalte (Name, Titel, IDs, Statuswerte, Ziel, Regelverstöße) werden nicht übersetzt und
 *   immer escaped; alle übrigen Texte über t().
 * - Die Seite wird bei jeder Zustandsänderung ganz neu geschrieben (kein Poll); Fokus und der Text im
 *   Fragefeld werden dabei über data-Attribute bzw. den Wert erhalten.
 */

import { holeFeatureAkte, holeRoadmap, holeWorkitems } from '../api.js'
import { oeffneChatMitEntwurf } from '../chat-dock.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { planungsRegister, zurueckZurUebersicht } from '../produktplanung-kopf.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { aktuellerMeilenstein, nichtEingeplant, roadmapZustand, STATUS_KATEGORIEN, STATUS_SYMBOL, statusKategorie, waehleEntwicklungsstand, zaehleMeilenstein, zaehleRoadmap } from '../roadmap-anzeige.js'
import { registriere } from '../router.js'
import { chipTypVonWorkitem, typChip } from '../typ-chip.js'

/** Letzte Roadmap-Antwort: null = lädt, { status: 'fehler', grund } nach einem Wurf, sonst die Projektion. */
let roadmap = null

/** Alle Workitems: undefined = lädt, null = nicht verfügbar, sonst Liste. */
let workitems

/** Akten je Feature-ID für das Detailpanel: { status: 'laedt' | 'ok' | 'fehler', daten? }. */
const akten = new Map()

/** Überholschutz für ladeRoadmap (Muster roadmapAnfrageZaehler in views/workboard.js). */
let roadmapAnfrageZaehler = 0

/** Gewählter Eintrag: { art: 'meilenstein' | 'feature', id, meilensteinId } oder null = vorgewählt. */
let auswahl = null

/** Aufgeklappte Meilensteine (IDs); null = Standard (nur der aktuelle). */
let aufgeklappt = null

/** true, wenn die abgeschlossenen Meilensteine eingeblendet sind. */
let abgeschlosseneSichtbar = false

/** Filter des Entwicklungsstands. */
let standFilter = 'alle'

/** Workitem-Typen je Filter des Entwicklungsstands (null = alle). */
const STAND_FILTER = Object.freeze({ alle: null, features: ['FEATURE'], bugs: ['BUG'], harness: ['HARNESS_IMPROVEMENT'], techdebt: ['TECH_DEBT', 'PROCESS_IMPROVEMENT'] })

/** Höchstzahl der Zeilen im Entwicklungsstand. */
const STAND_MAX = 12

/** Höchstzahl der IDs je Kennzahl-Unterzeile. */
const IDS_MAX = 4

// ─── Kleine Bausteine ────────────────────────────────────────────────────────

/**
 * Statussymbol mit Kategorie-Klasse — dekorativ, der Status steht daneben als Text.
 * @param kategorie - Statuskategorie
 * @returns HTML
 */
function symbol(kategorie) {
  return `<span class="roadmap-symbol roadmap-kat-${kategorie}" aria-hidden="true">${STATUS_SYMBOL[kategorie]}</span>`
}

/**
 * Übersetzter Text einer Statuskategorie; der rohe Status steht im title.
 * @param status - roher Statuswert (Projektinhalt)
 * @returns HTML
 */
function statusText(status) {
  const kategorie = statusKategorie(status)
  return `<span class="roadmap-status roadmap-kat-${kategorie}" title="${escapeHtml(status ?? '')}">${symbol(kategorie)} ${tHtml(`roadmap.status.${kategorie}`)}</span>`
}

/**
 * Titel eines Eintrags, sonst die ID.
 * @param eintrag - { id, titel? }
 * @returns Rohtext
 */
function titelVon(eintrag) {
  return typeof eintrag?.titel === 'string' && eintrag.titel.trim() !== '' ? eintrag.titel : String(eintrag?.id ?? '')
}

/**
 * IDs als kurze Liste („F1, F2, F3 …“).
 * @param ids - Liste
 * @returns Rohtext oder '–'
 */
function idListe(ids) {
  if (ids.length === 0) return '–'
  return ids.length > IDS_MAX ? `${ids.slice(0, IDS_MAX).join(', ')} …` : ids.join(', ')
}

// ─── Abgeleitete Lage ─────────────────────────────────────────────────────────

/**
 * Meilensteine in Anzeigereihenfolge: der aktuelle oben, dann die übrigen nicht abgeschlossenen in
 * Roadmap-Reihenfolge; die abgeschlossenen getrennt.
 * @returns { aktueller, offen: Meilenstein[], abgeschlossen: Meilenstein[] }
 */
function reihenfolge() {
  const aktueller = aktuellerMeilenstein(roadmap)
  const alle = roadmap.meilensteine
  const offen = [...(aktueller === null ? [] : [aktueller]), ...alle.filter((m) => m !== aktueller && m.status !== 'ABGESCHLOSSEN')]
  return { aktueller, offen, abgeschlossen: alle.filter((m) => m !== aktueller && m.status === 'ABGESCHLOSSEN') }
}

/**
 * Ob ein Meilenstein aufgeklappt ist.
 * @param meilenstein - Eintrag
 * @param aktueller - aktueller Meilenstein oder null
 * @returns true, wenn offen
 */
function istAufgeklappt(meilenstein, aktueller) {
  return aufgeklappt === null ? meilenstein === aktueller : aufgeklappt.has(meilenstein.id)
}

/**
 * Der gewählte Eintrag; ohne Wahl das erste Feature „in Arbeit“ des aktuellen Meilensteins, sonst der
 * aktuelle Meilenstein, sonst der erste.
 * @returns { art, meilenstein, feature } oder null ohne Meilensteine
 */
function gewaehlterEintrag() {
  const meilensteine = roadmap.meilensteine
  if (auswahl !== null) {
    const meilenstein = meilensteine.find((m) => m.id === auswahl.meilensteinId) ?? null
    if (meilenstein !== null && auswahl.art === 'meilenstein') return { art: 'meilenstein', meilenstein, feature: null }
    const feature = meilenstein?.features.find((f) => f.id === auswahl.id) ?? null
    if (feature !== null) return { art: 'feature', meilenstein, feature }
  }
  const aktueller = aktuellerMeilenstein(roadmap) ?? meilensteine[0] ?? null
  if (aktueller === null) return null
  const inArbeit = aktueller.features.find((f) => statusKategorie(f.status) === 'in_arbeit') ?? null
  return inArbeit !== null ? { art: 'feature', meilenstein: aktueller, feature: inArbeit } : { art: 'meilenstein', meilenstein: aktueller, feature: null }
}

// ─── Kopf und Kennzahlen ─────────────────────────────────────────────────────

/**
 * Kopf der Seite.
 * @returns HTML
 */
function seitenkopf() {
  const aktueller = roadmapZustand(roadmap) === 'ok' ? aktuellerMeilenstein(roadmap) : null
  const zeile = aktueller !== null ? tHtml('roadmap.aktuell', { id: aktueller.id, titel: aktueller.titel }) : tHtml('roadmap.beschreibung')
  return `${zurueckZurUebersicht()}
    <div class="page-heading">
      <div>
        <div class="eyebrow">${tHtml('roadmap.eyebrow')}</div>
        <h1 tabindex="-1">${tHtml('roadmap.titel', { projekt: holeAktivesProjekt().name })}</h1>
        <p class="description">${zeile}</p>
      </div>
      <div class="action-row">
        <button type="button" class="button" data-roadmap-jarvis-kopf>${tHtml('roadmap.jarvis.kopf')}</button>
        ${kommtKnopf(t('roadmap.eintragErfassen'), { primaer: true, symbol: '+' })}
      </div>
    </div>
    ${planungsRegister('roadmap')}`
}

/**
 * Eine Kennzahl-Karte.
 * @param optionen - { eyebrow, wertHtml, unterHtml, klasse }
 * @returns HTML
 */
function kennzahl({ eyebrow, wertHtml, unterHtml, klasse = '' }) {
  return `<div class="roadmap-kennzahl${klasse ? ` ${klasse}` : ''}"><span class="eyebrow">${escapeHtml(eyebrow)}</span><strong>${wertHtml}</strong><small>${unterHtml}</small></div>`
}

/**
 * Die vier Kennzahlen.
 * @returns HTML
 */
function kennzahlen() {
  const alle = roadmap.meilensteine
  const abgeschlossen = alle.filter((m) => m.status === 'ABGESCHLOSSEN').length
  const aktueller = aktuellerMeilenstein(roadmap)
  const { abgenommen, gesamt } = zaehleRoadmap(roadmap)
  const features = aktueller?.features ?? []
  const idsMit = (kategorie) => features.filter((f) => statusKategorie(f.status) === kategorie).map((f) => f.id)
  const offen = features.filter((f) => f.status !== 'ABGESCHLOSSEN' && f.status !== 'ABGEBROCHEN').length
  return `<div class="roadmap-kennzahlen">
      ${kennzahl({
        eyebrow: t('roadmap.kennzahl.meilensteine'),
        wertHtml: tHtml('roadmap.kennzahl.meilensteine.wert', { abgeschlossen: formatiereZahl(abgeschlossen), gesamt: formatiereZahl(alle.length) }),
        unterHtml: aktueller !== null ? tHtml('roadmap.kennzahl.meilensteine.unter', { id: aktueller.id }) : '–',
      })}
      ${kennzahl({
        eyebrow: t('roadmap.kennzahl.features'),
        wertHtml: tHtml('roadmap.kennzahl.features.wert', { abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) }),
        unterHtml: tHtml('roadmap.kennzahl.features.unter', { inArbeit: idListe(idsMit('in_arbeit')), geplant: idListe(idsMit('geplant')) }),
      })}
      ${kennzahl({
        eyebrow: aktueller !== null ? t('roadmap.kennzahl.bis', { id: aktueller.id }) : t('roadmap.kennzahl.bisOhne'),
        wertHtml: tHtml('roadmap.kennzahl.bis.wert'),
        unterHtml: `${tHtml('roadmap.kennzahl.bis.unter', { anzahl: offen, zahl: formatiereZahl(offen) })}`,
        klasse: 'betont',
      })}
      ${kennzahl({ eyebrow: t('roadmap.kennzahl.planIst'), wertHtml: kommtBadge(), unterHtml: tHtml('roadmap.kennzahl.planIst.unter'), klasse: 'kommt' })}
    </div>`
}

// ─── Baum und Detailpanel ─────────────────────────────────────────────────────

/**
 * Eine Feature-Zeile des Baums.
 * @param meilenstein - übergeordneter Meilenstein
 * @param feature - { id, titel?, status }
 * @param gewaehlt - gewählter Eintrag
 * @returns HTML
 */
function featureZeile(meilenstein, feature, gewaehlt) {
  const istGewaehlt = gewaehlt?.art === 'feature' && gewaehlt.feature === feature
  return `<li class="rm-zeile rm-feature${istGewaehlt ? ' gewaehlt' : ''}">
      <span class="rm-einzug" aria-hidden="true"></span>
      <button type="button" class="rm-waehlen" data-roadmap-waehlen="feature" data-meilenstein="${escapeHtml(meilenstein.id)}" data-id="${escapeHtml(feature.id)}" aria-pressed="${istGewaehlt}">
        <span class="rm-name"><span class="rm-punkt rm-punkt-feature" aria-hidden="true"></span><span class="rm-name-text">${escapeHtml(titelVon(feature))}</span></span>
        <small><code>${escapeHtml(feature.id)}</code> · ${tHtml('typ.feature')}</small>
      </button>
      <span class="rm-status">${statusText(feature.status)}</span>
      <span class="rm-achse" aria-hidden="true"></span>
    </li>`
}

/**
 * Eine Meilensteingruppe des Baums: Kopfzeile mit Auf-/Zuklappen und Auswahl, darunter die Features.
 * @param meilenstein - Eintrag
 * @param aktueller - aktueller Meilenstein
 * @param gewaehlt - gewählter Eintrag
 * @returns HTML
 */
function meilensteinGruppe(meilenstein, aktueller, gewaehlt) {
  const offen = istAufgeklappt(meilenstein, aktueller)
  const { abgenommen, gesamt } = zaehleMeilenstein(meilenstein)
  const istGewaehlt = gewaehlt?.art === 'meilenstein' && gewaehlt.meilenstein === meilenstein
  const listenId = `rm-features-${escapeHtml(meilenstein.id)}`
  const features = meilenstein.features.length === 0 ? `<li class="rm-leer">${tHtml('roadmap.meilenstein.leer')}</li>` : meilenstein.features.map((f) => featureZeile(meilenstein, f, gewaehlt)).join('')
  return `<li class="rm-gruppe${meilenstein === aktueller ? ' aktuell' : ''}">
      <div class="rm-zeile rm-meilenstein${istGewaehlt ? ' gewaehlt' : ''}">
        <button type="button" class="rm-klappe" data-roadmap-klappe="${escapeHtml(meilenstein.id)}" aria-expanded="${offen}" aria-controls="${listenId}" aria-label="${tHtml(offen ? 'roadmap.baum.zuklappen' : 'roadmap.baum.aufklappen', { titel: titelVon(meilenstein) })}"><span aria-hidden="true">›</span></button>
        <button type="button" class="rm-waehlen" data-roadmap-waehlen="meilenstein" data-meilenstein="${escapeHtml(meilenstein.id)}" data-id="${escapeHtml(meilenstein.id)}" aria-pressed="${istGewaehlt}">
          <span class="rm-name">${meilenstein === aktueller ? `<span class="eyebrow">${tHtml('roadmap.meilenstein.aktuell')}</span>` : ''}<span class="rm-punkt rm-punkt-meilenstein" aria-hidden="true"></span><strong>${escapeHtml(titelVon(meilenstein))}</strong></span>
          <small><code>${escapeHtml(meilenstein.id)}</code> · ${tHtml('typ.meilenstein')} · ${tHtml('roadmap.meilenstein.abgenommen', { abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) })}</small>
        </button>
        <span class="rm-status">${statusText(meilenstein.status)}</span>
        <span class="rm-achse" aria-hidden="true"></span>
      </div>
      <ul class="rm-features" id="${listenId}"${offen ? '' : ' hidden'}>${features}</ul>
    </li>`
}

/**
 * Inhalt des Detailpanels für ein Feature: Ziel aus der Akte (lädt einmal je ID).
 * @param feature - { id, status }
 * @returns HTML
 */
function featureInhalt(feature) {
  if (statusKategorie(feature.status) === 'ohne_akte') return `<span class="subtle">${tHtml('roadmap.detail.ohneAkte')}</span>`
  const akte = akten.get(feature.id)
  if (akte === undefined || akte.status === 'laedt') return `<span class="subtle">${tHtml('roadmap.laedt')}</span>`
  if (akte.status === 'fehler') return `<span class="unbekannt">${tHtml('uebersicht.nichtVerfuegbar')}</span>`
  const ziel = typeof akte.daten?.ziel === 'string' && akte.daten.ziel.trim() !== '' ? akte.daten.ziel : null
  return ziel === null ? `<span class="subtle">${tHtml('roadmap.detail.keinZiel')}</span>` : `<span class="rm-detail-ziel" title="${escapeHtml(ziel)}">${escapeHtml(ziel)}</span>`
}

/**
 * Das Detailpanel des gewählten Eintrags mit „Frag Jarvis dazu“ und „Anpassen“ („kommt“).
 * @param gewaehlt - gewählter Eintrag oder null
 * @returns HTML
 */
function detailPanel(gewaehlt) {
  if (gewaehlt === null) return `<aside class="rm-detail" aria-label="${tHtml('roadmap.detail.titel')}"><p class="subtle">${tHtml('roadmap.keineMeilensteine')}</p></aside>`
  const istFeature = gewaehlt.art === 'feature'
  const eintrag = istFeature ? gewaehlt.feature : gewaehlt.meilenstein
  const felder = [
    [t('roadmap.detail.id'), `<code>${escapeHtml(eintrag.id)}</code>`],
    [t('roadmap.detail.teilVon'), istFeature ? escapeHtml(`${gewaehlt.meilenstein.id} · ${titelVon(gewaehlt.meilenstein)}`) : tHtml('roadmap.detail.roadmap')],
  ]
  if (istFeature) felder.push([t('roadmap.detail.ziel'), featureInhalt(eintrag)])
  else {
    const { abgenommen, gesamt } = zaehleMeilenstein(eintrag)
    felder.push([t('roadmap.detail.inhalt'), tHtml('roadmap.detail.meilensteinInhalt', { anzahl: gesamt, abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) })])
  }
  felder.push([t('roadmap.detail.schaetzung'), kommtBadge()])
  const link = istFeature && statusKategorie(eintrag.status) !== 'ohne_akte' ? `<a class="text-link" href="#/workboard/${encodeURIComponent(eintrag.id)}">${tHtml('roadmap.detail.oeffnen')} <span aria-hidden="true">→</span></a>` : ''
  const chips = ['reihenfolge', 'blockiert', 'schaetzung'].map((f) => `<button type="button" class="rm-frage-chip" data-roadmap-jarvis-frage="${f}">${tHtml(`roadmap.jarvis.frage.${f}`)}</button>`).join('')
  return `<aside class="rm-detail" aria-labelledby="rm-detail-titel">
      <div class="rm-detail-kopf">
        ${typChip(istFeature ? 'feature' : 'meilenstein')}
        <h3 id="rm-detail-titel">${escapeHtml(titelVon(eintrag))}</h3>
        ${statusText(eintrag.status)}
      </div>
      <dl class="rm-detail-felder">${felder.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${v}</dd>`).join('')}</dl>
      ${link}
      <div class="rm-jarvis">
        <label class="eyebrow" for="roadmap-jarvis-eingabe">${tHtml('roadmap.jarvis.titel')}</label>
        <div class="rm-frage-chips">${chips}</div>
        <div class="rm-frage-zeile">
          <input id="roadmap-jarvis-eingabe" type="text" placeholder="${tHtml('roadmap.jarvis.platzhalter')}" />
          <button type="button" class="button primary" data-roadmap-jarvis-fragen>${tHtml('roadmap.jarvis.fragen')}</button>
        </div>
        <p class="subtle">${tHtml('roadmap.jarvis.hinweis')}</p>
      </div>
      <div class="rm-anpassen">${kommtKnopf(t('roadmap.detail.anpassen'))}</div>
    </aside>`
}

/**
 * Gesamte Roadmap: Werkzeugzeile, Baum, Zeile der ausgeblendeten Meilensteine, Detailpanel.
 * @returns HTML
 */
function gesamteRoadmap() {
  if (roadmap.meilensteine.length === 0) return `<p class="subtle">${tHtml('roadmap.keineMeilensteine')}</p>`
  const { aktueller, offen, abgeschlossen } = reihenfolge()
  const gewaehlt = gewaehlterEintrag()
  if (gewaehlt?.art === 'feature') stelleAkteSicher(gewaehlt.feature)
  const sichtbar = [...offen, ...(abgeschlosseneSichtbar ? abgeschlossen : [])]
  const alleAuf = sichtbar.length > 0 && sichtbar.every((m) => istAufgeklappt(m, aktueller))
  const zusammen = abgeschlossen.map(zaehleMeilenstein).reduce((s, z) => ({ abgenommen: s.abgenommen + z.abgenommen, gesamt: s.gesamt + z.gesamt }), { abgenommen: 0, gesamt: 0 })
  const ausgeblendet =
    abgeschlossen.length === 0
      ? ''
      : `<li class="rm-ausgeblendet">
        <span aria-hidden="true">✓</span>
        <span>${tHtml(abgeschlosseneSichtbar ? 'roadmap.baum.abgeschlossenSichtbar' : 'roadmap.baum.abgeschlossenAus', { anzahl: abgeschlossen.length, zahl: formatiereZahl(abgeschlossen.length), abgenommen: formatiereZahl(zusammen.abgenommen), gesamt: formatiereZahl(zusammen.gesamt) })}</span>
        <button type="button" class="button" data-roadmap-abgeschlossene aria-pressed="${abgeschlosseneSichtbar}">${tHtml(abgeschlosseneSichtbar ? 'roadmap.baum.ausblenden' : 'roadmap.baum.einblenden')}</button>
      </li>`
  const legende = `${typChip('meilenstein')}${typChip('feature')}<span class="rm-legende-trenner" aria-hidden="true"></span>${STATUS_KATEGORIEN.slice(0, 5)
    .map((k) => `<span>${symbol(k)} ${tHtml(`roadmap.status.${k}`)}</span>`)
    .join('')}`
  return `<div class="rm-werkzeuge">
      <div class="rm-legende" role="group" aria-label="${tHtml('roadmap.legende')}">${legende}</div>
      <div class="rm-knoepfe">
        <div class="rm-massstab" role="group" aria-label="${tHtml('roadmap.massstab')}">${kommtKnopf(t('roadmap.massstab.tage'))}${kommtKnopf(t('roadmap.massstab.wochen'))}</div>
        <button type="button" class="button" data-roadmap-alles aria-pressed="${alleAuf}">${tHtml(alleAuf ? 'roadmap.baum.allesZu' : 'roadmap.baum.allesAuf')}</button>
      </div>
    </div>
    <div class="rm-raster">
      <div class="rm-baum-rahmen">
        <div class="rm-kopfzeile" aria-hidden="true"><span>${tHtml('roadmap.spalte.eintrag')}</span><span>${tHtml('roadmap.spalte.status')}</span><span class="rm-achse-kopf">${tHtml('roadmap.zeitachse')} ${kommtBadge()}</span></div>
        <ul class="rm-baum" aria-label="${tHtml('roadmap.baum.titel')}">
          ${offen.map((m) => meilensteinGruppe(m, aktueller, gewaehlt)).join('')}
          ${ausgeblendet}
          ${abgeschlosseneSichtbar ? abgeschlossen.map((m) => meilensteinGruppe(m, aktueller, gewaehlt)).join('') : ''}
        </ul>
        <p class="roadmap-fussnote">${tHtml('roadmap.zeitplanung.hinweis')}</p>
      </div>
      ${detailPanel(gewaehlt)}
    </div>`
}

/**
 * Lädt die Akte eines gewählten Features einmal (Ziel im Detailpanel).
 * @param feature - { id, status }
 */
function stelleAkteSicher(feature) {
  if (akten.has(feature.id) || statusKategorie(feature.status) === 'ohne_akte') return
  akten.set(feature.id, { status: 'laedt' })
  const nummer = roadmapAnfrageZaehler
  holeFeatureAkte(feature.id).then(
    (daten) => {
      if (nummer !== roadmapAnfrageZaehler) return
      akten.set(feature.id, { status: 'ok', daten })
      render()
    },
    (fehler) => {
      if (nummer !== roadmapAnfrageZaehler) return
      console.error(`GET …/features/${feature.id}/akte fehlgeschlagen:`, fehler)
      akten.set(feature.id, { status: 'fehler' })
      render()
    }
  )
}

// ─── Entwicklungsstand und Noch nicht eingeplant ──────────────────────────────

/**
 * Eine Zeile des Entwicklungsstands.
 * @param eintrag - aus waehleEntwicklungsstand
 * @returns HTML
 */
function standZeile(eintrag) {
  const chipTyp = chipTypVonWorkitem(eintrag.typ)
  const chip = chipTyp === null ? `<span class="typ-chip typ-chip-neutral">${escapeHtml(String(eintrag.typ ?? ''))}</span>` : typChip(chipTyp, { zusatz: eintrag.prioritaet ?? '' })
  const ohneAkte = eintrag.art === 'feature' && statusKategorie(eintrag.status) === 'ohne_akte'
  const status = eintrag.art === 'feature' ? statusText(eintrag.status) : `<span class="roadmap-status" title="${escapeHtml(eintrag.status ?? '')}">${tHtml('uebersicht.stand.offen')}</span>`
  const oeffnen = ohneAkte ? '' : `<a class="button" href="#/workboard/${encodeURIComponent(eintrag.id)}">${tHtml('roadmap.stand.oeffnen')}</a>`
  return `<tr>
      <td><span class="rm-stand-titel">${escapeHtml(titelVon(eintrag))}</span><small><code>${escapeHtml(eintrag.id)}</code></small></td>
      <td>${chip}</td>
      <td>${status}</td>
      <td>${kommtKnopf(eintrag.prioritaet ?? t('uebersicht.stand.ohnePrioritaet'))}</td>
      <td>${oeffnen}</td>
    </tr>`
}

/**
 * Entwicklungsstand mit Filter (zieht aus der Produktübersicht hierher).
 * @returns HTML
 */
function entwicklungsstand() {
  const filter = Object.keys(STAND_FILTER)
    .map((f) => `<button type="button" class="filter-chip" data-roadmap-stand="${f}" aria-pressed="${standFilter === f}">${tHtml(`roadmap.stand.filter.${f}`)}</button>`)
    .join('')
  const kopf = `<div class="section-label">
      <div><h2>${tHtml('uebersicht.stand.titel')}</h2><p class="subtle">${tHtml('roadmap.stand.text')}</p></div>
      <div class="rm-stand-filter" role="group" aria-label="${tHtml('roadmap.stand.filter')}">${filter}</div>
    </div>`
  const meilenstein = aktuellerMeilenstein(roadmap)
  const typen = STAND_FILTER[standFilter]
  const { eintraege, gesamt } = waehleEntwicklungsstand(meilenstein, workitems, STAND_MAX, typen === null ? {} : { typen })
  const hinweise = []
  if (workitems === undefined) hinweise.push(tHtml('roadmap.laedt'))
  if (workitems === null) hinweise.push(tHtml('uebersicht.stand.befundeNichtVerfuegbar'))
  let inhalt = ''
  if (eintraege.length > 0) {
    inhalt = `<div class="rm-stand-scroll"><table class="rm-stand">
        <thead><tr><th scope="col">${tHtml('roadmap.stand.spalte.eintrag')}</th><th scope="col">${tHtml('roadmap.stand.spalte.typ')}</th><th scope="col">${tHtml('roadmap.stand.spalte.status')}</th><th scope="col">${tHtml('roadmap.stand.spalte.prioritaet')}</th><th scope="col"><span class="sr-only">${tHtml('roadmap.stand.oeffnen')}</span></th></tr></thead>
        <tbody>${eintraege.map(standZeile).join('')}</tbody>
      </table></div>`
    if (gesamt > eintraege.length) inhalt += `<p class="subtle">${tHtml('roadmap.stand.weitere', { anzahl: gesamt - eintraege.length, zahl: formatiereZahl(gesamt - eintraege.length) })}</p>`
  } else if (hinweise.length === 0) inhalt = `<p class="subtle">${tHtml('roadmap.stand.leer')}</p>`
  return `<section class="rm-entwicklungsstand">${kopf}${inhalt}${hinweise.map((h) => `<p class="subtle">${h}</p>`).join('')}<p class="rm-stand-alle"><a class="text-link" href="#/workboard">${tHtml('uebersicht.stand.alle')} <span aria-hidden="true">→</span></a></p></section>`
}

/**
 * „Noch nicht eingeplant“ (F44 D3).
 * @returns HTML
 */
function nichtEingeplantAbschnitt() {
  const kopf = `<div class="section-label">
      <h2>${tHtml('roadmap.nichtEingeplant.titel')}</h2>
      <a class="text-link" href="#/workboard">${tHtml('roadmap.arbeitsvorrat')} <span aria-hidden="true">→</span></a>
    </div>`
  let inhalt
  if (workitems === undefined) inhalt = `<p class="subtle">${tHtml('roadmap.laedt')}</p>`
  else if (workitems === null) inhalt = `<p class="subtle">${tHtml('roadmap.nichtEingeplant.nichtVerfuegbar')}</p>`
  else {
    const liste = nichtEingeplant(roadmap, workitems.filter((w) => w?.typ === 'FEATURE')) ?? []
    if (liste.length === 0) inhalt = `<p class="subtle">${tHtml('roadmap.nichtEingeplant.alle')}</p>`
    else {
      inhalt = `<div class="unplanned-chips">${liste
        .map((w) => `<a class="roadmap-chip" href="#/workboard/${encodeURIComponent(w.id)}"><code>${escapeHtml(w.id)}</code><span class="chip-title">${escapeHtml(titelVon(w))}</span></a>`)
        .join('')}</div>`
    }
  }
  return `<section class="roadmap-nicht-eingeplant">${kopf}${inhalt}</section>`
}

// ─── Hauptteil ────────────────────────────────────────────────────────────────

/**
 * Hauptteil je Zustand.
 * @returns HTML
 */
function hauptteil() {
  const zustand = roadmapZustand(roadmap)
  if (zustand === 'laedt') return `<p class="subtle">${tHtml('roadmap.laedt')}</p>`
  if (zustand === 'nicht_vorhanden') {
    return `<section class="empty">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /></svg>
        <h2>${tHtml('roadmap.leer.titel')}</h2>
        <p>${tHtml('roadmap.leer.text')}</p>
      </section>${nichtEingeplantAbschnitt()}`
  }
  if (zustand === 'ungueltig') {
    const anzahl = roadmap.fehler.length
    return `<div class="note red roadmap-fehler">
        <strong>${tHtml('roadmap.ungueltig.titel', { anzahl })}</strong>
        <p>${tHtml('roadmap.ungueltig.text')}</p>
        ${anzahl === 0 ? '' : `<details><summary>${tHtml('roadmap.ungueltig.details')}</summary><ul>${roadmap.fehler.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul></details>`}
      </div>`
  }
  if (zustand === 'fehler') {
    const grund = typeof roadmap.grund === 'string' && roadmap.grund !== '' ? `<p><code>${escapeHtml(roadmap.grund)}</code></p>` : ''
    return `<div class="note red roadmap-fehler">
        <strong>${tHtml('roadmap.fehler.titel')}</strong>
        <p>${tHtml('roadmap.fehler.text')}</p>
        ${grund}
        <button type="button" class="button" data-roadmap-erneut>${tHtml('roadmap.fehler.erneut')}</button>
      </div>`
  }
  return `${kennzahlen()}
    <section class="rm-gesamt" aria-labelledby="rm-gesamt-titel">
      <div class="rm-gesamt-kopf">
        <h2 id="rm-gesamt-titel">${tHtml('roadmap.gesamt.titel')}</h2>
        <p class="subtle">${tHtml('roadmap.gesamt.text')}</p>
      </div>
      ${gesamteRoadmap()}
    </section>
    ${entwicklungsstand()}
    ${nichtEingeplantAbschnitt()}`
}

/**
 * Rendert die ganze Seite in #view-roadmap; Fokus (über data-Attribute) und der Text im Fragefeld
 * bleiben erhalten. Ein fehlender Container wird gemeldet, nicht geworfen.
 */
function render() {
  const container = document.getElementById('view-roadmap')
  if (container === null) {
    console.error('roadmap: Container view-roadmap fehlt')
    return
  }
  const eingabe = document.getElementById('roadmap-jarvis-eingabe')
  const text = eingabe?.value ?? ''
  const aktiv = document.activeElement
  // Element fehlt außerhalb des Browsers (node:test mit Schein-DOM) — dort gibt es keinen Fokus.
  const fokusSelektor = typeof Element !== 'undefined' && aktiv instanceof Element && container.contains(aktiv) ? fokusSchluessel(aktiv) : null
  container.innerHTML = `${seitenkopf()}${hauptteil()}`
  const neueEingabe = document.getElementById('roadmap-jarvis-eingabe')
  if (neueEingabe !== null) neueEingabe.value = text
  if (fokusSelektor !== null) container.querySelector(fokusSelektor)?.focus()
}

/**
 * Selektor, mit dem ein fokussiertes Bedienelement nach dem Neuschreiben wiedergefunden wird.
 * @param element - fokussiertes Element
 * @returns CSS-Selektor oder null
 */
function fokusSchluessel(element) {
  if (element.id === 'roadmap-jarvis-eingabe') return '#roadmap-jarvis-eingabe'
  for (const attribut of ['data-roadmap-klappe', 'data-roadmap-stand', 'data-roadmap-jarvis-frage']) {
    if (element.hasAttribute(attribut)) return `[${attribut}="${CSS.escape(element.getAttribute(attribut))}"]`
  }
  if (element.hasAttribute('data-roadmap-waehlen')) return `[data-roadmap-waehlen="${CSS.escape(element.getAttribute('data-roadmap-waehlen'))}"][data-id="${CSS.escape(element.getAttribute('data-id'))}"][data-meilenstein="${CSS.escape(element.getAttribute('data-meilenstein'))}"]`
  for (const attribut of ['data-roadmap-alles', 'data-roadmap-abgeschlossene', 'data-roadmap-jarvis-fragen', 'data-roadmap-jarvis-kopf']) {
    if (element.hasAttribute(attribut)) return `[${attribut}]`
  }
  return null
}

// ─── Laden und Bedienung ─────────────────────────────────────────────────────

/**
 * Lädt Roadmap und Workitems neu (beim Betreten, bei Projektwechsel, über „Erneut laden“). Beide
 * Abrufe laufen parallel, scheitern unabhängig und rendern je für sich. Eine überholte Antwort wird
 * verworfen; Auswahl und Aufklappzustand bleiben nur innerhalb desselben Projekts.
 * @param optionen - { fokus: true } setzt danach den Fokus auf die Überschrift
 */
async function ladeRoadmap(optionen = {}) {
  const meineAnfrageNummer = ++roadmapAnfrageZaehler
  const aktuell = () => meineAnfrageNummer === roadmapAnfrageZaehler
  roadmap = null
  workitems = undefined
  akten.clear()
  render()
  const roadmapAbruf = holeRoadmap().then(
    (antwort) => {
      if (!aktuell()) return
      roadmap = antwort
      render()
    },
    (fehler) => {
      if (!aktuell()) return
      console.error('GET …/roadmap fehlgeschlagen:', fehler)
      roadmap = { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
      render()
    }
  )
  const workitemsAbruf = holeWorkitems().then(
    (antwort) => {
      if (!aktuell()) return
      workitems = Array.isArray(antwort?.workitems) ? antwort.workitems : null
      render()
    },
    (fehler) => {
      if (!aktuell()) return
      console.error('GET …/workitems fehlgeschlagen:', fehler)
      workitems = null
      render()
    }
  )
  await Promise.all([roadmapAbruf, workitemsAbruf])
  if (optionen.fokus === true && aktuell()) document.querySelector('#view-roadmap h1')?.focus()
}

/**
 * Text für „Frag Jarvis dazu“: die Frage plus der Bezug auf den gewählten Eintrag.
 * @param frage - Fragetext (übersetzt oder vom Nutzer)
 * @returns Entwurf für die Chat-Eingabe
 */
function jarvisEntwurf(frage) {
  const gewaehlt = roadmapZustand(roadmap) === 'ok' ? gewaehlterEintrag() : null
  if (gewaehlt === null) return frage
  const eintrag = gewaehlt.art === 'feature' ? gewaehlt.feature : gewaehlt.meilenstein
  return t('roadmap.jarvis.entwurf', { frage, typ: t(`typ.${gewaehlt.art}`), id: eintrag.id, titel: titelVon(eintrag) }).trim()
}

/**
 * Klick-Behandlung der Seite (Delegation).
 * @param ereignis - Klick
 */
function beiKlick(ereignis) {
  if (!(ereignis.target instanceof Element)) return
  const ziel = ereignis.target
  if (ziel.closest('[data-roadmap-erneut]') !== null) {
    void ladeRoadmap({ fokus: true })
    return
  }
  const kopf = ziel.closest('[data-roadmap-jarvis-kopf]')
  if (kopf !== null) {
    oeffneChatMitEntwurf({ modus: 'jarvis', entwurf: t('roadmap.jarvis.kopfEntwurf', { projekt: holeAktivesProjekt().name }) }, kopf)
    return
  }
  const frage = ziel.closest('[data-roadmap-jarvis-frage]')
  if (frage !== null) {
    oeffneChatMitEntwurf({ modus: 'jarvis', entwurf: jarvisEntwurf(t(`roadmap.jarvis.frage.${frage.getAttribute('data-roadmap-jarvis-frage')}`)) }, frage)
    return
  }
  const fragen = ziel.closest('[data-roadmap-jarvis-fragen]')
  if (fragen !== null) {
    const eingabe = document.getElementById('roadmap-jarvis-eingabe')
    oeffneChatMitEntwurf({ modus: 'jarvis', entwurf: jarvisEntwurf((eingabe?.value ?? '').trim()) }, fragen)
    return
  }
  const klappe = ziel.closest('[data-roadmap-klappe]')
  if (klappe !== null && roadmapZustand(roadmap) === 'ok') {
    const { aktueller } = reihenfolge()
    if (aufgeklappt === null) aufgeklappt = new Set(aktueller === null ? [] : [aktueller.id])
    const id = klappe.getAttribute('data-roadmap-klappe')
    if (aufgeklappt.has(id)) aufgeklappt.delete(id)
    else aufgeklappt.add(id)
    render()
    return
  }
  const waehlen = ziel.closest('[data-roadmap-waehlen]')
  if (waehlen !== null) {
    auswahl = { art: waehlen.getAttribute('data-roadmap-waehlen'), id: waehlen.getAttribute('data-id'), meilensteinId: waehlen.getAttribute('data-meilenstein') }
    render()
    return
  }
  if (ziel.closest('[data-roadmap-alles]') !== null && roadmapZustand(roadmap) === 'ok') {
    const { aktueller, offen, abgeschlossen } = reihenfolge()
    const sichtbar = [...offen, ...(abgeschlosseneSichtbar ? abgeschlossen : [])]
    const alleAuf = sichtbar.every((m) => istAufgeklappt(m, aktueller))
    aufgeklappt = new Set(alleAuf ? [] : sichtbar.map((m) => m.id))
    render()
    return
  }
  if (ziel.closest('[data-roadmap-abgeschlossene]') !== null) {
    abgeschlosseneSichtbar = !abgeschlosseneSichtbar
    render()
    return
  }
  const stand = ziel.closest('[data-roadmap-stand]')
  if (stand !== null) {
    standFilter = stand.getAttribute('data-roadmap-stand')
    render()
  }
}

/** Registriert #/roadmap, die Bedienung und das Neuladen bei Projektwechsel. Einmalig beim Bootstrap. */
export function initRoadmapView() {
  const container = document.getElementById('view-roadmap')
  container?.addEventListener('click', beiKlick)
  container?.addEventListener('keydown', (ereignis) => {
    // Enter im Fragefeld wirkt wie „Fragen“ (befüllt nur den Chat, sendet nicht).
    if (ereignis.key === 'Enter' && ereignis.target instanceof Element && ereignis.target.id === 'roadmap-jarvis-eingabe') {
      ereignis.preventDefault()
      document.querySelector('[data-roadmap-jarvis-fragen]')?.click()
    }
  })
  registriere(/^#\/roadmap$/, 'roadmap', () => {
    void ladeRoadmap()
  })
  abonniereProjektWechsel(() => {
    auswahl = null
    aufgeklappt = null
    abgeschlosseneSichtbar = false
    standFilter = 'alle'
    void ladeRoadmap()
  })
}
