export async function onRequestPost(context) {
    const { request, env } = context;
    const data = await request.json();
    const { action, email, code } = data;

    if (action === 'send_code') {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await env.DB.prepare(`
            INSERT INTO users (email, reset_code) VALUES (?, ?)
            ON CONFLICT(email) DO UPDATE SET reset_code = ?
        `).bind(email, generatedCode, generatedCode).run();

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: email,
                subject: 'Dein Fabio3D Sicherheitscode',
                html: `<p>Dein Code lautet: <strong>${generatedCode}</strong></p>`
            })
        });

        return new Response(JSON.stringify({ status: 'success', message: 'Code gesendet' }));
    }

    if (action === 'verify_code') {
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND reset_code = ?")
            .bind(email, code).all();

        if (results.length > 0) {
            await env.DB.prepare("UPDATE users SET reset_code = NULL WHERE email = ?").bind(email).run();
            return new Response(JSON.stringify({ status: 'success', message: 'Verifiziert' }));
        } else {
            return new Response(JSON.stringify({ status: 'error', message: 'Falscher Code' }), { status: 400 });
        }
    }

    return new Response(JSON.stringify({ status: 'error', message: 'Ungültige Aktion' }), { status: 400 });
}