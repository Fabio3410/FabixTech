import { createMimeMessage } from 'mimetext';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { recipient, subject, code, message } = body;

        if (!recipient) {
            return new Response(JSON.stringify({ error: "Empfänger fehlt" }), { status: 400 });
        }

        const msg = createMimeMessage();

        msg.setSender({ name: 'Fabio3D', addr: 'info@fabio3d.ch' });
        msg.setRecipient(recipient);
        msg.setSubject(subject || 'Nachricht von Fabio3D');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #d40202; margin-top: 0;">FABIO<span style="color: #0f172a;">3D</span></h2>
                <p style="font-size: 15px; color: #334155;">${message || 'Hier ist dein Sicherheitscode:'}</p>
                ${code ? `
                    <div style="text-align: center; margin: 25px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #d40202; background: #f8fafc; padding: 12px 24px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">
                            ${code}
                        </span>
                    </div>
                ` : ''}
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">Diese E-Mail wurde automatisch von Fabio3D versendet.</p>
            </div>
        `;

        msg.addMessage({
            contentType: 'text/html',
            data: htmlContent
        });

        await env.SEB_EMAIL.send(msg.asEncoded());

        return new Response(JSON.stringify({ status: 'success', message: 'E-Mail erfolgreich gesendet' }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error("Fehler beim Senden über Cloudflare Email Routing:", err);
        return new Response(JSON.stringify({ status: 'error', message: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}