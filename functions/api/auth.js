import { EmailMessage } from "cloudflare:email";

function parseCookie(cookieHeader, name) {
    if (!cookieHeader) return null;
    const matches = cookieHeader.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
}

async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyTurnstile(token, secretKey) {
    if (!token || !secretKey) return false;
    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: secretKey, response: token })
        });
        const data = await res.json();
        return data.success === true;
    } catch (e) {
        console.error("Turnstile error:", e);
        return false;
    }
}

async function sendCodeEmail(env, recipient, subject, code, introText) {
    const senderEmail = "info@fabio3d.ch";
    
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #d40202; margin-top: 0;">FABIO<span style="color: #0f172a;">3D</span></h2>
            <p style="font-size: 15px; color: #334155;">${introText}</p>
            <div style="text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #d40202; background: #f8fafc; padding: 12px 24px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">
                    ${code}
                </span>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Diese E-Mail wurde automatisch von Fabio3D versendet.</p>
        </div>
    `;

    const rawEmail = [
        "From: Fabio3D <" + senderEmail + ">",
        "To: " + recipient,
        "Subject: " + subject,
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=utf-8",
        "",
        htmlContent
    ].join("\r\n");

    const emailMsg = new EmailMessage(senderEmail, recipient, rawEmail);
    await env.SEB_EMAIL.send(emailMsg);
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const data = await request.json();
    const { action, password, code, newPassword, profile_picture, name, turnstileToken } = data;

    if (action === 'update_avatar' || action === 'delete_avatar') {
        const cookieHeader = request.headers.get('Cookie') || '';
        const sessionId = parseCookie(cookieHeader, 'session_id');

        if (!sessionId) {
            return new Response(JSON.stringify({ status: 'error', message: 'Nicht angemeldet.' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const user = await env.DB.prepare("SELECT * FROM users WHERE session_id = ?").bind(sessionId).first();
        if (!user) {
            return new Response(JSON.stringify({ status: 'error', message: 'Ungültige Sitzung.' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const userEmail = user.email;

        if (action === 'update_avatar') {
            if (!profile_picture) {
                return new Response(JSON.stringify({ status: 'error', message: 'Kein Bild angegeben.' }), { 
                    status: 400, headers: { 'Content-Type': 'application/json' } 
                });
            }
            
            try {
                await env.DB.prepare("UPDATE users SET profile_picture = ? WHERE email = ?")
                    .bind(profile_picture, userEmail)
                    .run();
                
                return new Response(JSON.stringify({ status: 'success', message: 'Profilbild gespeichert.' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response(JSON.stringify({ status: 'error', message: 'Datenbank-Fehler: ' + err.message }), { 
                    status: 500, headers: { 'Content-Type': 'application/json' } 
                });
            }
        }

        if (action === 'delete_avatar') {
            try {
                await env.DB.prepare("UPDATE users SET profile_picture = NULL WHERE email = ?")
                    .bind(userEmail)
                    .run();

                return new Response(JSON.stringify({ status: 'success', message: 'Profilbild gelöscht.' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response(JSON.stringify({ status: 'error', message: err.message }), { 
                    status: 500, headers: { 'Content-Type': 'application/json' } 
                });
            }
        }
    }

    if (action === 'send_register_code') {
        const isValidCaptcha = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
        if (!isValidCaptcha) {
            return new Response(JSON.stringify({ status: 'error', message: 'Bitte bestätige das CAPTCHA.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash IS NOT NULL").bind(email).all();
        
        if (results.length > 0) {
            return new Response(JSON.stringify({ status: 'error', message: 'Ein Konto mit dieser E-Mail existiert bereits.' }));
        }

        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await env.DB.prepare("INSERT INTO users (email, reset_code) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET reset_code = ?")
            .bind(email, generatedCode, generatedCode).run();

        try {
            await sendCodeEmail(env, email, "Dein Registrierungscode", generatedCode, "Dein Verifizierungscode für die Registrierung lautet:");
            return new Response(JSON.stringify({ status: 'success', message: 'Code gesendet.' }));
        } catch (err) {
            return new Response(JSON.stringify({ status: 'error', message: 'Fehler beim Mail-Versand: ' + err.message }), { status: 500 });
        }
    }

    if (action === 'register') {
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND reset_code = ?")
            .bind(email, code).all();

        if (results.length === 0) {
            return new Response(JSON.stringify({ status: 'error', message: 'Ungültiger oder abgelaufener Code.' }));
        }

        const hashedPassword = await hashPassword(password);
        
        await env.DB.prepare("UPDATE users SET name = ?, password_hash = ?, reset_code = NULL WHERE email = ?")
            .bind(name || null, hashedPassword, email).run();
            
        return new Response(JSON.stringify({ status: 'success', message: 'Konto erfolgreich erstellt.' }));
    }

    if (action === 'login') {
        const isValidCaptcha = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
        if (!isValidCaptcha) {
            return new Response(JSON.stringify({ status: 'error', message: 'Bitte bestätige das CAPTCHA.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        const hashedPassword = await hashPassword(password);
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?")
            .bind(email, hashedPassword).all();
        
        if (results.length > 0) {
            const userRow = results[0];
            const sessionId = crypto.randomUUID();

            try {
                await env.DB.prepare("UPDATE users SET session_id = ? WHERE email = ?")
                    .bind(sessionId, userRow.email).run();
            } catch (err) {
                console.error("Fehler beim Speichern der Session-ID:", err);
            }

            const cookieHeader = `session_id=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;

            return new Response(JSON.stringify({ 
                status: 'success', 
                message: 'Erfolgreich angemeldet.',
                session_id: sessionId,
                user: {
                    name: userRow.name || userRow.email,
                    email: userRow.email,
                    profile_picture: userRow.profile_picture || null,
                    is_admin: userRow.is_admin === 1,
                    session_id: sessionId
                }
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': cookieHeader
                }
            });
        } else {
            return new Response(JSON.stringify({ status: 'error', message: 'Falsche E-Mail oder Passwort.' }));
        }
    }

    if (action === 'send_reset_code') {
        const isValidCaptcha = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
        if (!isValidCaptcha) {
            return new Response(JSON.stringify({ status: 'error', message: 'Bitte bestätige das CAPTCHA.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash IS NOT NULL").bind(email).all();
        
        if (results.length === 0) {
            return new Response(JSON.stringify({ status: 'error', message: 'Es existiert kein Konto mit dieser E-Mail.' }));
        }

        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await env.DB.prepare("UPDATE users SET reset_code = ? WHERE email = ?")
            .bind(generatedCode, email).run();

        try {
            await sendCodeEmail(env, email, "Dein Passwort-Reset-Code", generatedCode, "Dein Verifizierungscode lautet:");
            return new Response(JSON.stringify({ status: 'success', message: 'Code gesendet.' }));
        } catch (err) {
            return new Response(JSON.stringify({ status: 'error', message: 'Fehler beim Mail-Versand: ' + err.message }), { status: 500 });
        }
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