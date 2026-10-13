/**
 * Datei: public/leitstand/views/pruefung-ablauf.js
 *
 * Zweck: Steuerung des Ablaufs „Eignung prüfen“ (F45 F-2b-2a, seit F-2b-2c gemeinsam für die Sammlung und die Capability
 * Library): (Typwahl, falls unbestimmt) → POST /api/sammlung/pruefung/vorbereiten (Pin) → Bestätigung (Pfad bei git,
 * Ausnahme-Begründung, falls das Urteil ausschließt) → POST /api/sammlung/pruefung (202) → Prüflauf verfolgen (GET
 * …/pruefung/<laufId> über den Detail-Auffrischer, nur solange er holt/läuft) → Bericht. Gerendert wird mit
 * pruefung-anzeige.js (renderPruefAblauf); diese Datei hält nur Zustand, Netz und Ereignisse.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/sammlung.js (schluessel 'sammlung_id')
 * - public/leitstand/views/capability-library.js (schluessel 'katalog_id', Knopf „Eignung prüfen“ im Freigabedialog)
 *
 * Wichtig:
 * - Die angezeigte Quelle (Pin) geht unverändert an den Start zurück; der Server vergleicht sie (409 bei Abweichung).
 * - Eingaben (Ausnahme-Begründung, Pfad) werden beim Tippen im Zustand gemerkt, damit ein Neuzeichnen sie nicht verliert
 *   (Advisor F-2b-2c D3).
 * - Klick, Enter und Eingabe hängen am Container des Aufrufers (Delegation, Advisor D2); kein eigener Timer.
 */

import { bereitePruefungVor, holePruefung, startePruefung, workforceAktiv } from '../api.js'
import { t } from '../i18n.js'
import { abonniereDetailAuffrischer } from '../zustand.js'

/**
 * Grund aus einer Fehlerantwort.
 * @param antwort - Response
 * @returns Text
 */
async function grundAus(antwort) {
  const inhalt = await antwort.json().catch(() => ({}))
  return typeof inhalt.grund === 'string' ? inhalt.grund : `HTTP ${antwort.status}`
}

/**
 * Erzeugt eine Ablauf-Steuerung für einen Container.
 * @param optionen - {
 *   container: () => Element|null,
 *   schluessel: 'sammlung_id' | 'katalog_id',
 *   zeichne: (id) => void (zeichnet nach einem Zustandswechsel neu),
 *   block: (id) => Element|null (Ablauf-Block für den Fokus),
 *   oeffne: (id) => void (Stefans Klick: Detail offen halten; optional),
 *   nachBericht: (id, zustand) => boolean|void (Prüflauf fertig; true = der Aufrufer hat den Ablauf selbst beendet; optional)
 * }
 * @returns { ablaeufe, setze, init, zuruecksetzen }
 */
export function erzeugePruefAblauf({ container, schluessel, zeichne, block, oeffne = () => {}, nachBericht = () => {} }) {
  /** Ablauf je id (id → { phase, vorbereitung, zustand, meldung, ausnahme, pfadEingabe, typ, pfad, laufLink }). */
  let ablaeufe = new Map()
  /** Überholschutz je id für „vorbereiten“ (ein „Schließen“ während des Pins gewinnt gegen die späte Antwort, QA 8). */
  const vorbereitenZaehler = new Map()

  /**
   * Setzt den Ablauf einer id und zeichnet neu; danach liegt der Fokus im Ablauf-Block.
   * @param id - Sammlungs- bzw. Katalog-id
   * @param ablauf - neuer Zustand oder null (Ablauf beendet)
   * @param fokus - true (Stefans Klick), 'wennDort' (Auffrischer: nur, wenn der Fokus im Ablauf oder nirgends lag, QA 7) oder false
   */
  function setze(id, ablauf, fokus = true) {
    const aktiv = document.activeElement
    const warDort = aktiv === null || aktiv === document.body || (block(id)?.contains(aktiv) ?? false)
    if (ablauf === null) ablaeufe.delete(id)
    else ablaeufe.set(id, { ...ablauf, laufLink: workforceAktiv() })
    if (fokus === true) oeffne(id)
    zeichne(id)
    if (fokus === false || (fokus === 'wennDort' && !warDort)) return
    // design-guardian 2 (F-2b-2a): festes Fokusziel je Phase (Statuszeile, Frage oder Meldung), sonst das erste Bedienelement.
    const b = block(id)
    const ziel = b?.querySelector('[data-pruef-fokus]') ?? b?.querySelector('select, textarea, button:not([disabled])')
    ziel?.focus?.()
  }

  /**
   * Schritt „vorbereiten“: Pin holen und Bestätigung zeigen.
   * @param id - id
   * @param typ - gewählter Typ oder null
   * @param pfad - gewählter Ordner im Repo oder null (nur git)
   */
  async function bereiteVor(id, typ, pfad = null) {
    // design-guardian 8: eine schon eingegebene Ausnahme-Begründung überlebt „Pfad übernehmen“.
    const ausnahme = ablaeufe.get(id)?.ausnahme ?? ''
    const meine = (vorbereitenZaehler.get(id) ?? 0) + 1
    vorbereitenZaehler.set(id, meine)
    setze(id, { phase: 'laedt', typ, pfad })
    try {
      const antwort = await bereitePruefungVor({ [schluessel]: id, ...(typ !== null ? { typ } : {}), ...(pfad !== null && pfad !== '' ? { pfad } : {}) })
      if (vorbereitenZaehler.get(id) !== meine || ablaeufe.get(id)?.phase !== 'laedt') return
      if (!antwort.ok) {
        setze(id, { phase: 'fehler', meldung: t('pruefung.fehler.abgelehnt', { grund: await grundAus(antwort) }) })
        return
      }
      setze(id, { phase: 'bestaetigen', vorbereitung: await antwort.json(), typ, pfad, ausnahme })
    } catch (fehler) {
      console.error('pruefung-ablauf: Prüfung vorbereiten fehlgeschlagen', fehler)
      setze(id, { phase: 'fehler', meldung: t('pruefung.fehler.anfrage', { grund: fehler instanceof Error ? fehler.message : String(fehler) }) })
    }
  }

  /**
   * Schritt „Prüfung starten“: angezeigten Pin (und ggf. Ausnahme-Begründung) senden, danach verfolgen.
   * @param id - id
   */
  async function starte(id) {
    const ablauf = ablaeufe.get(id)
    if (ablauf?.phase !== 'bestaetigen') return
    const ausnahme = String(ablauf.ausnahme ?? '').trim()
    // QA 6: ein getippter, aber nicht übernommener Pfad würde still ignoriert — erst übernehmen.
    if (ablauf.vorbereitung?.quelle?.art === 'git' && typeof ablauf.pfadEingabe === 'string' && ablauf.pfadEingabe.trim().replace(/^\/+|\/+$/g, '') !== String(ablauf.vorbereitung.quelle.pfad ?? '')) {
      setze(id, { ...ablauf, meldung: t('pruefung.fehler.pfadNichtUebernommen') })
      return
    }
    if (ablauf.vorbereitung?.ausgeschlossen === true && ausnahme.length < 20) {
      setze(id, { ...ablauf, meldung: t('pruefung.fehler.ausnahmeKurz') })
      return
    }
    setze(id, { ...ablauf, phase: 'startet', meldung: null })
    try {
      const koerper = { [schluessel]: id, quelle: ablauf.vorbereitung.quelle, ...(ablauf.typ !== null && ablauf.typ !== undefined ? { typ: ablauf.typ } : {}), ...(typeof ablauf.pfad === 'string' && ablauf.pfad !== '' ? { pfad: ablauf.pfad } : {}), ...(ablauf.vorbereitung?.ausgeschlossen === true ? { ausnahme_begruendung: ausnahme } : {}) }
      const antwort = await startePruefung(koerper)
      if (antwort.status !== 202) {
        setze(id, { ...ablauf, phase: 'bestaetigen', meldung: t('pruefung.fehler.abgelehnt', { grund: await grundAus(antwort) }) })
        return
      }
      const { laufId } = await antwort.json()
      setze(id, { phase: 'holen', zustand: { lauf_id: laufId } })
    } catch (fehler) {
      console.error('pruefung-ablauf: Prüfung starten fehlgeschlagen', fehler)
      setze(id, { ...ablauf, phase: 'bestaetigen', meldung: t('pruefung.fehler.anfrage', { grund: fehler instanceof Error ? fehler.message : String(fehler) }) })
    }
  }

  /**
   * Detail-Auffrischer (Poll-Tick): fragt nur Prüfläufe in Phase holen/laeuft ab; fertig → nachBericht, fehler → Grund. Eine
   * unbekannte laufId (Neustart) beendet die Verfolgung sichtbar.
   */
  async function aktualisiere() {
    for (const [id, ablauf] of ablaeufe) {
      if (ablauf.phase !== 'holen' && ablauf.phase !== 'laeuft') continue
      try {
        const antwort = await holePruefung(ablauf.zustand.lauf_id)
        if (ablaeufe.get(id) !== ablauf) continue
        if (antwort.status === 404) {
          setze(id, { phase: 'fehler', zustand: ablauf.zustand, meldung: t('pruefung.fehler.verloren') }, false)
          continue
        }
        if (!antwort.ok) continue
        const z = await antwort.json()
        if (z.phase === ablauf.phase) continue
        if (z.phase === 'fertig') {
          // Erst den Bericht übernehmen (der Aufrufer zeichnet ggf. neu), dann die Phase setzen — sonst ginge der Fokus verloren.
          // Gibt nachBericht true zurück, hat der Aufrufer den Ablauf selbst beendet (Capability Library: Bericht im Dialog).
          if (nachBericht(id, z) !== true) setze(id, { phase: 'fertig', zustand: z }, 'wennDort')
        } else if (z.phase === 'fehler') setze(id, { phase: 'fehler', zustand: z, meldung: String(z.grund ?? '') }, 'wennDort')
        else setze(id, { phase: z.phase, zustand: z }, false)
      } catch {
        // Netzwerkfehler: der nächste Tick versucht es erneut (Muster views/capabilities.js).
      }
    }
  }

  /** Einmalig: Delegation für Klick, Enter im Pfad-Feld, Eingaben; Auffrischer abonnieren. */
  function init() {
    const ziel = container()
    if (ziel === null) return
    ziel.addEventListener('click', (ereignis) => {
      const element = ereignis.target instanceof Element ? ereignis.target : null
      if (element === null) return
      const auswaehlen = element.closest('[data-sm-auswaehlen]')
      if (auswaehlen !== null) {
        const id = auswaehlen.dataset.smAuswaehlen ?? ''
        // Code-Review/QA F-2b-2c: ein laufender Ablauf wird nicht überschrieben (sonst ginge die Verfolgung des Prüflaufs
        // verloren; ein zweiter Start endete in der Laufsperre). Neu beginnen erst nach „fertig“, „fehler“ oder „Schließen“.
        const laufend = ablaeufe.get(id)
        if (laufend !== undefined && laufend.phase !== 'fertig' && laufend.phase !== 'fehler') return
        if (auswaehlen.dataset.smTypOffen === 'true') setze(id, { phase: 'typwahl' })
        else void bereiteVor(id, null)
        return
      }
      const weiter = element.closest('[data-sm-typ-weiter]')
      if (weiter !== null) {
        const id = weiter.dataset.smTypWeiter ?? ''
        const auswahl = ziel.querySelector(`[data-sm-typ="${CSS.escape(id)}"]`)
        void bereiteVor(id, auswahl instanceof HTMLSelectElement ? auswahl.value : 'skill')
        return
      }
      const pfadKnopf = element.closest('[data-sm-pfad-uebernehmen]')
      if (pfadKnopf !== null) {
        const id = pfadKnopf.dataset.smPfadUebernehmen ?? ''
        const feld = ziel.querySelector(`[data-sm-pfad="${CSS.escape(id)}"]`)
        void bereiteVor(id, ablaeufe.get(id)?.typ ?? null, feld instanceof HTMLInputElement ? feld.value.trim() : null)
        return
      }
      const start = element.closest('[data-sm-pruefung-start]')
      if (start !== null) {
        void starte(start.dataset.smPruefungStart ?? '')
        return
      }
      const zurueck = element.closest('[data-sm-pruefung-zurueck]')
      if (zurueck !== null) setze(zurueck.dataset.smPruefungZurueck ?? '', null)
    })
    // QA 6: Enter im Pfad-Feld übernimmt den Pfad.
    ziel.addEventListener('keydown', (ereignis) => {
      if (ereignis.key !== 'Enter' || !(ereignis.target instanceof HTMLInputElement) || ereignis.target.dataset.smPfad === undefined) return
      ereignis.preventDefault()
      const id = ereignis.target.dataset.smPfad
      void bereiteVor(id, ablaeufe.get(id)?.typ ?? null, ereignis.target.value.trim())
    })
    // Eingaben merken, ohne neu zu zeichnen (der Fokus bleibt im Feld; ein späteres Neuzeichnen zeigt sie wieder, D3).
    ziel.addEventListener('input', (ereignis) => {
      const feld = ereignis.target
      if (feld instanceof HTMLTextAreaElement && feld.dataset.smAusnahme !== undefined) {
        const a = ablaeufe.get(feld.dataset.smAusnahme)
        if (a !== undefined) a.ausnahme = feld.value
      } else if (feld instanceof HTMLInputElement && feld.dataset.smPfad !== undefined) {
        const a = ablaeufe.get(feld.dataset.smPfad)
        if (a !== undefined) a.pfadEingabe = feld.value
      }
    })
    abonniereDetailAuffrischer(() => {
      if ([...ablaeufe.values()].some((a) => a.phase === 'holen' || a.phase === 'laeuft')) void aktualisiere()
    })
  }

  return {
    /** @returns die Map id → Ablauf (lesend für das Rendern) */
    ablaeufe: () => ablaeufe,
    setze,
    init,
    /** Verwirft alle Abläufe (Projektwechsel). */
    zuruecksetzen() {
      ablaeufe = new Map()
      vorbereitenZaehler.clear()
    },
  }
}
