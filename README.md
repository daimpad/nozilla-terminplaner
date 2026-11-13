# nozilla Terminplaner

Termine vorschlagen, Link teilen, alle tragen ein, wann sie können. Der beste Termin steht oben.

Eine einzelne HTML-Seite ohne Build-Schritt. Die Daten liegen in Firebase Firestore, die Gestaltung kommt aus dem [nozilla Design System](https://daimpad.github.io/nozilla-ci/ci/).

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite und Logik |
| `terminplaner.css` | Ergänzungen zum Design System, nur was dieses Werkzeug zusätzlich braucht |
| `kalender.js` | Abgleich mit dem eigenen Google-Kalender (optional, siehe unten) |
| `config.js` | Firebase-Konfiguration und Google-Client-ID. Im Repository leer |

## Konfiguration

Der Terminplaner braucht zwei Werte. **Beide stehen nicht im Code**, sondern als Variablen im Repository. Beim Veröffentlichen schreibt der Workflow daraus die `config.js`.

*Settings › Secrets and variables › Actions › Tab „Variables" › New repository variable*

| Variable | Wert | Wofür |
|---|---|---|
| `FIREBASE_CONFIG` | die Konfiguration aus der Firebase-Konsole, als JSON oder so, wie die Konsole sie anzeigt (`const firebaseConfig = {…}`) | Pflicht. Ohne sie fragt die Seite jeden Besucher nach einer eigenen Konfiguration |
| `GOOGLE_CLIENT_ID` | die OAuth-Client-ID, endet auf `.apps.googleusercontent.com` | optional, schaltet den Kalenderabgleich ein |

Danach unter *Actions › Veröffentlichen › Run workflow* einmal neu veröffentlichen. Eine fehlerhafte Eingabe bricht die Veröffentlichung mit einer Meldung ab, statt eine kaputte Seite auszuliefern.

**Beide Werte sind kein Geheimnis.** Sie stehen bei jeder Web-App im ausgelieferten Browser-Code. Geschützt wird anders: die Daten über die Firestore-Sicherheitsregeln, die Google-Anmeldung über die Liste erlaubter Adressen in der Google Cloud Console. Die Variablen halten die Werte nur aus der Versionsgeschichte heraus.

**Selbst hosten:** Wer die Seite auf einem eigenen Server ausliefert, legt eine ausgefüllte `config.js` daneben, etwa per FTP. Die Vorlage im Repository zeigt das Format.

## Firebase einrichten

1. In der [Firebase-Konsole](https://console.firebase.google.com/) ein Projekt anlegen und **Firestore** aktivieren.
2. Unter *Projekteinstellungen › Allgemein › Deine Apps* eine Web-App anlegen und deren Konfiguration kopieren.
3. Die Konfiguration als Variable `FIREBASE_CONFIG` eintragen (siehe oben).

Ein Vorschlag für die **Firestore-Sicherheitsregeln**, der nur erlaubt, was die Seite tatsächlich tut:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /polls/{pollId} {
      allow get: if true;                       // wer den Link hat, darf lesen
      allow list: if false;                     // aber nicht alle Umfragen auflisten
      allow create: if request.resource.data.keys().hasAll(['title', 'options', 'participants', 'responses'])
                    && request.resource.data.title is string
                    && request.resource.data.title.size() <= 200;
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['participants', 'responses', 'lastModified']);
      allow delete: if false;
    }
  }
}
```

## Eigener Kalender abgleichen (optional)

Beim Anlegen einer Umfrage zeigt die Seite neben jedem Termin, ob man selbst **frei** oder **belegt** ist, und schlägt freie Zeiten vor: werktags von 9 bis 17 Uhr, die nächsten zwei Wochen. Man meldet sich dafür mit dem eigenen Google-Konto an.

- **Abgefragt wird nur frei oder belegt**, nie Titel, Orte oder Teilnehmende. Dazu kommt die Liste der Kalender, damit man wählen kann, welche zählen.
- **Der Zugangsschlüssel bleibt im Browser** und verfällt nach einer Stunde. Gespeichert wird nur, welche Kalender ausgewählt sind.
- **Nichts davon landet in der Umfrage** oder in Firebase.

**Zwei Google-Konten:** Den zweiten Kalender dem ersten Konto freigeben. Im zweiten Konto unter *Einstellungen › Kalender › Für bestimmte Personen freigeben* das erste Konto eintragen, Berechtigung „Nur Verfügbarkeit (frei/belegt)". Dann reicht eine Anmeldung, und beide Kalender stehen zur Auswahl.

**Einrichten, einmalig:**

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen.
2. *APIs und Dienste › Bibliothek*: **Google Calendar API** aktivieren.
3. *APIs und Dienste › OAuth-Zustimmungsbildschirm*: Nutzertyp **Extern**, Status **Testing**. Unter *Testnutzer* das eigene Google-Konto eintragen. Im Status Testing prüft Google die App nicht, anmelden können sich aber nur eingetragene Testnutzer. Für ein persönliches Werkzeug ist das genau richtig.
4. *APIs und Dienste › Anmeldedaten › Anmeldedaten erstellen › OAuth-Client-ID*, Typ **Webanwendung**. Unter *Autorisierte JavaScript-Quellen* die Adresse eintragen, unter der der Terminplaner läuft, ohne Pfad: `https://daimpad.github.io`, später zusätzlich die eigene Subdomain.
5. Die Client-ID als Variable `GOOGLE_CLIENT_ID` eintragen (siehe oben) und neu veröffentlichen.

Ohne `GOOGLE_CLIENT_ID` bleibt das Feld unsichtbar, und die Seite lädt nichts von Google.

## Bester Termin in den Kalender

Sobald jemand abgestimmt hat, zeigt die Seite unter der Tabelle den **besten Termin** (bei Gleichstand alle) mit zwei Knöpfen:

- **In Google Kalender** öffnet einen vorausgefüllten Termin in Google Kalender.
- **Kalenderdatei (.ics)** lädt eine Datei für Outlook, Apple Kalender und alle anderen.

Die Dauer wird beim Anlegen der Umfrage gewählt (Standard: 1 Stunde). Termine werden in der Zeitzone des Browsers eingegeben und für den Kalender in UTC umgerechnet, damit sie in jedem Kalender zur richtigen Uhrzeit landen.

## Google-Sheets-Export

Der Export ist optional. **Er funktioniert mit einem reinen API-Schlüssel nicht:** Google erlaubt das Anlegen und Beschreiben von Tabellen nur mit OAuth-Anmeldung. Für einen funktionierenden Export braucht es entweder eine Google-Anmeldung in der Seite oder einen CSV-Download als einfachere Alternative.

## Design System

`index.html` bindet das Design System über jsDelivr in einem **festen Stand** ein (Commit-Kennung in der URL). Änderungen am CI wirken sich deshalb nie unbemerkt aus. Ein Update ist eine bewusste Änderung der drei Zeilen im `<head>` und am Ende der Seite.

## Lokal ansehen

```bash
python3 -m http.server 8000
# http://localhost:8000
```

---

**nozilla** · Gute digitale Dienste. · contact@nozilla.de
