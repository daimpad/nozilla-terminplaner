/* Konfiguration des Terminplaners.
 *
 * In diesem Repository bleiben beide Werte leer. Beim Veröffentlichen über
 * GitHub Pages schreibt der Workflow (.github/workflows/pages.yml) diese Datei
 * aus den Repository-Variablen FIREBASE_CONFIG und GOOGLE_CLIENT_ID neu.
 * Wer die Seite selbst hostet, legt eine ausgefüllte config.js daneben,
 * zum Beispiel per FTP.
 *
 * Beide Werte sind kein Geheimnis: Sie stehen bei jeder Web-App im
 * ausgelieferten Browser-Code. Geschützt wird anders, die Daten über die
 * Firestore-Sicherheitsregeln, die Google-Anmeldung über die Liste erlaubter
 * Adressen in der Google Cloud Console.
 */

/* Firebase: Projekteinstellungen › Allgemein › Deine Apps › Konfiguration.
 * Steht hier eine Konfiguration, verbindet sich die Seite für alle von selbst.
 * Bleibt sie null, fragt die Seite in jedem Browser einmal danach. */
window.NZ_FIREBASE_CONFIG = null;

/* Google: OAuth-Client-ID (Typ „Webanwendung"), endet auf
 * .apps.googleusercontent.com. Ist sie gesetzt, erscheint beim Anlegen einer
 * Umfrage der Abgleich mit dem eigenen Google-Kalender. */
window.NZ_GOOGLE_CLIENT_ID = null;
