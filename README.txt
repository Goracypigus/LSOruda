
LSO — prosty panel (HTML/CSS/JS)

Instrukcje:
1. Rozpakuj archiwum.
2. Otwórz folder w Visual Studio Code:
   - Linux/macOS: unzip lso_app.zip -d lso_app && cd lso_app && code .
   - Windows (PowerShell): Expand-Archive lso_app.zip -DestinationPath lso_app; cd lso_app; code .
3. Edycja użytkowników:
   - Otwórz plik app.js i zmodyfikuj sekcję `usersSample` (na początku pliku).
   - Pierwszy użytkownik (user1) ma role 'admin' i password 'adminpass'.
4. Aplikacja działa lokalnie — bez backendu. Dane są przechowywane w localStorage przeglądarki.
5. Funkcje admina: przydzielanie funkcji, dodawanie/odejmowanie punktów, dodawanie służb, publikowanie ogłoszeń.
   Użytkownik: tylko odczyt profilu, punktów i ogłoszeń.
