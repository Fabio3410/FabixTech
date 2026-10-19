function parseCookie(cookieHeader, name) {
    if (!cookieHeader) return null;
    const matches = cookieHeader.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
}

export async function onRequestPost(context) {
    try {
        const request = context.request;
        const cookieHeader = request.headers.get('Cookie') || '';
        const authHeader = request.headers.get('Authorization') || '';

        let sessionId = parseCookie(cookieHeader, 'session_id');
        if (!sessionId && authHeader.startsWith('Bearer ')) {
            sessionId = authHeader.substring(7).trim();
        }

        let isAdmin = false;

        if (sessionId) {
            try {
                const user = await context.env.DB.prepare(
                    "SELECT is_admin FROM users WHERE session_id = ?"
                ).bind(sessionId).first();

                if (user && (user.is_admin === 1 || user.is_admin === true)) {
                    isAdmin = true;
                }
            } catch (e) {
                console.error("Fehler bei Admin-Prüfung:", e);
            }
        }

        if (!isAdmin) {
            return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), { 
                status: 403, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const result = await context.env.DB.prepare(
            "DELETE FROM gift_cards WHERE is_active = 0 AND current_balance <= 0"
        ).run();

        const deletedCount = result.meta?.changes ?? 0;

        return new Response(JSON.stringify({ 
            success: true, 
            message: `${deletedCount} abgelaufene Gutscheine wurden aus der Datenbank gelöscht.` 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}