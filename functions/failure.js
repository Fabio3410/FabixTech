export async function onRequestGet(context) {
    const begruessungText = "Es gab ein Problem!";

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="apple-mobile-web-app-title" content="Fabio3D">
        <title>Ein Fehler ist aufgetreten!</title>
        <script>
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        </script>
        <link rel="icon" type="image/png" href="../favicon/favicon-96x96.png" sizes="96x96"/>
        <link rel="icon" type="image/svg+xml" href="../favicon/favicon.svg"/>
        <link rel="shortcut icon" href="../favicon/favicon.ico"/>
        <link rel="apple-touch-icon" sizes="180x180" href="../favicon/apple-touch-icon.png"/>
        <link rel="manifest" href="../favicon/site.webmanifest"/>
        <style>
        :root {
            --bg-body: #f4f6f8;
            --bg-card: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --icon-bg: #FEE2E2;
        }

        html[data-theme="dark"] {
            --bg-body: #0f172a;
            --bg-card: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border-color: #334155;
            --icon-bg: #450a0a;
        }

        body {
            font-family: sans-serif;
            background: var(--bg-body); 
            color: var(--text-main);
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0; 
            transition: background-color 0.3s, color 0.3s;
        }
        
        .card { 
            background: var(--bg-card); 
            padding: 30px; 
            border-radius: 16px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
            border: 1px solid var(--border-color);
            max-width: 400px; 
            width: 90%; 
        }
        
        h1 { 
            text-align: center; 
            font-size: 22px; 
            color: var(--text-main);
        }

        p {
            text-align: center; 
            color: var(--text-muted);
        }
            
        .btn { 
            display: block; 
            text-align: center; 
            background: #d40202; 
            color: white; 
            padding: 12px; 
            border-radius: 8px; 
            text-decoration: none; 
            margin-top: 20px; 
            font-weight: bold; 
        }

        .icon {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 56px;
            height: 56px;
            background-color: var(--icon-bg);
            border-radius: 50%;
            margin: 0 auto 24px auto;
        }

        .icon img {
            width: 56px;
            height: 56px;
        }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">
                <img src="../images/failure.png" alt="Fehler">
            </div>
            <h1>${begruessungText}</h1>
            <p style="font-weight: 500; margin-bottom: 20px;">
                Deine Zahlung konnte nicht verarbeitet werden.
            </p>
            <p>
                Entweder wurde der Bezahlvorgang abgebrochen oder deine Zahlungsmethode wurde abgelehnt. 
                Es wurden keine Beträge abgebucht.
            </p>
            <p>
                Bitte entschuldige das Problem. Du kannst es gerne jederzeit noch einmal probieren!
            </p>
            <a href="../index#shop" class="btn">Zurück zum Shop</a>
        </div>
    </body>
    </html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}