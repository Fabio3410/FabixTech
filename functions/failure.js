import Stripe from 'stripe';

export async function onRequestGet(context) {
    const kundeName = session.customer_details?.name;
    const begruessungText = kundeName ? `Es gab ein Problem, ${kundeName}!` : "Es ist ein Fehler aufgetreten!";
    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ein Fehler ist aufgetreten!</title>
        <style>
            body { font-family: sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background: #fff; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 400px; width: 90%; }
            h1 { text-align: center; font-size: 22px; }
            .btn { display: block; text-align: center; background: #635bff; color: white; padding: 12px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>${begruessungText}</h1>
            <p style="text-align: center; color:  #8792a2;">Ihre Zahlung konnte nicht verarbeitet werden.</p>
            <p>Aufgrund eines Fehlers konnte Ihre Zahlung nicht verarbeitet werden. Bitte entschludigen Sie die Unannehmlichkeiten.</p>
            <a href="/" class="btn">Zurück zur Startseite</a>
        </div>
    </body>
    </html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    return new Response("Fehler: " + error.message, { status: 500 });
  }
}
