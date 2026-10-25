async function sendViaWorker(env, recipient, subject, htmlContent) {
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

    try {
        const body = await request.json();

        if (body.type === 'order_confirmation') {
            const { recipient, customerName, orderId, items, subtotal, discount, promoCode, shipping, total } = body;

            if (!recipient) {
                return new Response(JSON.stringify({ error: "Empfänger fehlt" }), { status: 400, headers: { "Content-Type": "application/json" } });
            }

            const itemsHtml = (items || []).map(i => `
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">
                        <strong>${i.quantity}x</strong> ${i.name} <span style="color: #64748b; font-size: 12px;">(${i.farbe || i.variant || 'Standard'})</span>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b; font-size: 14px; font-weight: 600;">
                        CHF ${(i.price / 100 * i.quantity).toFixed(2)}
                    </td>
                </tr>
            `).join('');

            const discountRow = discount > 0 ? `
                <tr>
                    <td style="padding: 8px 0; color: #16a34a; font-size: 14px;">Rabatt ${promoCode && promoCode !== 'Keiner' ? '(' + promoCode + ')' : ''}</td>
                    <td style="padding: 8px 0; text-align: right; color: #16a34a; font-size: 14px; font-weight: 600;">- CHF ${Number(discount).toFixed(2)}</td>
                </tr>
            ` : '';

            const htmlContent = `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                    <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px;">
                        <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 800;">FABIO<span style="color: #d40202;">3D</span></h2>
                        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Vielen Dank für deine Bestellung!</p>
                    </div>

                    <p style="font-size: 15px; color: #334155;">Hallo <strong>${customerName || 'Kunde'}</strong>,</p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.5;">wir haben deine Bestellung <strong>#${orderId}</strong> erfolgreich erhalten und kümmern uns ab sofort um den 3D-Druck deiner Wunsch-Modelle.</p>

                    <h3 style="font-size: 16px; color: #1e293b; margin-top: 25px; margin-bottom: 10px;">Bestellübersicht</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        ${itemsHtml}
                    </table>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Zwischensumme</td>
                            <td style="padding: 6px 0; text-align: right; color: #334155; font-size: 14px;">CHF ${Number(subtotal).toFixed(2)}</td>
                        </tr>
                        ${discountRow}
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Versandkosten</td>
                            <td style="padding: 6px 0; text-align: right; color: #334155; font-size: 14px;">CHF ${Number(shipping).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-top: 2px solid #e2e8f0; color: #1e293b; font-size: 16px; font-weight: bold;">Gesamttotal</td>
                            <td style="padding: 12px 0; border-top: 2px solid #e2e8f0; text-align: right; color: #d40202; font-size: 18px; font-weight: 800;">CHF ${Number(total).toFixed(2)}</td>
                        </tr>
                    </table>

                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 20px;">
                        <p style="font-size: 13px; color: #64748b; margin: 0;">Du wirst per E-Mail benachrichtigt, sobald sich der Status deiner Bestellung ändert.</p>
                    </div>

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">FabixTech &bull;</p>
                </div>
            `;

            const subject = "Bestellbestätigung #" + orderId + " | FabixTech";
            await sendViaWorker(env, recipient, subject, htmlContent);

            return new Response(JSON.stringify({ status: "success", message: "Bestellbestätigung gesendet" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        const recipient = body.recipient;
        const subject = body.subject ? body.subject : "Nachricht von FabixTech";
        const message = body.message ? body.message : "Hier ist dein Sicherheitscode:";
        const code = body.code ? body.code : "";

        if (!recipient) {
            return new Response(JSON.stringify({ error: "Empfänger fehlt" }), { status: 400 });
        }

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

        await sendViaWorker(env, recipient, subject, htmlContent);

        return new Response(JSON.stringify({ status: "success", message: "E-Mail erfolgreich gesendet" }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("Fehler beim Senden über das Service Binding:", err);
        return new Response(JSON.stringify({ status: "error", message: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}