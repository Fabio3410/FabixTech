async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const data = await request.json();
    const { action, email, password, code, newPassword } = data;

    if (action === 'register') {
        const { results } = await env.DB.prepare("SELECT email FROM users WHERE email = ?").bind(email).all();
        if (results.length > 0) {
            return new Response(JSON.stringify({ status: 'error', message: 'E-Mail wird bereits verwendet.' }));
        }

        const hashedPassword = await hashPassword(password);
        
        await env.DB.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
            .bind(email, hashedPassword).run();
            
        return new Response(JSON.stringify({ status: 'success', message: 'Konto erstellt.' }));
    }

    if (action === 'login') {
        const hashedPassword = await hashPassword(password);
        
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?")
            .bind(email, hashedPassword).all();

        if (results.length > 0) {
            return new Response(JSON.stringify({ status: 'success', message: 'Erfolgreich angemeldet.' }));
        } else {
            return new Response(JSON.stringify({ status: 'error', message: 'Falsche E-Mail oder Passwort.' }));
        }
    }

    if (action === 'send_code') {
        const { results } = await env.DB.prepare("SELECT email FROM users WHERE email = ?").bind(email).all();
        
        if (results.length === 0) {
            return new Response(JSON.stringify({ status: 'error', message: 'Es existiert kein Konto mit dieser E-Mail.' }));
        }

        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await env.DB.prepare("UPDATE users SET reset_code = ? WHERE email = ?")
            .bind(generatedCode, email).run();

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: email,
                subject: 'Dein Passwort-Reset-Code',
                html: `<p>Dein Code lautet: <strong>${generatedCode}</strong></p>`
            })
        });

        return new Response(JSON.stringify({ status: 'success', message: 'Code gesendet.' }));
    }

    if (action === 'verify_code') {
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND reset_code = ?")
            .bind(email, code).all();

        if (results.length > 0) {
            const hashedPassword = await hashPassword(newPassword);
            
            await env.DB.prepare("UPDATE users SET password_hash = ?, reset_code = NULL WHERE email = ?")
                .bind(hashedPassword, email).run();
                
            return new Response(JSON.stringify({ status: 'success', message: 'Passwort erfolgreich geändert.' }));
        } else {
            return new Response(JSON.stringify({ status: 'error', message: 'Der Code ist falsch oder abgelaufen.' }));
        }
    }

    return new Response(JSON.stringify({ status: 'error', message: 'Ungültige Aktion.' }), { status: 400 });
}