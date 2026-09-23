# F42 — Existenzprüfung bei Sparring-Auftragsverknüpfungen

## ID

F42

## Titel

Existenzprüfung bei Sparring-Auftragsverknüpfungen

## Status

Status: ENTWURF

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN.

## Ziel

Die in F-631 benannte Lücke durch Existenzprüfungen vor der Speicherung
schließen: vor jeder neuen Speicherung eines Sparring-Auftragsrückverweises
prüft `verknuepfeSparringAuftrag` die Existenz sowohl des Sparring-Laufs als
auch des Auftrags über die bestehenden projektbezogenen Lade-/
Zugriffsfunktionen. Eine unbekannte ID wird mit einem klaren, unterscheidbaren
Fehler über den bestehenden API-Fehlermechanismus abgelehnt, ohne dass ein
Rückverweis gespeichert wird.

## Nicht-Ziele

- Bestehende Rückverweise nachträglich verändern.
- Den Sparring- oder Auftragslebenszyklus neu gestalten.

## Akzeptanzkriterien

- Bei unbekannter `laufId` und existierendem Auftrag lehnt der Endpunkt die
  Verknüpfung mit einem klaren Fehler zum unbekannten Sparring-Lauf ab; es
  wird kein Rückverweis gespeichert.
- Bei existierendem Sparring-Lauf und formal gültiger, aber unbekannter
  `auftragId` lehnt der Endpunkt die Verknüpfung mit einem klaren Fehler zum
  unbekannten Auftrag ab; der gespeicherte Rückverweis bleibt unverändert.
- Bei existierendem Sparring-Lauf und existierendem Auftrag wird der
  Rückverweis weiterhin erfolgreich gespeichert.
- Beide Existenzprüfungen erfolgen vor dem Speichern des Rückverweises; die
  bestehende Formprüfung der `auftragId` bleibt erhalten.
- Automatisierte Tests belegen beide Fehlerfälle einschließlich
  ausbleibender Speicherung und den erfolgreichen gültigen
  Verknüpfungsfall.
- `npm run check` ist grün.
- Code-Review und QA mit frischem Kontext sind vor der Freigabe
  durchgeführt.

## Dependencies

- (keine) — baut auf der bestehenden Sparring-Auftragsverknüpfung (F-631)
  auf, ohne eine vorgelagerte Feature-Abhängigkeit zu benötigen.
