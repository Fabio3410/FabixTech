function parseCookie(cookieHeader, name) {
    if (!cookieHeader) return null;
    const matches = cookieHeader.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
}

export async function onRequest(context) {
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
        return Response.redirect(new URL('/', request.url), 302);
    }

    const privateAdminUrl = new URL('/admin', request.url);
    const response = await context.env.ASSETS.fetch(privateAdminUrl);

    return new Response(response.body, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
    });
}