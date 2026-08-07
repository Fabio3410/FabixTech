export async function onRequestGet(context) {
    const begruessungText = "Es gab ein Problem!";

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ein Fehler ist aufgetreten!</title>
        <link rel="icon" type="image/png" href="images/favicon.png">
        <style>
        
        body {
            font-family: sans-serif;
            background: #f4f6f8; display: flex; 
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
            max-width: 400px; width: 90%; 
        }
        
        h1 { 
            text-align: center; 
            font-size: 22px; 
        }

        p {
            text-align: center; 
            color:  #8792a2;
        }
            
        .btn { 
            display: block; 
            text-align: center; 
            background: #2563eb; 
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
            background-color: #FEE2E2;
            color: #FEE2E2;
            font-size: 24px;
            font-weight: bold;
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
                <img src="../images/failure.png">
            </div>
            <h1>${begruessungText}</h1>
            <p style="text-align: center; color: #8792a2; font-weight: 500; margin-bottom: 20px;">
                Deine Zahlung konnte nicht verarbeitet werden.
            </p>
            <p>
                Entweder wurde der Bezahlvorgang abgebrochen oder deine Zahlungsmethode wurde abgelehnt. 
                Es wurden keine Beträge abgebucht.
            </p>
            <p>
                Bitte entschuldige die Unannehmlichkeiten. Du kannst es gerne jederzeit noch einmal probieren!
            </p>
            <a href="../index#shop" class="btn">Zurück zum Shop</a>
        </div>
    </body>
    </html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
