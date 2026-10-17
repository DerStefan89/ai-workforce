/**
 * Datei: public/leitstand/rueckfrage-kanal.js
 *
 * Zweck: Rückfrage-Kanal im Leitstand (F45 B2b-3b-2b-2a-2, features/F45/plan-b2b3b2b2a2-v2.md): holt je Poll-Takt die offenen und
 * zuletzt entschiedenen Rückfragen der Instanz des aktiven Laufs (GET …/rueckfragen), hält den Stand für „Deine Entscheidungen“, die
 * Zahl am Navigationspunkt und das Kanal-Band (abonniereKanal, Advisor V4), zeichnet die Karten in #attention-kanal und ist der
 * EINZIGE Schreiber der Kanal-Gruppe (POST …/rueckfragen/<id>/antwort, Advisor V3, Gate f21-ws2 (f)).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initRueckfrageKanal vor initZustandPoll)
 * - public/leitstand/views/attention.js (kanalStand, abonniereKanal — nur lesend)
 * - public/leitstand/entscheidungen-zaehler.js (kanalStand, abonniereKanal — Zahl am Navigationspunkt)
 *
 * Wichtig:
 * - Kein eigener Timer: Abnehmer des einen Polls (zustand.js, Gate f20). Höchstens ein Abruf gleichzeitig; ein während eines Abrufs
 *   angeforderter Takt bzw. ein Abruf nach einer Antwort läuft als EIN Nachlauf danach (Advisor M6, Muster zustand.js).
 * - Kanal aus (zustand.rueckfrageStatus.an !== true) ⇒ kein Abruf, Stand { an: false } — „Deine Entscheidungen“ zeigt dann keine
 *   Kanal-Gruppe (Advisor V1).
 * - Instanz (Advisor V6): je aktiver laufId wird nur ein Treffer aus dem Register gemerkt; ohne Treffer gilt '/api' nur für diesen Takt.
 *   Ohne aktiven Lauf fragt der Kanal die zuletzt benutzte Instanz (dort steht „Zuletzt entschieden“), anfangs '/api'.
 * - Stabiles DOM (Advisor V2): eine Karte entsteht einmal je Rückfrage-id und verschwindet mit ihr; je Takt ändern sich nur Restzeit
 *   und Meldung (textContent) — Freitext und Fokus bleiben. Während des Sendens sind Knöpfe und Feld der Karte gesperrt.
 * - Die Herkunft der Antwort setzt der Server aus den Kopfzeilen (Sec-Fetch-Site/Origin, E-B7); dieses Modul sendet nur den Körper.
 */

import { holeProjekteBegrenzt, holeRueckfragen, sendeRueckfrageAntwort } from './api.js'
import { t } from './i18n.js'
import { kanalBandText, renderKanalKarte, renderZuletzt, restzeitText } from './rueckfrage-anzeige.js'
import { baueEntschiedene, baueKanalEintraege, instanzPraefixDesLaufs, restzeit } from './rueckfrage-daten.js'
import { abonniere } from './zustand.js'

/**
 * Stand des Kanals. offene: Eintrag[] | null (Abruf fehlgeschlagen) | undefined (erster Abruf läuft).
 * bekannteOffene: Zahl der offenen Rückfragen beim letzten erfolgreichen Abruf (nur bei offene null gesetzt).
 * @type {{ an: boolean, warteGrenzeMs?: number, offene?: object[] | null, bekannteOffene?: number, entschiedene?: object[], instanz?: { praefix: string, projektId: string | null } }}
 */
let stand = { an: false }

/** Abnehmer des Kanal-Stands (attention.js, Zähler). */
const abnehmer = []

/** Gemerkter Treffer { laufId, praefix, projektId } (V6) und zuletzt benutzte Instanz. */
let gemerkt = null
let letzteInstanz = { praefix: '/api', projektId: null }

/** Abruf läuft / Nachlauf angefordert / letzter aktiver Lauf aus dem Poll. */
let laeuft = false
let nachlauf = false
let letzterAktiverLauf = null

/** Gesendete Rückfrage-ids (bleiben gesperrt, bis sie aus der offenen Liste fallen). */
const gesendet = new Set()

/** @returns der aktuelle Stand (nur lesen) */
export function kanalStand() {
  return stand
}

/** Registriert einen Abnehmer des Kanal-Stands. @param fn - (stand) => void */
export function abonniereKanal(fn) {
  abnehmer.push(fn)
}

/** Setzt den Stand und benachrichtigt alle Abnehmer (je einzeln gefangen). @param neu - neuer Stand */
function setzeStand(neu) {
  stand = neu
  // Nachpass (code-reviewer 2): ein Wurf beim Zeichnen darf weder den Nachlauf abbrechen noch die Abnehmer um den Stand bringen.
  try {
    zeichne()
  } catch (fehler) {
    console.error('[leitstand] Rückfrage-Kanal: Zeichnen fehlgeschlagen:', fehler)
  }
  for (const fn of abnehmer) {
    try {
      fn(stand)
    } catch (fehler) {
      console.error('[leitstand] Abnehmer des Rückfrage-Kanals ist fehlgeschlagen:', fehler)
    }
  }
}

/**
 * Instanz für diesen Abruf (V6).
 * @param aktiverLauf - zustand.aktiverLauf
 * @returns { praefix, projektId }
 */
async function ermittleInstanz(aktiverLauf) {
  if (aktiverLauf?.aktiv !== true || typeof aktiverLauf.laufId !== 'string') return letzteInstanz
  if (gemerkt?.laufId === aktiverLauf.laufId) return gemerkt
  let projekte = null
  try {
    projekte = (await holeProjekteBegrenzt()).projekte
  } catch (fehler) {
    console.error('[leitstand] Rückfrage-Kanal: Projektregister nicht lesbar, Workforce-Instanz für diesen Takt:', fehler)
  }
  const instanz = instanzPraefixDesLaufs(projekte, aktiverLauf) ?? { praefix: '/api', projektId: null, treffer: false }
  if (instanz.treffer) gemerkt = { laufId: aktiverLauf.laufId, praefix: instanz.praefix, projektId: instanz.projektId }
  return { praefix: instanz.praefix, projektId: instanz.projektId }
}

/** Ein Abruf: Instanz bestimmen, GET …/rueckfragen, Stand setzen. Wirft nie. */
async function holeEinmal() {
  const instanz = await ermittleInstanz(letzterAktiverLauf)
  letzteInstanz = instanz
  let antwort
  try {
    antwort = await holeRueckfragen(instanz.praefix)
  } catch (fehler) {
    console.error('[leitstand] Rückfrage-Kanal: GET …/rueckfragen fehlgeschlagen:', fehler)
    // Korrekturrunde (code-reviewer 1, qa 1): offene null heißt „unbekannt“ — zeichne() lässt die Karten im DOM, views/attention.js lässt
    // sie sichtbar (Freitext, Fokus bleiben); bekannteOffene hält die letzte bekannte Zahl für den Navigationspunkt (Nachpass code-reviewer 3).
    if (stand.an) setzeStand({ ...stand, offene: null, bekannteOffene: Array.isArray(stand.offene) ? stand.offene.length : (stand.bekannteOffene ?? 0), instanz })
    return
  }
  // Ein Wurf beim Zeichnen ist kein Abruffehler (code-reviewer 13) — er gehört nicht in den catch oben.
  const offene = baueKanalEintraege(antwort?.rueckfragen, instanz)
  for (const id of [...gesendet]) if (!offene.some((e) => e.id === id)) gesendet.delete(id)
  if (stand.an) setzeStand({ ...stand, offene, entschiedene: baueEntschiedene(antwort?.entschieden), instanz })
}

/** Abruf mit Nachlauf: läuft schon einer, wird genau ein weiterer danach angefordert. */
async function holeMitNachlauf() {
  if (laeuft) {
    nachlauf = true
    return
  }
  laeuft = true
  try {
    do {
      nachlauf = false
      await holeEinmal()
    } while (nachlauf && stand.an)
  } finally {
    laeuft = false
  }
}

/**
 * Abnehmer des Polls: Kanalstand übernehmen, bei „an“ abrufen.
 * @param zustand - Poll-Aggregat
 */
function nachPoll(zustand) {
  letzterAktiverLauf = zustand?.aktiverLauf ?? null
  const status = zustand?.rueckfrageStatus
  if (status?.an !== true) {
    if (stand.an) setzeStand({ an: false })
    gesendet.clear()
    return
  }
  if (!stand.an) setzeStand({ an: true, warteGrenzeMs: status.warteGrenzeMs, offene: undefined, entschiedene: [] })
  else if (stand.warteGrenzeMs !== status.warteGrenzeMs) stand = { ...stand, warteGrenzeMs: status.warteGrenzeMs }
  void holeMitNachlauf()
  zeichneRestzeiten()
}

// ─── DOM ──────────────────────────────────────────────────────────────────────

/** Zuletzt geschriebenes HTML von „Zuletzt entschieden“ und Band-Text (nur bei Änderung neu schreiben). */
let zuletztHtml = null
let bandSchluessel = null

/** Zeichnet Karten (stabil je id), „Zuletzt entschieden“, Band und Restzeiten. */
function zeichne() {
  if (typeof document === 'undefined') return
  const liste = document.getElementById('attention-kanal')
  // Nur eine erfolgreich geladene Liste (oder Kanal aus) ändert den Kartenbestand; bei null/undefined bleibt er stehen.
  if (liste !== null && (!stand.an || Array.isArray(stand.offene))) {
    const offene = stand.an ? stand.offene : []
    const ids = new Set(offene.map((e) => e.id))
    for (const karte of [...liste.querySelectorAll('[data-kanal-id]')]) {
      if (ids.has(karte.getAttribute('data-kanal-id'))) continue
      // design-guardian 3: lag der Fokus in der entfernten Karte, geht er auf die nächste Karte bzw. die Überschrift der Seite.
      const hatteFokus = karte.contains(document.activeElement)
      const naechste = karte.nextElementSibling ?? karte.previousElementSibling
      karte.remove()
      if (hatteFokus) (naechste?.querySelector('h3') ?? document.getElementById('attention-titel'))?.focus()
    }
    for (const eintrag of offene) {
      if (liste.querySelector(`[data-kanal-id="${CSS.escape(eintrag.id)}"]`) !== null) continue
      const vorlage = document.createElement('template')
      vorlage.innerHTML = renderKanalKarte(eintrag)
      const karte = vorlage.content.firstElementChild
      karte.kanalEintrag = eintrag
      // code-reviewer 3: eine schon gesendete Rückfrage, deren Karte neu entsteht, bleibt gesperrt.
      if (gesendet.has(eintrag.id)) {
        sperreKarte(karte, true)
        meldeAnKarte(karte, t('rueckfrage.meldung.gesendet'))
      }
      liste.append(karte)
    }
  }
  const zuletzt = document.getElementById('attention-kanal-zuletzt')
  if (zuletzt !== null) {
    const html = stand.an ? renderZuletzt(stand.entschiedene ?? []) : ''
    if (html !== zuletztHtml) {
      zuletzt.innerHTML = html
      zuletztHtml = html
    }
    zuletzt.hidden = html === ''
  }
  zeichneRestzeiten()
}

/** Restzeit je Karte und Band (je Takt, nur textContent). */
function zeichneRestzeiten() {
  if (typeof document === 'undefined') return
  const jetzt = Date.now()
  for (const karte of document.querySelectorAll('#attention-kanal [data-kanal-id]')) {
    const ziel = karte.querySelector('[data-kanal-restzeit]')
    const text = karte.kanalEintrag === undefined ? '' : restzeitText(karte.kanalEintrag, jetzt)
    if (ziel !== null && ziel.textContent !== text) ziel.textContent = text
  }
  zeichneBand(jetzt)
}

/**
 * Band #rueckfrage-kanal-hinweis: nur bei Kanal an; mit wartenden Rückfragen Anzahl, nächste Frist und Link nach #/attention.
 * @param jetzt - Date.now()
 */
function zeichneBand(jetzt) {
  const band = document.getElementById('rueckfrage-kanal-hinweis')
  if (band === null) return
  band.hidden = !stand.an
  if (!stand.an) return
  const { text, wartend } = kanalBandText(stand.offene, stand.warteGrenzeMs, jetzt)
  // design-guardian 9: auf #/attention selbst kein Link auf dieselbe Seite.
  const mitLink = wartend && location.hash !== '#/attention'
  const schluessel = `${wartend}|${mitLink}|${text}`
  if (schluessel === bandSchluessel) return
  bandSchluessel = schluessel
  band.dataset.art = wartend ? 'wartend' : 'an'
  const satz = document.createElement('span')
  satz.textContent = text
  if (!mitLink) {
    band.replaceChildren(satz)
    return
  }
  const link = document.createElement('a')
  link.className = 'text-link'
  link.href = '#/attention'
  link.textContent = t('rueckfrage.band.link')
  band.replaceChildren(satz, ' ', link)
}

/**
 * Sperrt bzw. entsperrt alle Bedienelemente einer Karte (leere Optionen bleiben gesperrt).
 * @param karte - <article data-kanal-id>
 * @param gesperrt - true sperrt
 */
function sperreKarte(karte, gesperrt) {
  for (const element of karte.querySelectorAll('button, textarea')) {
    if (!gesperrt && element.hasAttribute('data-kanal-leer')) continue
    element.disabled = gesperrt
  }
}

/**
 * Meldung an einer Karte (textContent).
 * @param karte - Karte
 * @param text - Meldung oder '' (verbergen)
 * @param fehler - true färbt als Fehler
 */
function meldeAnKarte(karte, text, fehler = false) {
  const ziel = karte.querySelector('[data-kanal-meldung]')
  if (ziel === null) return
  ziel.textContent = text
  ziel.hidden = text === ''
  ziel.classList.toggle('fehler', fehler)
  // design-guardian 3: der gesperrte Knopf verliert den Fokus — die Meldung (tabindex -1) übernimmt ihn, keine neue Live-Region.
  if (text !== '' && (document.activeElement === document.body || karte.contains(document.activeElement))) ziel.focus()
}

/**
 * Körper der Antwort aus dem geklickten Element.
 * @param karte - Karte mit kanalEintrag
 * @param knopf - geklicktes Element (data-kanal-aktion)
 * @returns Körper oder null (leere freie Antwort)
 */
function koerperFuer(karte, knopf) {
  const aktion = knopf.getAttribute('data-kanal-aktion')
  if (aktion === 'rechte') return { entscheidung: knopf.getAttribute('data-entscheidung') }
  if (aktion === 'option') {
    const option = karte.kanalEintrag?.optionen?.[Number(knopf.getAttribute('data-option-index'))]
    return typeof option === 'string' ? { antwort: option } : null
  }
  const frei = karte.querySelector('[data-kanal-frei]')?.value ?? ''
  return frei.trim() === '' ? null : { antwort: frei }
}

/**
 * Sendet eine Antwort und meldet das Ergebnis an der Karte; danach ein Nachlauf-Abruf.
 * @param karte - Karte
 * @param knopf - geklicktes Element
 */
async function sendeAntwort(karte, knopf) {
  const eintrag = karte.kanalEintrag
  if (eintrag === undefined || gesendet.has(eintrag.id)) return
  // qa 6: nach Ablauf der Frist nicht mehr senden (der Server meldete 409 „schon entschieden“).
  if (restzeit(eintrag.frist, Date.now())?.abgelaufen === true) {
    meldeAnKarte(karte, t('rueckfrage.meldung.fristAbgelaufen'), true)
    return
  }
  const koerper = koerperFuer(karte, knopf)
  if (koerper === null) {
    meldeAnKarte(karte, t('rueckfrage.meldung.leer'), true)
    return
  }
  sperreKarte(karte, true)
  meldeAnKarte(karte, t('rueckfrage.meldung.sendet'))
  try {
    const antwort = await sendeRueckfrageAntwort(eintrag.praefix, eintrag.id, koerper)
    if (antwort.ok) {
      gesendet.add(eintrag.id)
      meldeAnKarte(karte, t('rueckfrage.meldung.gesendet'))
    } else {
      const grund = await antwort
        .json()
        .then((d) => (typeof d?.grund === 'string' ? d.grund : ''))
        .catch(() => '')
      const schluessel = antwort.status === 409 ? 'rueckfrage.meldung.schonEntschieden' : antwort.status === 404 ? 'rueckfrage.meldung.unbekannt' : 'rueckfrage.meldung.abgelehnt'
      meldeAnKarte(karte, t(schluessel, { status: String(antwort.status), grund: grund === '' ? '–' : grund }), true)
      // Korrekturrunde (code-reviewer 3, qa 5): nur „schon entschieden“ (409) und „unbekannt/Lauf beendet“ (404) sperren endgültig;
      // jeder andere Fehler (400, 5xx, 403, 413, 429) lässt einen neuen Versuch zu.
      if (antwort.status === 409 || antwort.status === 404) gesendet.add(eintrag.id)
      else sperreKarte(karte, false)
    }
  } catch (fehler) {
    console.error('[leitstand] Rückfrage-Kanal: Antwort nicht gesendet:', fehler)
    meldeAnKarte(karte, t('rueckfrage.meldung.netz'), true)
    sperreKarte(karte, false)
  }
  void holeMitNachlauf()
}

/** Initialisiert den Kanal einmalig beim Bootstrap (vor initZustandPoll): Poll-Abnehmer und Klick-Delegation auf #attention-kanal. */
export function initRueckfrageKanal() {
  abonniere(nachPoll)
  document.getElementById('attention-kanal')?.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target instanceof Element ? ereignis.target.closest('[data-kanal-aktion]') : null
    const karte = knopf?.closest('[data-kanal-id]')
    if (knopf === null || karte === null || karte === undefined || knopf.disabled) return
    void sendeAntwort(karte, knopf)
  })
  // Nachpass (design-guardian 2, qa 3): wer nach „Bitte eine Antwort eintragen.“ tippt, sieht die Meldung nicht mehr.
  document.getElementById('attention-kanal')?.addEventListener('input', (ereignis) => {
    const feld = ereignis.target instanceof Element ? ereignis.target.closest('[data-kanal-frei]') : null
    const karte = feld?.closest('[data-kanal-id]')
    const meldung = karte?.querySelector('[data-kanal-meldung]')
    if (meldung !== null && meldung !== undefined && !meldung.hidden && meldung.textContent === t('rueckfrage.meldung.leer')) {
      meldung.textContent = ''
      meldung.hidden = true
    }
  })
}
