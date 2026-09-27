async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const data = await request.json();
    const { action, email, password, code, newPassword, profile_picture } = data;
    
    if (action === 'update_avatar') {
        if (!email || !profile_picture) {
            return new Response(JSON.stringify({ status: 'error', message: 'Fehlende Daten.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        try {
            await env.DB.prepare("UPDATE users SET profile_picture = ? WHERE email = ?")
            .bind(profile_picture, email)
            .run();
            
            return new Response(JSON.stringify({ status: 'success', message: 'Profilbild gespeichert.' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (err) {
            return new Response(JSON.stringify({ 
                status: 'error', 
                message: 'Datenbank-Fehler: ' + err.message 
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }

    if (action === 'delete_avatar') {
        if (!email) {
            return new Response(JSON.stringify({ status: 'error', message: 'Fehlende E-Mail.' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        try {
            await env.DB.prepare("UPDATE users SET profile_picture = NULL WHERE email = ?")
                .bind(email)
                .run();

            return new Response(JSON.stringify({ status: 'success', message: 'Profilbild gelöscht.' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (err) {
            return new Response(JSON.stringify({ status: 'error', message: err.message }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }

    if (action === 'send_register_code') {
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash IS NOT NULL").bind(email).all();
        
        if (results.length > 0) {
            return new Response(JSON.stringify({ status: 'error', message: 'Ein Konto mit dieser E-Mail existiert bereits.' }));
        }

        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await env.DB.prepare("INSERT INTO users (email, reset_code) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET reset_code = ?")
            .bind(email, generatedCode, generatedCode).run();

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: email,
                subject: 'Dein Registrierungscode',
                html: `<p>Dein Verifizierungscode lautet: <strong>${generatedCode}</strong></p>`
            })
        });

        return new Response(JSON.stringify({ status: 'success', message: 'Code gesendet.' }));
    }

    if (action === 'register') {
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND reset_code = ?")
            .bind(email, code).all();

        if (results.length === 0) {
            return new Response(JSON.stringify({ status: 'error', message: 'Ungültiger oder abgelaufener Code.' }));
        }

        const hashedPassword = await hashPassword(password);
        
        await env.DB.prepare("UPDATE users SET password_hash = ?, reset_code = NULL WHERE email = ?")
            .bind(hashedPassword, email).run();
            
        return new Response(JSON.stringify({ status: 'success', message: 'Konto erfolgreich erstellt.' }));
    }
    
    if (action === 'login') {
        const hashedPassword = await hashPassword(password);
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?")
        .bind(email, hashedPassword).all();
        
        if (results.length > 0) {
            const userRow = results[0];
            return new Response(JSON.stringify({ 
                status: 'success', 
                message: 'Erfolgreich angemeldet.',
                user: {
                    email: userRow.email,
                    profile_picture: userRow.profile_picture || null,
                    is_admin: userRow.is_admin === 1
                }
            }));
        } else {
            return new Response(JSON.stringify({ status: 'error', message: 'Falsche E-Mail oder Passwort.' }));
        }
    }

    if (action === 'send_reset_code') {
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash IS NOT NULL").bind(email).all();
        
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
                html: `<p>Dein Reset-Code lautet: <strong>${generatedCode}</strong></p>`
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