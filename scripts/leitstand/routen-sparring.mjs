/**
 * Datei: scripts/leitstand/routen-sparring.mjs
 *
 * Zweck: Projektion für GET /api/sparring (F34 WS-1). Projiziert den
 * 'sparring-<projektId>'-Artefakt-Verlauf (Checkpoint-Kette 'lineage-
 * sparring-<projektId>', geschrieben vom nachLauf-Callback in
 * starteRollenChatLauf über die interne verarbeiteRollenChatErgebnis mit
 * KONFIGURATION_PRODUCT_COACH, scripts/leitstand-server.mjs) in eine Liste — Muster GET /api/chat
 * (scripts/leitstand-server.mjs, F26 WS-2a), aber mit 'coachAntwort' statt
 * 'jarvisAntwort' als Feldname (eigene Artefaktfamilie, kein gemeinsamer
 * Verlauf mit dem Jarvis-Chat).
 *
 * Der POST-Dispatch (POST /api/sparring) bleibt im Server — er braucht die
 * D13-Closure-Sperre (laufAktiv), die dieses Modul nicht kennt (Muster
 * routen-roadmap.mjs/routen-verbrauch.mjs). leitstand-server.mjs registriert GET /api/sparring
 * ausschließlich gegen baueSparringVerlaufsProjektion — keine zweite Kopie
 * dieser Logik dort (D5).
 *
 * F34 Fixpaket (löst state/findings.md F-625): registriereSparringAuftragZuordnung schreibt den
 * "über die Chat→Auftrag-Brücke bereits angelegt"-Rückverweis EINES Turns — als EIGENE, kleine
 * Kernartefakt-Kette ('sparring-auftrag-<projektId>'), NICHT als nachträglicher Schreibzugriff auf
 * den bereits geschriebenen Turn in 'sparring-<projektId>' selbst: diese Kette ist eine reine Folge
 * von Chat-Turns (jede Version == ein Turn, s. o.), ein nachträglich eingefügter "Korrektur"-Eintrag
 * würde dort wie ein neuer, fremder Turn erscheinen (leere Nachricht, keine coachAntwort) und die
 * Anzeige verunreinigen. baueSparringVerlaufsProjektion liest beide Ketten und faltet die Zuordnung
 * (laufId → auftragId) in 'auftragErstelltId' je Turn — ein Turn ohne Zuordnung (Alt-Eintrag oder
 * noch nie über die Brücke angelegt) projiziert weiterhin null. Der Schreibpfad (POST
 * /api/sparring/<laufId>/auftrag) bleibt im Server (Muster POST /api/sparring oben) — kein D13-Bezug
 * (registriert keinen Lauf), aber derselbe Grund, warum dieses Modul selbst keinen Schreibpfad hat:
 * hier nur die reine Schreibfunktion, der Server bindet Body-/Formprüfung.
 *
 * F34 Fixpaket-Nachtrag (löst state/findings.md F-631): sparringLaufExistiert prüft laufId gegen die
 * reale 'sparring-<projektId>'-Kette (dieselbe Lesequelle wie baueSparringVerlaufsProjektion) — der
 * Server prüft damit VOR registriereSparringAuftragZuordnung, dass laufId real ein bestehender Turn
 * ist; die auftragId-Existenz prüft der Server direkt über ladeArtefaktVersion('auftrag-<id>')
 * (Muster POST /api/auftraege/<id>/routen), keine zweite Prüffunktion dafür nötig.
 */

import { listeVersionen, registriereKernArtefakt } from '../../src/lineage-registry/index.ts'

function STILLER_SCHREIBER() {}

function zuordnungsArtefaktId(projektId) {
  return `sparring-auftrag-${projektId}`
}

/**
 * Prüft, ob laufId real ein bestehender Turn der 'sparring-<projektId>'-Kette ist (F-631) — dieselbe
 * Lesequelle wie baueSparringVerlaufsProjektion (Herkunft je Version), keine zweite Leseroutine (D5).
 * @param basisVerzeichnis - Kontrollzustand-Wurzel des Projekts
 * @param projektId - Projekt-id der bedienenden Handler-Instanz
 * @param laufId - zu prüfende laufId
 * @returns true, wenn ein Turn mit dieser laufId in der Kette existiert
 */
export function sparringLaufExistiert(basisVerzeichnis, projektId, laufId) {
  const versionen = listeVersionen(`sparring-${projektId}`, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  return versionen.some((version) => version.herkunft?.lauf_id === laufId)
}

/**
 * Schreibt EINE Zuordnung Turn→Auftrag (F-625) — aufgerufen aus POST /api/sparring/<laufId>/auftrag,
 * NACH einem bereits erfolgreichen POST /api/auftraege (der Auftrag existiert real, diese Funktion
 * registriert nur den Rückverweis). Mehrfachaufrufe für dieselbe laufId (z. B. ein zweiter, bewusst
 * angelegter Auftrag) schreiben additiv eine weitere Version — baueSparringVerlaufsProjektion liest
 * die LETZTE Version je laufId (s. u.), zeigt also immer den zuletzt angelegten Auftrag.
 * @param basisVerzeichnis - Kontrollzustand-Wurzel des Projekts
 * @param projektId - Projekt-id der bedienenden Handler-Instanz
 * @param profilReferenz - Profilreferenz dieser Serverinstanz
 * @param laufId - laufId des Sparring-Turns, aus dem der Auftrag entstand
 * @param auftragId - id des über POST /api/auftraege bereits real angelegten Auftrags
 * @returns pfad, versionSequenz und inhaltsHash der geschriebenen Version
 */
export function registriereSparringAuftragZuordnung(basisVerzeichnis, projektId, profilReferenz, laufId, auftragId) {
  return registriereKernArtefakt(zuordnungsArtefaktId(projektId), profilReferenz, { quelle: 'sparring-auftrag-bruecke' }, { laufId, auftragId }, undefined, {
    basisVerzeichnis,
    schreiber: STILLER_SCHREIBER,
  })
}

/**
 * Baut die Verlaufsprojektion für GET /api/sparring. Eine (noch) leere Kette
 * ist kein Fehler (Erststart) — listeVersionen liefert dafür bereits [].
 * @param basisVerzeichnis - Kontrollzustand-Wurzel des Projekts
 * @param projektId - Projekt-id der bedienenden Handler-Instanz (erzeugeRequestHandler-Option)
 * @returns { verlauf: [{ laufId, nachricht, coachAntwort, modus, auftragErstelltId }] }
 */
export function baueSparringVerlaufsProjektion(basisVerzeichnis, projektId) {
  const versionen = listeVersionen(`sparring-${projektId}`, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  // F-625: die Zuordnungs-Kette ist (noch) meist leer — eine fehlende/leere Kette ist kein Fehler,
  // dieselbe listeVersionen-Garantie wie oben für den Haupt-Verlauf.
  const zuordnungsVersionen = listeVersionen(zuordnungsArtefaktId(projektId), { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const auftragJeLauf = new Map()
  for (const version of zuordnungsVersionen) {
    const laufId = version.daten?.laufId
    const auftragId = version.daten?.auftragId
    if (typeof laufId === 'string' && typeof auftragId === 'string') auftragJeLauf.set(laufId, auftragId)
  }
  return {
    verlauf: versionen.map((version) => {
      const laufId = version.herkunft?.lauf_id ?? null
      return {
        laufId,
        nachricht: version.daten?.nachricht ?? null,
        coachAntwort: version.daten?.coachAntwort ?? null,
        // F34 WS-3: Alt-Einträge (vor WS-3, kein 'modus'-Feld geschrieben) projizieren als
        // 'feature' — das war ihr einziges Verhalten, bevor der Modus existierte.
        modus: version.daten?.modus ?? 'feature',
        // F34 Fixpaket (F-625): Alt-Einträge ohne Zuordnung (vor diesem Fixpaket, oder nie über die
        // Brücke angelegt) projizieren weiterhin null — unverändertes Verhalten.
        auftragErstelltId: laufId === null ? null : (auftragJeLauf.get(laufId) ?? null),
      }
    }),
  }
}
