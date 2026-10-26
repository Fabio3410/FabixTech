let blocklistCache = null;

async function loadBlocklist(request, env) {
    if (blocklistCache) return blocklistCache;

    try {
        const res = await env.ASSETS.fetch(new URL('/disposable_email_blocklist.conf', request.url));
        if (!res.ok) {
            console.error('Blocklist konnte nicht geladen werden:', res.status);
            return new Set();
        }

        const text = await res.text();
        blocklistCache = new Set(
            text.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean)
        );
        return blocklistCache;
    } catch (e) {
        console.error('Blocklist-Fehler:', e);
        return new Set();
    }
}

async function isDisposableEmail(email, request, env) {
    const blocklist = await loadBlocklist(request, env);
    const domain = String(email || '').split('@').pop().trim().toLowerCase();
    const parts = domain.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
        if (blocklist.has(parts.slice(i).join('.'))) return true;
    }
    return false;
}

const DISPOSABLE_RESPONSE = () => new Response(JSON.stringify({
    status: 'error',
    message: 'Wegwerf-E-Mail-Adressen sind nicht erlaubt. Bitte verwende eine dauerhafte E-Mail-Adresse.'
}), { status: 400, headers: { 'Content-Type': 'application/json' } });

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

function isStrongPassword(password) {
    if (!password) return false;
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return minLength && hasUpper && hasLower && hasNumber;
}

async function sendCodeEmail(env, recipient, subject, code, introText) {
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
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Diese E-Mail wurde automatisch von FabixTech versendet.</p>
        </div>
    `;

    const emailResponse = await env.EMAIL_SERVICE.fetch(new Request("https://internal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            recipient: recipient,
            subject: subject,
            htmlContent: htmlContent
        })
    }));

    const emailResult = await emailResponse.json();
    if (emailResult.status !== "success") {
        throw new Error(emailResult.message || "Fehler beim E-Mail-Versand über den Worker");
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const data = await request.json();
    
    const { action, email, password, code, newPassword, profile_picture, name, turnstileToken } = data;

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

        if (await isDisposableEmail(email, request, env)) return DISPOSABLE_RESPONSE();

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
        if (await isDisposableEmail(email, request, env)) return DISPOSABLE_RESPONSE();

        if (!isStrongPassword(password)) {
            return new Response(JSON.stringify({ 
                status: 'error', 
                message: 'Das Passwort muss mindestens 8 Zeichen lang sein und Großbuchstaben, Kleinbuchstaben sowie Zahlen enthalten.' 
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND reset_code = ?")
            .bind(email, code).all();

        if (results.length === 0) {
            return new Response(JSON.stringify({ status: 'error', message: 'Ungültiger oder abgelaufener Code.' }));
        }

        const hashedPassword = await hashPassword(password);
        
        await env.DB.prepare("UPDATE users SET name = ?, password_hash = ?, reset_code = NULL, failed_attempts = 0, locked_until = 0 WHERE email = ?")
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

        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        
        if (!user || !user.password_hash) {
            return new Response(JSON.stringify({ status: 'error', message: 'Falsche E-Mail oder Passwort.' }));
        }

        const now = Math.floor(Date.now() / 1000);

        if (user.locked_until && user.locked_until > now) {
            const remainingMinutes = Math.ceil((user.locked_until - now) / 60);
            return new Response(JSON.stringify({ 
                status: 'error', 
                message: `Konto vorübergehend gesperrt. Bitte versuche es in ${remainingMinutes} Minute(n) erneut.` 
            }));
        }

        const hashedPassword = await hashPassword(password);

        if (user.password_hash === hashedPassword) {
            await env.DB.prepare("UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE email = ?").bind(email).run();

            const sessionId = crypto.randomUUID();

            try {
                await env.DB.prepare("UPDATE users SET session_id = ? WHERE email = ?")
                    .bind(sessionId, user.email).run();
            } catch (err) {
                console.error("Fehler beim Speichern der Session-ID:", err);
            }

            const cookieHeader = `session_id=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;

            return new Response(JSON.stringify({ 
                status: 'success', 
                message: 'Erfolgreich angemeldet.',
                session_id: sessionId,
                user: {
                    name: user.name || user.email,
                    email: user.email,
                    profile_picture: user.profile_picture || null,
                    is_admin: user.is_admin === 1,
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
            const newAttempts = (user.failed_attempts || 0) + 1;
            let lockUntilTime = 0;

            if (newAttempts >= 5) {
                lockUntilTime = now + 600;
            }

            await env.DB.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE email = ?")
                .bind(newAttempts, lockUntilTime, email).run();

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
        if (!isStrongPassword(newPassword)) {
            return new Response(JSON.stringify({ 
                status: 'error', 
                message: 'Das neue Passwort muss mindestens 8 Zeichen lang sein und Großbuchstaben, Kleinbuchstaben sowie Zahlen enthalten.' 
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND reset_code = ?")
            .bind(email, code).all();

        if (results.length > 0) {
            const hashedPassword = await hashPassword(newPassword);
            await env.DB.prepare("UPDATE users SET password_hash = ?, reset_code = NULL, failed_attempts = 0, locked_until = 0 WHERE email = ?")
                .bind(hashedPassword, email).run();
                
            return new Response(JSON.stringify({ status: 'success', message: 'Passwort erfolgreich geändert.' }));
        } else {
            return new Response(JSON.stringify({ status: 'error', message: 'Der Code ist falsch oder abgelaufen.' }));
        }
    }

    return new Response(JSON.stringify({ status: 'error', message: 'Ungültige Aktion.' }), { status: 400 });
}
