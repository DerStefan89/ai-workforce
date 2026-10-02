/**
 * Datei: public/leitstand/views/auftrag-umgebung.js
 *
 * Zweck: Rechte Spalte von „Auftrag anlegen“ `#/projekt` (F46 D4, Bild
 * docs/design/neu/04-auftrag-anlegen--Main.webp, docs/design/abgleich-f46.md §4.11 und §3 Schritt 3):
 * „Bereit zum Start?“, „Wo gearbeitet wird“ und „Womit gearbeitet wird“. Formular und Direktstart
 * (views/projekt.js) bleiben unverändert; diese Spalte liest nur.
 *
 * Quellen: Formularfelder (Titel, Ergebnis, Kontext), der Poll (aktiverLauf, zustand.js), das
 * Projektregister (projekt-kontext.js) und die Leseroute GET …/code über code-stand.js (Arbeitsordner,
 * Git, GitHub, Harness, Startvorlage) — geladen beim Betreten von #/projekt, nie aus dem Poll.
 * „kommt“: Projektkarte (Fixpaket B2), Terminal (E-F46-1), „Festlegen“ der Vorschau.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initAuftragUmgebung — registriert die Route #/projekt)
 * - public/leitstand/views/auftrag-umgebung.test.mjs (node:test, umgebungHtml)
 *
 * Wichtig: Pfade, Branch, Projektname und Startvorlagen-Werte werden escaped. Kein Schreibweg: „Pfad
 * kopieren“ und „Kopieren“ schreiben nur in die Zwischenablage, auf Klick.
 */

import { kopiereBefehlsblock, renderBefehlsblock } from '../befehlsblock.js'
import { bereitschaft, psArgument } from '../code-daten.js'
import { abonniereCodeStand, aktuellerCodeStand, ladeCodeStand } from '../code-stand.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { baueVsCodeLink, pruefeGithubUrl } from '../kopf-werkzeuge.js'
import { abonniereProjektWechsel, holeAktivesProjekt, projektAusListe } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { registriere } from '../router.js'
import { abonniere } from '../zustand.js'

/** Lesbare Worker-Namen. */
const WORKER_NAME = { 'claude-code': 'Claude Code', codex: 'Codex' }

/** Wie lange „Pfad kopieren“ nach dem Kopieren „Kopiert“ zeigt. */
const KOPIERT_MS = 2000

/** Letztes aktiverLauf aus dem Poll (undefined = noch unbekannt). */
let aktiverLauf

/** true, solange #/projekt sichtbar ist. */
let seiteAktiv = false

/** Zuletzt geschriebenes HTML (Fokus bleibt beim Neuschreiben ohne Änderung). */
let letztesHtml = ''

/**
 * Symbol einer Prüfzeile.
 * @param zustand - 'ok' | 'offen' | 'warnung' | 'laedt' | 'fehler' | 'kommt'
 * @returns HTML
 */
function zeichen(zustand) {
  const inhalt = { ok: '✓', warnung: '!', fehler: '!', laedt: '…', offen: '', kommt: '' }[zustand] ?? ''
  return `<span class="bereit-zeichen" data-zustand="${zustand}" aria-hidden="true">${inhalt}</span>`
}

/**
 * Detailzeile je Prüfzeile aus den Daten (nichts frei formuliert).
 * @param id - Zeilen-id aus bereitschaft()
 * @param zustand - Zustand der Zeile
 * @param werte - { titel, ergebnis, kontext }
 * @param daten - Antwort der Route oder null
 * @param lauf - aktiverLauf aus dem Poll
 * @returns HTML
 */
function detail(id, zustand, werte, daten, lauf) {
  if (zustand === 'laedt') return tHtml('entwicklung.laedt')
  switch (id) {
    case 'titel':
      return zustand === 'ok' ? escapeHtml(werte.titel.trim()) : tHtml('auftrag.bereit.leer')
    case 'ergebnis':
      return tHtml(zustand === 'ok' ? 'auftrag.bereit.angegeben' : 'auftrag.bereit.leer')
    case 'kontext':
      return tHtml(zustand === 'ok' ? 'auftrag.bereit.angegeben' : 'auftrag.bereit.nichtAngegeben')
    case 'projektkarte':
      return tHtml('auftrag.bereit.projektkarteText')
    case 'arbeitsverzeichnis':
      return daten?.absoluterPfad ? `<code>${escapeHtml(daten.absoluterPfad)}</code>` : tHtml('auftrag.bereit.unbekannt')
    case 'git': {
      if (daten?.status !== 'ok' || daten.branch?.status !== 'ok') return escapeHtml(daten?.grund ?? daten?.branch?.grund ?? t('auftrag.bereit.unbekannt'))
      const branch = daten.branch.losgeloest ? t('code.branch.losgeloest') : daten.branch.name
      const anzahl = daten.dateien?.status === 'ok' ? daten.dateien.anzahl : null
      return `${tHtml('auftrag.bereit.branch', { branch })}${anzahl === null ? '' : ` · ${tHtml('auftrag.bereit.aenderungen', { anzahl, zahl: formatiereZahl(anzahl) })}`}`
    }
    case 'pruefbefehl':
      return daten?.startvorlage?.pruefbefehl ? `<code>${escapeHtml(daten.startvorlage.pruefbefehl)}</code>` : tHtml('auftrag.bereit.keinPruefbefehl')
    case 'harness': {
      const h = daten?.harness
      if (h?.status !== 'ok') return tHtml('auftrag.bereit.unbekannt')
      return tHtml('auftrag.bereit.harnessText', { claude: h.claudeMd ? 'CLAUDE.md' : t('auftrag.bereit.ohneClaude'), hooks: formatiereZahl(h.hooks), agents: formatiereZahl(h.agents) })
    }
    case 'lauf':
      return zustand === 'ok' ? tHtml('auftrag.bereit.einLauf') : tHtml('auftrag.bereit.laeuft', { laufId: lauf?.laufId ?? '–' })
    default:
      return ''
  }
}

/**
 * Rechtes Etikett je Prüfzeile (Pflicht, optional, kommt, prüfen).
 * @param zeile - Zeile aus bereitschaft()
 * @returns HTML
 */
function etikett(zeile) {
  if (zeile.zustand === 'kommt') return kommtBadge()
  if (zeile.zustand === 'warnung') return `<span class="bereit-etikett" data-ton="warnung">${tHtml('auftrag.bereit.pruefen')}</span>`
  if (zeile.id === 'titel' || zeile.id === 'ergebnis') return `<span class="bereit-etikett">${tHtml('auftrag.bereit.pflicht')}</span>`
  if (zeile.id === 'kontext') return `<span class="bereit-etikett">${tHtml('auftrag.bereit.optional')}</span>`
  return ''
}

/**
 * Eine Zeile „Wo/Womit gearbeitet wird“.
 * @param schluessel - Wörterbuchschlüssel der Beschriftung
 * @param wertHtml - Hauptwert (HTML)
 * @param unterHtml - Unterzeile (HTML) oder ''
 * @param aktionHtml - Link/Knopf rechts (HTML) oder ''
 * @returns HTML
 */
function feld(schluessel, wertHtml, unterHtml = '', aktionHtml = '') {
  return `<div class="umgebung-zeile"><dt>${tHtml(schluessel)}</dt><dd><span class="umgebung-wert">${wertHtml}</span>${unterHtml ? `<span class="umgebung-unter">${unterHtml}</span>` : ''}</dd><dd class="umgebung-aktion">${aktionHtml}</dd></div>`
}

/**
 * VS-Code-Link auf einen Ordner bzw. eine Datei im Projekt.
 * @param basis - absoluter Projektpfad oder null
 * @param rel - repo-relativer Pfad ('' = Projektordner)
 * @param textSchluessel - Wörterbuchschlüssel der Beschriftung
 * @returns HTML
 */
function vsCode(basis, rel, textSchluessel) {
  // Ein absoluter Pfad (z. B. ein absolutes basisverzeichnis im Register) wird direkt verwendet (Prüfpass cr 10).
  const absolut = /^(?:[A-Za-z]:[\\/]|\/)/.test(rel)
  const link = absolut ? baueVsCodeLink(rel) : typeof basis === 'string' ? baueVsCodeLink(rel === '' ? basis : `${basis.replace(/[\\/]+$/, '')}/${rel}`) : null
  return link === null ? `<a class="text-link" role="link" tabindex="0" aria-disabled="true" title="${tHtml('kopf.vscodeOhne')}">${tHtml(textSchluessel)}</a>` : `<a class="text-link" href="${escapeHtml(link)}">${tHtml(textSchluessel)}</a>`
}

/**
 * Zeile unter der Prüfliste: welche Pflichtpunkte noch fehlen (Prüfpass dg 6 — „Ablauf vorbereiten“ bleibt
 * wie bisher bedienbar, die Spalte sagt, was fehlt).
 * @param ergebnis - bereitschaft()
 * @returns HTML ('' wenn bereit)
 */
function offenHtml(ergebnis) {
  if (ergebnis.bereit) return ''
  const offen = ergebnis.zeilen.filter((z) => z.pflicht && z.zustand !== 'ok').map((z) => t(`auftrag.bereit.${z.id}`))
  return offen.length === 0 ? '' : `<p class="subtle bereit-offen">${tHtml('auftrag.bereit.fehltNoch', { liste: offen.join(', ') })}</p>`
}

/**
 * „Bereit zum Start?“.
 * @param ergebnis - bereitschaft()
 * @param werte - Formularwerte
 * @param daten - Antwort der Route oder null
 * @param lauf - aktiverLauf aus dem Poll
 * @returns HTML
 */
function bereitHtml(ergebnis, werte, daten, lauf) {
  const zeilen = ergebnis.zeilen
    .map(
      (z) => `<li class="bereit-zeile" data-zustand="${z.zustand}">${zeichen(z.zustand)}<span class="bereit-text"><span class="bereit-name">${tHtml(`auftrag.bereit.${z.id}`)}<span class="sr-only"> — ${tHtml(`auftrag.bereit.zustand.${z.zustand}`)}</span></span><span class="bereit-detail">${detail(z.id, z.zustand, werte, daten, lauf)}</span></span>${etikett(z)}</li>`
    )
    .join('')
  return `<section class="umgebung-karte" aria-labelledby="bereit-titel">
      <div class="umgebung-kopf"><h2 id="bereit-titel">${tHtml('auftrag.bereit.ueberschrift')}</h2><span class="umgebung-chip" data-ton="${ergebnis.bereit ? 'ok' : 'warnung'}">${tHtml(ergebnis.bereit ? 'auftrag.bereit.bereit' : 'auftrag.bereit.nichtBereit')}</span></div>
      <ul class="bereit-liste">${zeilen}</ul>
      ${offenHtml(ergebnis)}
    </section>`
}

/**
 * „Wo gearbeitet wird“.
 * @param projekt - Registereintrag des aktiven Projekts (oder { id, name })
 * @param daten - Antwort der Route oder null
 * @param mainWarnung - true, wenn main ausgecheckt ist
 * @returns HTML
 */
function woHtml(projekt, daten, mainWarnung) {
  const basis = typeof daten?.absoluterPfad === 'string' ? daten.absoluterPfad : null
  const github = pruefeGithubUrl(daten?.remoteWebUrl?.url ?? null)
  const vsLink = basis === null ? null : baueVsCodeLink(basis)
  const werkzeug = (inhalt, href, extern) =>
    href === null ? `<a class="umgebung-werkzeug" role="link" tabindex="0" aria-disabled="true">${inhalt}</a>` : `<a class="umgebung-werkzeug" href="${escapeHtml(href)}"${extern ? ' target="_blank" rel="noopener noreferrer"' : ''}>${inhalt}</a>`
  const werkzeuge = `<div class="umgebung-werkzeuge">
      ${werkzeug(`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></svg><span>${tHtml('kopf.vscode')}</span>`, vsLink, false)}
      <button type="button" class="umgebung-werkzeug kommt-knopf" aria-disabled="true"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 5h18v14H3ZM7 10l3 2-3 2M12 15h5" /></svg><span>${tHtml('kopf.terminal')}</span>${kommtBadge()}</button>
      ${werkzeug(`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3v12M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9c0 4-4 5-12 6" /></svg><span>${tHtml('kopf.github')}</span>`, github, true)}
    </div>`
  const laedt = daten === null ? tHtml('entwicklung.laedt') : '–'
  const projektZeile = feld('auftrag.wo.projekt', escapeHtml(projekt?.name ?? holeAktivesProjekt().name), projekt?.status ? tHtml('auftrag.wo.status', { status: projekt.status }) : '', `<a class="text-link" href="#/projekte-uebersicht">${tHtml('nav.alleProdukte')}</a>`)
  const ordner = feld(
    'auftrag.wo.ordner',
    basis === null ? laedt : `<code class="umgebung-pfad" title="${escapeHtml(basis)}">${escapeHtml(basis)}</code>`,
    projekt?.repo_pfad ? tHtml('auftrag.wo.ordnerUnter', { pfad: projekt.repo_pfad }) : tHtml('auftrag.wo.ordnerUnterOhne'),
    basis === null ? '' : `<button type="button" class="text-link umgebung-kopieren" data-pfad-kopieren>${tHtml('auftrag.wo.pfadKopieren')}</button>`
  )
  let gitWert = laedt
  let gitUnter = ''
  if (daten?.status === 'ok' && daten.branch?.status === 'ok') {
    gitWert = daten.branch.losgeloest ? `<code>${escapeHtml(daten.branch.commit ?? '')}</code> ${tHtml('code.branch.losgeloest')}` : tHtml('auftrag.bereit.branch', { branch: daten.branch.name })
    const anzahl = daten.dateien?.status === 'ok' ? daten.dateien.anzahl : null
    const letzter = daten.branch.commit ? tHtml('auftrag.wo.zuletzt', { commit: daten.branch.commit }) : ''
    gitUnter = [anzahl === null ? '' : tHtml('auftrag.bereit.aenderungen', { anzahl, zahl: formatiereZahl(anzahl) }), letzter].filter((x) => x !== '').join(' · ')
  } else if (daten !== null) {
    gitWert = tHtml('code.nichtVerfuegbar')
  }
  const git = feld('auftrag.wo.git', gitWert, gitUnter, `<a class="text-link" href="#/code">${tHtml('auftrag.wo.aenderungen')}</a>`)
  const githubName = github === null ? null : github.replace('https://github.com/', '')
  const githubZeile = feld(
    'auftrag.wo.github',
    githubName === null ? (daten === null ? laedt : tHtml('auftrag.wo.keinGithub')) : escapeHtml(githubName),
    githubName === null ? '' : tHtml('auftrag.wo.githubUnter'),
    github === null ? '' : `<a class="text-link" href="${escapeHtml(github)}" target="_blank" rel="noopener noreferrer">${tHtml('auftrag.wo.oeffnen')}</a>`
  )
  // Fehlt ein Feld im Register, gilt der Standard des Servers (erzeugeRequestHandler) — als solcher gekennzeichnet (Prüfpass cr 10).
  const standard = ` <span class="umgebung-unter">${tHtml('auftrag.wo.standard')}</span>`
  const kontrollPfad = projekt?.basisverzeichnis ?? null
  const kontroll = kontrollPfad === null
    ? feld('auftrag.wo.kontrollzustand', '–', tHtml('auftrag.wo.kontrollzustandUnter'))
    : feld('auftrag.wo.kontrollzustand', `<code>${escapeHtml(kontrollPfad)}/</code>`, tHtml('auftrag.wo.kontrollzustandUnter'), vsCode(basis, kontrollPfad, 'auftrag.wo.inVsCode'))
  const kontextPfad = projekt?.kontext_pfad ?? 'docs/projekt/kontext'
  const roadmapPfad = projekt?.roadmap_pfad ?? 'docs/projekt/roadmap.json'
  const wissen = feld(
    'auftrag.wo.wissen',
    `<code>${escapeHtml(kontextPfad)}/</code>${projekt?.kontext_pfad ? '' : standard}`,
    `${escapeHtml(roadmapPfad)}${projekt?.roadmap_pfad ? '' : ` (${tHtml('auftrag.wo.standard')})`}`,
    vsCode(basis, kontextPfad, 'auftrag.wo.inVsCode')
  )
  const vorschau = feld(
    'auftrag.wo.vorschau',
    projekt?.vorschau_url ? `<code>${escapeHtml(projekt.vorschau_url)}</code>` : tHtml('auftrag.wo.nichtGesetzt'),
    projekt?.vorschau_url ? '' : tHtml('auftrag.wo.vorschauUnter'),
    kommtKnopf(t('auftrag.wo.festlegen'))
  )
  const cd = basis === null ? '' : renderBefehlsblock({ sprache: 'powershell', zeilen: [`cd ${psArgument(basis)}`] }, { echteWerte: true })
  return `<section class="umgebung-karte" aria-labelledby="wo-titel">
      <h2 id="wo-titel">${tHtml('auftrag.wo.titel')}</h2>
      ${werkzeuge}
      <dl class="umgebung-felder">${projektZeile}${ordner}${git}${githubZeile}${kontroll}${wissen}${vorschau}</dl>
      <div class="note amber umgebung-warnung"><p>${tHtml('auftrag.wo.warnung')}</p>${mainWarnung ? `<p><strong>${tHtml('auftrag.wo.warnungMain')}</strong></p>` : ''}</div>
      ${cd}
    </section>`
}

/**
 * „Womit gearbeitet wird“ (Startvorlage der Instanz, über die Leseroute).
 * @param daten - Antwort der Route oder null
 * @returns HTML
 */
function womitHtml(daten) {
  const sv = daten?.startvorlage
  if (sv?.status !== 'ok') {
    const text = daten === null ? tHtml('entwicklung.laedt') : tHtml('auftrag.womit.fehlt')
    return `<section class="umgebung-karte" aria-labelledby="womit-titel"><h2 id="womit-titel">${tHtml('auftrag.womit.titel')}</h2><p class="subtle">${text}</p></section>`
  }
  const minuten = (ms) => (typeof ms === 'number' ? formatiereZahl(Math.round(ms / 60000)) : null)
  const worker = sv.worker.map((w) => escapeHtml(WORKER_NAME[w] ?? w)).join(' · ')
  const zeilen = [
    feld('auftrag.womit.startvorlage', sv.pfad ? `<code>${escapeHtml(sv.pfad)}</code>` : '–', sv.profilPfad ? tHtml('auftrag.womit.profil', { pfad: sv.profilPfad }) : ''),
    feld('auftrag.womit.worker', worker || '–', sv.modell ? tHtml('auftrag.womit.modell', { modell: sv.modell }) : ''),
    feld('auftrag.womit.werkzeugsaetze', sv.werkzeugsaetze.map(escapeHtml).join(' · ') || '–', tHtml('auftrag.womit.werkzeugsaetzeUnter')),
    feld('auftrag.womit.pruefbefehl', sv.pruefbefehl ? `<code>${escapeHtml(sv.pruefbefehl)}</code>` : '–', minuten(sv.pruefZeitgrenzeMs) === null ? '' : tHtml('auftrag.womit.pruefZeitgrenze', { minuten: minuten(sv.pruefZeitgrenzeMs) })),
    feld('auftrag.womit.zeitgrenze', minuten(sv.zeitgrenzeMs) === null ? '–' : tHtml('auftrag.womit.zeitgrenzeWert', { minuten: minuten(sv.zeitgrenzeMs) }), tHtml('auftrag.womit.zeitgrenzeUnter')),
    feld('auftrag.womit.budget', sv.budget ? tHtml('auftrag.womit.budgetWert', { elemente: formatiereZahl(sv.budget.maxElemente), kb: formatiereZahl(Math.round(sv.budget.maxBytes / 1000)) }) : '–', tHtml('auftrag.womit.budgetUnter')),
  ].join('')
  return `<section class="umgebung-karte" aria-labelledby="womit-titel">
      <h2 id="womit-titel">${tHtml('auftrag.womit.titel')}</h2>
      <dl class="umgebung-felder">${zeilen}</dl>
      <p><a class="text-link" href="#/capabilities">${tHtml('auftrag.womit.harness')} <span aria-hidden="true">→</span></a></p>
    </section>`
}

/**
 * Die ganze rechte Spalte (rein, testbar).
 * @param eingabe - { werte: { titel, ergebnis, kontext }, aktiverLauf, codeStand, projekt }
 * @returns HTML
 */
export function umgebungHtml({ werte, aktiverLauf: lauf, codeStand, projekt }) {
  const ergebnis = bereitschaft({ ...werte, aktiverLauf: lauf, codeStand })
  const daten = codeStand?.daten ?? null
  // Ohne Daten der Fehler; mit alten Daten der Hinweis, dass sie veraltet sind (Prüfpass qa 5).
  let fehler = ''
  if (codeStand?.zustand === 'fehler') fehler = `<div class="note red"><strong>${tHtml(daten === null ? 'code.fehler.titel' : 'code.fehler.veraltet')}</strong><p><code>${escapeHtml(codeStand.fehler ?? '')}</code></p></div>`
  return `${fehler}${bereitHtml(ergebnis, werte, daten, lauf)}${woHtml(projekt, daten, ergebnis.mainWarnung)}${womitHtml(daten)}`
}

/** @returns die aktuellen Formularwerte. */
function formularWerte() {
  const wert = (id) => document.getElementById(id)?.value ?? ''
  return { titel: wert('auftrag-titel'), ergebnis: wert('auftrag-auftragstext'), kontext: wert('auftrag-kontext') }
}

/** Zeichnet die Spalte, nur bei geändertem HTML. */
function render() {
  const container = document.getElementById('auftrag-umgebung')
  if (container === null) return
  const projekt = projektAusListe(holeAktivesProjekt().id) ?? holeAktivesProjekt()
  const html = umgebungHtml({ werte: formularWerte(), aktiverLauf, codeStand: aktuellerCodeStand(), projekt })
  if (html === letztesHtml) return
  letztesHtml = html
  const fokusKopieren = document.activeElement?.hasAttribute?.('data-pfad-kopieren') === true
  container.innerHTML = html
  if (fokusKopieren) container.querySelector('[data-pfad-kopieren]')?.focus()
}

/**
 * „Pfad kopieren“: schreibt den Arbeitsordner in die Zwischenablage und zeigt kurz „Kopiert“; ohne
 * Clipboard-API bleibt der Pfad sichtbar markierbar (kein Ausführen).
 * @param knopf - der geklickte Knopf
 */
async function kopierePfad(knopf) {
  const pfad = aktuellerCodeStand().daten?.absoluterPfad
  if (typeof pfad !== 'string') return
  try {
    await navigator.clipboard.writeText(pfad)
    knopf.textContent = t('befehl.kopiert')
    setTimeout(() => {
      knopf.textContent = t('auftrag.wo.pfadKopieren')
    }, KOPIERT_MS)
  } catch (fehler) {
    console.warn('Pfad kopieren: Zwischenablage abgelehnt:', fehler)
    knopf.textContent = t('befehl.strgC')
  }
}

/** Bootstrap: Route #/projekt (lädt den Code-Stand beim Betreten), Abos, Eingaben, Klicks. */
export function initAuftragUmgebung() {
  registriere(/^#\/projekt$/, 'projekt', () => {
    seiteAktiv = true
    render()
    void ladeCodeStand({ neu: true })
  })
  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      if (document.getElementById('view-projekt')?.hidden !== false) seiteAktiv = false
    }, 0)
  })
  for (const id of ['auftrag-titel', 'auftrag-auftragstext', 'auftrag-kontext']) document.getElementById(id)?.addEventListener('input', render)
  // Nach „Ablauf vorbereiten“ leert projekt.js die Felder — die Spalte zieht beim nächsten Tick mit.
  abonniere((zustand) => {
    aktiverLauf = zustand?.aktiverLauf
    if (seiteAktiv) render()
  })
  abonniereCodeStand(() => {
    if (seiteAktiv) render()
  })
  abonniereProjektWechsel(() => {
    letztesHtml = ''
    if (seiteAktiv) render()
  })
  document.getElementById('auftrag-umgebung')?.addEventListener('click', (ereignis) => {
    const pfad = ereignis.target.closest('[data-pfad-kopieren]')
    if (pfad !== null) {
      void kopierePfad(pfad)
      return
    }
    const kopieren = ereignis.target.closest('[data-befehl-kopieren]')
    if (kopieren !== null) void kopiereBefehlsblock(kopieren)
  })
}
