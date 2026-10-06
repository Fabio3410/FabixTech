import { EmailMessage } from "cloudflare:email";

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const recipient = body.recipient;
        const subject = body.subject ? body.subject : "Nachricht von Fabio3D";
        const message = body.message ? body.message : "Hier ist dein Sicherheitscode:";
        const code = body.code ? body.code : "";

        if (!recipient) {
            return new Response(JSON.stringify({ error: "Empfänger fehlt" }), { status: 400 });
        }

        const senderEmail = "info@fabio3d.ch";

        let codeBlock = "";
        if (code) {
            codeBlock = `
                <div style="text-align: center; margin: 25px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #d40202; background: #f8fafc; padding: 12px 24px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">
                        ${code}
                    </span>
                </div>
            `;
        }

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #d40202; margin-top: 0;">FABIO<span style="color: #0f172a;">3D</span></h2>
                <p style="font-size: 15px; color: #334155;">${message}</p>
                ${codeBlock}
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">Diese E-Mail wurde automatisch versendet. Bitte antworte nicht auf diese E-Mail.</p>
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

        return new Response(JSON.stringify({ status: "success", message: "E-Mail erfolgreich gesendet" }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("Fehler beim Senden über Cloudflare Email Routing:", err);
        return new Response(JSON.stringify({ status: "error", message: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}