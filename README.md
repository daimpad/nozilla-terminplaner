# nozilla Terminplaner

Termine vorschlagen, Link teilen, alle tragen ein, wann sie können. Der beste Termin steht oben.

Eine einzelne HTML-Seite ohne Build-Schritt. Die Daten liegen in Firebase Firestore, die Gestaltung kommt aus dem [nozilla Design System](https://daimpad.github.io/nozilla-ci/ci/).

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite und Logik |
| `terminplaner.css` | Ergänzungen zum Design System, nur was dieses Werkzeug zusätzlich braucht |
| `config.js` | Firebase-Konfiguration des Projekts (optional, siehe unten) |

## Firebase einrichten

1. In der [Firebase-Konsole](https://console.firebase.google.com/) ein Projekt anlegen und **Firestore** aktivieren.
2. Unter *Projekteinstellungen › Allgemein › Deine Apps* eine Web-App anlegen und deren Konfiguration kopieren.
3. Die Konfiguration in `config.js` eintragen. Dann verbindet sich die Seite für alle automatisch. Ohne `config.js` fragt sie in jedem Browser einmal danach.

Die Web-Konfiguration ist kein Geheimnis, sie steht in jedem ausgelieferten Browser-Code. Geschützt werden die Daten über die **Firestore-Sicherheitsregeln**. Ein Vorschlag, der nur das erlaubt, was die Seite tatsächlich tut:

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

## Kalender

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
