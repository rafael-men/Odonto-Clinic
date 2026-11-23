import { Resend } from 'resend';

const FROM_NAME = 'OdontoClinic';

/** Escapa valores vindos de usuários antes de inseri-los no HTML do e-mail. */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Envia um e-mail pelo Resend. Retorna false em caso de falha e registra o motivo no log.
 * O cliente é criado aqui, e não na importação, para que a ausência de RESEND_API_KEY
 * não quebre o build ou a inicialização da aplicação.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
        console.error('Envio de e-mail não configurado: defina RESEND_API_KEY e EMAIL_FROM.');
        return false;
    }

    try {
        const resend = new Resend(apiKey);
        const { error } = await resend.emails.send({
            from: `${FROM_NAME} <${from}>`,
            to,
            subject,
            html,
        });

        if (error) {
            console.error('Falha ao enviar e-mail:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Falha ao enviar e-mail:', err instanceof Error ? err.message : err);
        return false;
    }
}

interface AppointmentEmailData {
    patientName: string;
    patientEmail: string;
    clinicName: string;
    serviceName: string;
    date: string;
    time: string;
    paymentForm: string;
    appointmentId: string;
}

export async function sendAppointmentConfirmationEmail(data: AppointmentEmailData): Promise<boolean> {
    const cancelUrl = `${process.env.NEXT_PUBLIC_URL}/paciente/consultas`;
    const paymentLabel = data.paymentForm === 'pix' ? 'PIX' : 'Cartão de crédito';
    const patientName = escapeHtml(data.patientName);
    const clinicName = escapeHtml(data.clinicName);
    const serviceName = escapeHtml(data.serviceName);
    const date = escapeHtml(data.date);
    const time = escapeHtml(data.time);

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb, #0891b2); padding: 32px 24px; text-align: center;">
            <img src="${process.env.NEXT_PUBLIC_URL}/logos.png" alt="OdontoClinic" style="width: 48px; height: 48px; margin-bottom: 16px;" />
            <h1 style="color: white; margin: 0; font-size: 24px;">Consulta Confirmada</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Sua consulta foi agendada com sucesso!</p>
        </div>
        <div style="padding: 32px 24px;">
            <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">
                Olá, <strong>${patientName}</strong>! Aqui estão os detalhes do seu agendamento:
            </p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">🏥 Clínica</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${clinicName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">🦷 Serviço</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #f1f5f9;">${serviceName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">📅 Data</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #f1f5f9;">${date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">🕐 Horário</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #f1f5f9;">${time}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">💳 Pagamento</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #f1f5f9;">${paymentLabel}</td>
                    </tr>
                </table>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #92400e; font-size: 13px; margin: 0;">
                    Você pode cancelar esta consulta com até <strong>30 minutos de antecedência</strong> pelo sistema.
                </p>
            </div>
            <div style="text-align: center;">
                <a href="${cancelUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #0891b2); color: white; text-decoration: none; padding: 12px 32px; border-radius: 9999px; font-weight: 600; font-size: 14px;">
                    Ver minhas consultas
                </a>
            </div>
        </div>
        <div style="background: #1e293b; padding: 20px 24px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                OdontoClinic — Cuidando do seu sorriso
            </p>
        </div>
    </div>
    `;

    return sendEmail(data.patientEmail, `Consulta confirmada — ${data.clinicName}`, html);
}

interface CancellationEmailData {
    patientName: string;
    patientEmail: string;
    clinicName: string;
    serviceName: string;
    date: string;
    time: string;
}

export async function sendCancellationEmail(data: CancellationEmailData): Promise<boolean> {
    const patientName = escapeHtml(data.patientName);
    const clinicName = escapeHtml(data.clinicName);
    const serviceName = escapeHtml(data.serviceName);
    const date = escapeHtml(data.date);
    const time = escapeHtml(data.time);

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 32px 24px; text-align: center;">
            <img src="${process.env.NEXT_PUBLIC_URL}/logos.png" alt="OdontoClinic" style="width: 48px; height: 48px; margin-bottom: 16px;" />
            <h1 style="color: white; margin: 0; font-size: 24px;">Consulta Cancelada</h1>
            <p style="color: #fecaca; margin: 8px 0 0; font-size: 14px;">Sua consulta foi cancelada com sucesso.</p>
        </div>
        <div style="padding: 32px 24px;">
            <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">
                Olá, <strong>${patientName}</strong>. Confirmamos o cancelamento da sua consulta:
            </p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">🏥 Clínica</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${clinicName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">🦷 Serviço</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #f1f5f9;">${serviceName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">📅 Data</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #f1f5f9;">${date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">🕐 Horário</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #f1f5f9;">${time}</td>
                    </tr>
                </table>
            </div>
            <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_URL}/clinicas" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #0891b2); color: white; text-decoration: none; padding: 12px 32px; border-radius: 9999px; font-weight: 600; font-size: 14px;">
                    Agendar nova consulta
                </a>
            </div>
        </div>
        <div style="background: #1e293b; padding: 20px 24px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                OdontoClinic — Cuidando do seu sorriso
            </p>
        </div>
    </div>
    `;

    return sendEmail(data.patientEmail, `Consulta cancelada — ${data.clinicName}`, html);
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_URL}/paciente/redefinir-senha?token=${encodeURIComponent(token)}`;
    const safeName = escapeHtml(name);

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb, #0891b2); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Redefinir Senha</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Solicitação de alteração de senha</p>
        </div>
        <div style="padding: 32px 24px;">
            <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">
                Olá, <strong>${safeName}</strong>! Recebemos uma solicitação para redefinir sua senha.
            </p>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">
                Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #0891b2); color: white; text-decoration: none; padding: 14px 40px; border-radius: 9999px; font-weight: 600; font-size: 15px;">
                    Redefinir minha senha
                </a>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px;">
                <p style="color: #92400e; font-size: 13px; margin: 0;">
                    Se você não solicitou esta alteração, ignore este e-mail. Sua senha permanecerá a mesma.
                </p>
            </div>
        </div>
        <div style="background: #1e293b; padding: 20px 24px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                OdontoClinic — Cuidando do seu sorriso
            </p>
        </div>
    </div>
    `;

    return sendEmail(email, 'Redefinir senha — OdontoClinic', html);
}