/**
 * Datei: public/leitstand/views/projektakte.js
 *
 * Zweck: Seite `#/projektakte` (F46 D1, Design 09-entscheidungen--Projektakte, abgleich-f46.md
 * §4.3): was jede Rolle über dieses Projekt wissen muss, an einer Stelle — lesend. Die Seitenleiste
 * markiert dabei „Roadmap“ (index.html data-nav-auch, router.js).
 * - Vision aus GET …/roadmap (roadmap.json · vision).
 * - Für wen und Führungsprinzip aus beschreibung.md (Abschnitte gleichen Namens), Bewusst nicht aus
 *   dem Abschnitt „Nicht das Ziel“ derselben Datei, Arbeitsweise aus anweisungen.md, Lage aus
 *   lagebild.md (Abschnitt „Aktuelle Phase“, der Rest aufklappbar) — alle über GET …/projektakte.
 * - Ziel dieser Version und Erfolgskriterien aus der Zielfassung, nur wenn die Route sie eindeutig
 *   gefunden hat; sonst Baustein „kommt“.
 * - Wer diese Akte bekommt (projektakte-anzeige.js AKTE_EMPFAENGER, per Test gegen den Server
 *   geprüft), Quellen mit Pfad und VS-Code-Link, „Änderung vorschlagen“ als „kommt“.
 *
 * Zustände: Lädt · Abruffehler (mit „Erneut laden“) · je Datei fehlt / nicht lesbar / gekürzt ·
 * Abschnitt nicht gefunden. Ein Fehler einer Quelle blendet die anderen nicht aus.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initProjektakteView beim Bootstrap, vor starteRouter())
 *
 * Wichtig:
 * - Laden nur beim Betreten und bei einem Projektwechsel, nie aus dem Poll; Überholschutz über
 *   einen Anfragezähler (Muster views/roadmap.js).
 * - Dateiinhalte, Vision, Pfade und Rollennamen aus Dateien sind Projektinhalte: nie übersetzt,
 *   immer escaped, als Klartext-Absätze (kein Markdown-zu-HTML). Alle übrigen Texte über t().
 * - Keine Schreibaktion: Links, „Erneut laden“ und ein Baustein „kommt“.
 */

import { holeProjektakte, holeRoadmap } from '../api.js'
import { t, tHtml } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { baueVsCodeLink } from '../kopf-werkzeuge.js'
import { planungsRegister, zurueckZurUebersicht } from '../produktplanung-kopf.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { AKTE_EMPFAENGER, abschnitt, absaetzeHtml, dateiZustand, hauptabschnitte, versionsziel } from '../projektakte-anzeige.js'
import { escapeHtml } from '../render.js'
import { roadmapZustand } from '../roadmap-anzeige.js'
import { registriere } from '../router.js'

/** Antwort von GET …/projektakte: null = lädt, { status: 'fehler', grund } nach einem Wurf. */
let akte = null

/** Antwort von GET …/roadmap: null = lädt, { status: 'fehler', grund } nach einem Wurf. */
let roadmap = null

/** Überholschutz für ladeAkte. */
let anfrageZaehler = 0

/** Reihenfolge der Quellen in der Seitenspalte. */
const QUELLEN = ['beschreibung', 'anweisungen', 'lagebild', 'zielfassung', 'roadmap']

/**
 * Eine Karte mit Eyebrow, Inhalt und optionaler Quellzeile.
 * @param optionen - { eyebrow (Text), inhalt (HTML), quelle (Text oder ''), klasse }
 * @returns HTML
 */
function karte({ eyebrow, inhalt, quelle = '', klasse = '' }) {
  return `<section class="akte-karte${klasse ? ` ${klasse}` : ''}">
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      ${inhalt}
      ${quelle ? `<p class="akte-quelle-zeile">${escapeHtml(quelle)}</p>` : ''}
    </section>`
}

/**
 * Hinweis für eine Datei, die nicht ok ist (lädt, fehlt, Fehler) — sonst null.
 * @param schluessel - Dateischlüssel
 * @returns HTML oder null
 */
function dateiHinweis(schluessel) {
  if (akte?.status === 'fehler') return `<p class="unbekannt">${tHtml('akte.nichtVerfuegbar')}</p>`
  const { zustand, datei } = dateiZustand(akte, schluessel)
  if (zustand === 'laedt') return `<p class="subtle">${tHtml('uebersicht.laedt')}</p>`
  if (zustand === 'fehlt') return `<p class="subtle">${tHtml('akte.datei.fehlt', { pfad: datei.pfad })}</p>`
  if (zustand === 'fehler') return `<p class="unbekannt">${tHtml('akte.datei.fehler', { pfad: datei?.pfad ?? schluessel })}</p>`
  return null
}

/**
 * Hinweis „gekürzt“ unter einem Dateitext.
 * @param schluessel - Dateischlüssel
 * @returns HTML oder ''
 */
function gekuerztHinweis(schluessel) {
  return akte?.dateien?.[schluessel]?.gekuerzt === true ? `<p class="subtle">${tHtml('akte.gekuerzt')}</p>` : ''
}

/**
 * Inhalt eines benannten Abschnitts einer Datei als Absätze, sonst ein Hinweis.
 * @param schluessel - Dateischlüssel
 * @param titel - Abschnittsüberschrift in der Datei (Projektinhalt, nicht übersetzt)
 * @returns { html, quelle } — quelle ist die Quellzeile (Text) oder ''
 */
function abschnittInhalt(schluessel, titel) {
  const hinweis = dateiHinweis(schluessel)
  const pfad = akte?.dateien?.[schluessel]?.pfad ?? ''
  if (hinweis !== null) return { html: hinweis, quelle: '' }
  const text = abschnitt(akte.dateien[schluessel].text ?? '', titel)
  if (text === null) return { html: `<p class="subtle">${tHtml('akte.abschnitt.fehlt', { titel, pfad })}</p>`, quelle: '' }
  return { html: absaetzeHtml(text) + gekuerztHinweis(schluessel), quelle: t('akte.quelle.abschnitt', { pfad, titel }) }
}

/** @returns HTML der Karte Vision */
function visionKarte() {
  const zustand = roadmapZustand(roadmap)
  let inhalt
  let quelle = ''
  if (zustand === 'laedt') inhalt = `<p class="subtle">${tHtml('uebersicht.laedt')}</p>`
  else if (zustand === 'ok' && typeof roadmap.vision === 'string' && roadmap.vision.trim() !== '') {
    inhalt = `<p class="akte-vision-text">${escapeHtml(roadmap.vision)}</p>`
    quelle = t('akte.quelle.vision', { pfad: akte?.dateien?.roadmap?.pfad ?? 'roadmap.json' })
  } else if (zustand === 'ok' || zustand === 'nicht_vorhanden') inhalt = `<p class="subtle">${tHtml('akte.vision.leer')}</p>`
  else inhalt = `<p class="unbekannt">${tHtml('uebersicht.nichtVerfuegbar')}</p>`
  return karte({ eyebrow: t('akte.vision'), inhalt, quelle, klasse: 'akte-vision' })
}

/** @returns HTML der Karte Ziel dieser Version (Zielsatz, Erfolgskriterien, Bewusst nicht) */
function zielKarte() {
  const ziel = versionsziel(akte)
  const meilenstein = ziel?.meilenstein ?? akte?.versionsziel?.meilenstein ?? null
  const eyebrow = meilenstein ? t('akte.ziel.mitMeilenstein', { meilenstein }) : t('akte.ziel')
  // Zustand der Quelle zuerst (Prüfpass D1 qa 1): lädt, Abruffehler, Zielfassung fehlt oder nicht
  // lesbar — erst wenn die Datei da ist und nichts eindeutig passt, ist es „kommt“.
  const laedtHtml = `<p class="subtle">${tHtml('uebersicht.laedt')}</p>`
  const status = akte?.versionsziel?.status
  let quellHinweis = null
  if (akte === null) quellHinweis = laedtHtml
  else if (akte.status === 'fehler') quellHinweis = `<p class="unbekannt">${tHtml('akte.nichtVerfuegbar')}</p>`
  else if (status === 'fehlt') quellHinweis = `<p class="subtle">${tHtml('akte.datei.fehlt', { pfad: akte.dateien?.zielfassung?.pfad ?? 'docs/projekt/zielfassung.md' })}</p>`
  else if (status === 'fehler') quellHinweis = `<p class="unbekannt">${tHtml('akte.datei.fehler', { pfad: akte.dateien?.zielfassung?.pfad ?? 'docs/projekt/zielfassung.md' })}</p>`

  let zielHtml
  if (quellHinweis !== null) zielHtml = quellHinweis
  else if (ziel === null) zielHtml = `<p class="subtle">${tHtml('akte.ziel.nichtEindeutig')} ${kommtBadge()}</p>`
  else zielHtml = `<p class="akte-text">${escapeHtml(ziel.zielsatz)}</p>`

  let kriterienHtml
  if (ziel?.kriterien) kriterienHtml = `<ul class="akte-liste">${ziel.kriterien.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}</ul>`
  else if (quellHinweis !== null) kriterienHtml = akte === null ? laedtHtml : '<p class="subtle">—</p>'
  else kriterienHtml = `<p class="subtle">${tHtml('akte.kriterien.nichtEindeutig')} ${kommtBadge()}</p>`

  const nicht = abschnittInhalt('beschreibung', 'Nicht das Ziel')
  const zielfassungPfad = akte?.dateien?.zielfassung?.pfad ?? 'docs/projekt/zielfassung.md'
  const zielQuelle = ziel !== null ? `<p class="akte-quelle-zeile">${tHtml('akte.quelle.zielfassung', { pfad: zielfassungPfad, meilenstein: ziel.meilenstein ?? '' })}</p>` : ''
  const inhalt = `${zielHtml}${zielQuelle}
      <div class="eyebrow akte-unter">${tHtml('akte.kriterien')}</div>
      ${kriterienHtml}
      <div class="eyebrow akte-unter">${tHtml('akte.bewusstNicht')}</div>
      ${nicht.html}
      ${nicht.quelle ? `<p class="akte-quelle-zeile">${escapeHtml(nicht.quelle)}</p>` : ''}`
  return karte({ eyebrow, inhalt })
}

/** @returns HTML der Karte Arbeitsweise (erster Abschnitt offen, die übrigen aufklappbar) */
function arbeitsweiseKarte() {
  const link = `<a class="text-link" href="#/capabilities">${tHtml('akte.werkstatt')} <span aria-hidden="true">→</span></a>`
  const hinweis = dateiHinweis('anweisungen')
  if (hinweis !== null) return karte({ eyebrow: t('akte.arbeitsweise'), inhalt: `${hinweis}${link}` })
  const text = akte.dateien.anweisungen.text ?? ''
  const teile = hauptabschnitte(text).filter((a) => a.text !== '')
  let inhalt
  if (teile.length === 0) inhalt = absaetzeHtml(text)
  else {
    const [erster, ...rest] = teile
    inhalt = `<p class="akte-zwischentitel">${escapeHtml(erster.titel)}</p>${absaetzeHtml(erster.text)}`
    if (rest.length > 0) {
      inhalt += `<details class="akte-mehr" data-akte-mehr="arbeitsweise"><summary>${tHtml('akte.arbeitsweise.mehr', { anzahl: rest.length })}</summary>${rest.map((a) => `<p class="akte-zwischentitel">${escapeHtml(a.titel)}</p>${absaetzeHtml(a.text)}`).join('')}</details>`
    }
  }
  return karte({ eyebrow: t('akte.arbeitsweise'), inhalt: `${inhalt}${gekuerztHinweis('anweisungen')}${link}`, quelle: t('akte.quelle.datei', { pfad: akte.dateien.anweisungen.pfad }) })
}

/** @returns HTML der Karte Lage (Abschnitt „Aktuelle Phase“ in einem Rollbereich, der Rest aufklappbar) */
function lageKarte() {
  const hinweis = dateiHinweis('lagebild')
  if (hinweis !== null) return karte({ eyebrow: t('akte.lage'), inhalt: hinweis })
  const text = akte.dateien.lagebild.text ?? ''
  const phase = abschnitt(text, 'Aktuelle Phase')
  const rest = hauptabschnitte(text).filter((a) => a.titel.trim().toLowerCase() !== 'aktuelle phase' && a.text !== '')
  const haupt = phase ?? text
  let inhalt = `<div class="akte-rollbereich" tabindex="0" role="region" aria-label="${tHtml('akte.lage')}">${absaetzeHtml(haupt)}</div>`
  if (phase !== null && rest.length > 0) {
    inhalt += `<details class="akte-mehr" data-akte-mehr="lage"><summary>${tHtml('akte.lage.mehr', { anzahl: rest.length })}</summary>${rest.map((a) => `<p class="akte-zwischentitel">${escapeHtml(a.titel)}</p>${absaetzeHtml(a.text)}`).join('')}</details>`
  }
  return karte({ eyebrow: t('akte.lage'), inhalt: inhalt + gekuerztHinweis('lagebild'), quelle: t('akte.quelle.erzeugt', { pfad: akte.dateien.lagebild.pfad }) })
}

/** @returns HTML der Seitenkarte „Wer diese Akte bekommt“ */
function empfaengerKarte() {
  const zeilen = AKTE_EMPFAENGER.map(({ rolle, bekommt }) => {
    const chip = bekommt ? `<span class="akte-chip akte-chip-ja">${tHtml('akte.empfaenger.ja')}</span>` : `<span class="akte-chip akte-chip-nein">${tHtml('akte.empfaenger.nein')}</span>`
    return `<li><span>${tHtml(`akte.empfaenger.${rolle}`)}</span>${chip}</li>`
  }).join('')
  return `<section class="akte-karte akte-empfaenger">
      <div class="eyebrow">${tHtml('akte.empfaenger')}</div>
      <ul class="akte-empfaenger-liste">${zeilen}</ul>
      <p class="akte-quelle-zeile">${tHtml('akte.empfaenger.hinweis')}</p>
    </section>`
}

/** @returns HTML der Seitenkarte Quellen (Pfad, VS-Code-Link, Status) */
function quellenKarte() {
  let liste
  if (akte === null) liste = `<p class="subtle">${tHtml('uebersicht.laedt')}</p>`
  else if (akte?.status === 'fehler') liste = `<p class="unbekannt">${tHtml('akte.nichtVerfuegbar')}</p>`
  else {
    liste = `<ul class="akte-quellen">${QUELLEN.map((schluessel) => {
      const datei = akte.dateien?.[schluessel]
      const pfad = typeof datei?.pfad === 'string' ? datei.pfad : schluessel
      const link = datei?.status === 'ok' ? baueVsCodeLink(datei.absolut) : null
      const code = `<code>${escapeHtml(pfad)}</code>`
      const status = datei?.status === 'ok' ? '' : ` <span class="subtle">${tHtml(datei?.status === 'fehlt' ? 'akte.quelle.fehlt' : 'akte.quelle.fehler')}</span>`
      const eintrag = link === null ? code : `<a href="${escapeHtml(link)}" title="${tHtml('akte.quelle.vscode')}">${code}</a>`
      return `<li>${eintrag}${status}</li>`
    }).join('')}</ul>`
  }
  return `<section class="akte-karte">
      <div class="eyebrow">${tHtml('akte.quellen')}</div>
      ${liste}
    </section>`
}

/** Rendert die ganze Seite; ein fehlender Container wird gemeldet, nicht geworfen. */
function render() {
  const container = document.getElementById('view-projektakte')
  if (container === null) {
    console.error('projektakte: Container view-projektakte fehlt')
    return
  }
  const fehler =
    akte?.status === 'fehler'
      ? `<div class="note red"><strong>${tHtml('akte.fehler.titel')}</strong><p>${tHtml('akte.fehler.text')}</p><button type="button" class="button" data-akte-erneut>${tHtml('roadmap.fehler.erneut')}</button></div>`
      : ''
  // Zwei Antworten rendern je für sich (Prüfpass D1 cr 7): aufgeklappte Bereiche und der Fokus auf
  // einem ihrer Auslöser bleiben über das Neuschreiben erhalten.
  const offen = new Set([...container.querySelectorAll('details[data-akte-mehr][open]')].map((d) => d.getAttribute('data-akte-mehr')))
  const fokusMehr = document.activeElement?.closest?.('details[data-akte-mehr]')?.getAttribute('data-akte-mehr') ?? null
  const fuerWen = abschnittInhalt('beschreibung', 'Für wen')
  const prinzip = abschnittInhalt('beschreibung', 'Führungsprinzip')
  container.innerHTML = `${zurueckZurUebersicht()}
    <div class="page-heading">
      <div>
        <div class="eyebrow">${tHtml('roadmap.eyebrow')}</div>
        <h1 tabindex="-1">${tHtml('akte.titel', { projekt: holeAktivesProjekt().name })}</h1>
        <p class="description">${tHtml('akte.beschreibung')}</p>
      </div>
      ${kommtKnopf(t('akte.aenderungVorschlagen'))}
    </div>
    ${planungsRegister('projektakte')}
    ${fehler}
    <div class="akte-layout">
      <div class="akte-haupt">
        ${visionKarte()}
        <div class="akte-paar">
          ${karte({ eyebrow: t('akte.fuerWen'), inhalt: fuerWen.html, quelle: fuerWen.quelle })}
          ${karte({ eyebrow: t('akte.fuehrungsprinzip'), inhalt: prinzip.html, quelle: prinzip.quelle })}
        </div>
        ${zielKarte()}
        ${arbeitsweiseKarte()}
        ${lageKarte()}
      </div>
      <aside class="akte-seite" aria-label="${tHtml('akte.seite')}">
        ${empfaengerKarte()}
        ${quellenKarte()}
      </aside>
    </div>`
  for (const details of container.querySelectorAll('details[data-akte-mehr]')) {
    const schluessel = details.getAttribute('data-akte-mehr')
    if (offen.has(schluessel)) details.open = true
    if (schluessel === fokusMehr) details.querySelector('summary')?.focus()
  }
}

/**
 * Lädt Akte und Roadmap neu (Betreten, Projektwechsel, „Erneut laden“). Beide Abrufe laufen
 * parallel und rendern je für sich; eine überholte Antwort wird verworfen.
 * @param optionen - { fokus: true } setzt danach den Fokus auf die Überschrift
 */
async function ladeAkte(optionen = {}) {
  const nummer = ++anfrageZaehler
  const aktuell = () => nummer === anfrageZaehler
  akte = null
  roadmap = null
  render()
  const alsFehler = (fehler) => ({ status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) })
  await Promise.all([
    holeProjektakte().then(
      (antwort) => {
        if (!aktuell()) return
        akte = antwort !== null && typeof antwort === 'object' && antwort.dateien !== null && typeof antwort.dateien === 'object' ? antwort : { status: 'fehler', grund: 'unerwartete Antwort' }
        render()
      },
      (fehler) => {
        if (!aktuell()) return
        console.error('GET …/projektakte fehlgeschlagen:', fehler)
        akte = alsFehler(fehler)
        render()
      }
    ),
    holeRoadmap().then(
      (antwort) => {
        if (!aktuell()) return
        roadmap = antwort
        render()
      },
      (fehler) => {
        if (!aktuell()) return
        console.error('GET …/roadmap fehlgeschlagen:', fehler)
        roadmap = alsFehler(fehler)
        render()
      }
    ),
  ])
  if (optionen.fokus === true && aktuell()) document.querySelector('#view-projektakte h1')?.focus()
}

/** Registriert #/projektakte, „Erneut laden“ und das Neuladen bei Projektwechsel. Einmalig beim Bootstrap. */
export function initProjektakteView() {
  document.getElementById('view-projektakte')?.addEventListener('click', (ereignis) => {
    if (ereignis.target instanceof Element && ereignis.target.closest('[data-akte-erneut]') !== null) void ladeAkte({ fokus: true })
  })
  registriere(/^#\/projektakte$/, 'projektakte', () => {
    void ladeAkte()
  })
  abonniereProjektWechsel(() => {
    if (location.hash === '#/projektakte') void ladeAkte()
    else {
      akte = null
      roadmap = null
    }
  })
}
