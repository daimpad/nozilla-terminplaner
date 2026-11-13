/* Firebase-Konfiguration des nozilla-Projekts.
 *
 * Steht hier eine Konfiguration, verbindet sich der Terminplaner automatisch —
 * Teilnehmende, die einen Umfrage-Link öffnen, müssen dann nichts eintragen.
 * Bleibt der Wert null, fragt die Seite wie bisher nach der Konfiguration.
 *
 * Die Web-Konfiguration von Firebase ist kein Geheimnis: Sie steht ohnehin in
 * jedem ausgelieferten Browser-Code. Geschützt werden die Daten über die
 * Firestore-Sicherheitsregeln im Firebase-Projekt, nicht über diese Werte.
 * Den Wert findest du in der Firebase-Konsole unter
 * Projekteinstellungen › Allgemein › Deine Apps › SDK-Einrichtung › Konfiguration.
 */
window.NZ_FIREBASE_CONFIG = null;
/* Beispiel:
window.NZ_FIREBASE_CONFIG = {
  apiKey: "…", authDomain: "…", projectId: "…",
  storageBucket: "…", messagingSenderId: "…", appId: "…"
};
*/
