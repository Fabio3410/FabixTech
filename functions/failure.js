export async function onRequestGet(context) {
    const begruessungText = "Es gab ein Problem!";

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ein Fehler ist aufgetreten!</title>
        <style>
            body { 
                font-family: sans-serif; 
                background: #f4f6f8; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                margin: 0; 
            }
            .card { 
                background: #fff; 
                padding: 30px; 
                border-radius: 16px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
                max-width: 400px; 
                width: 90%; 
            }
            h1 { 
                text-align: center; 
                font-size: 22px; 
                color: #e11d48;
                margin-top: 0;
            }
            p {
                color: #4f566b;
                line-height: 1.5;
                font-size: 15px;
            }
            .btn { 
                display: block; 
                text-align: center; 
                background: #635bff; 
                color: white; 
                padding: 12px; 
                border-radius: 8px; 
                text-decoration: none; 
                margin-top: 25px; 
                font-weight: bold; 
            }
            .btn:hover {
                background: #4f46e5;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>${begruessungText}</h1>
            <p style="text-align: center; color: #8792a2; font-weight: 500; margin-bottom: 20px;">
                Deine Zahlung konnte nicht verarbeitet werden.
            </p>
            <p>
                Entweder wurde der Bezahlvorgang abgebrochen oder deine Karte/Zahlungsmethode wurde abgelehnt. 
                Es wurden keine Beträge abgebucht.
            </p>
            <p>
                Bitte entschuldige die Unannehmlichkeiten. Du kannst es gerne jederzeit noch einmal probieren!
            </p>
            <a href="/" class="btn">Zurück zum Shop</a>
        </div>
    </body>
    </html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
