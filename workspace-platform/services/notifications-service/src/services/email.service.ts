import nodemailer from "nodemailer";

export class EmailService {
    private transporter!: nodemailer.Transporter;
    private initialized = false;

    private async initTransporter(): Promise<void> {
        if (this.initialized) return;

        const host = process.env.SMTP_HOST || "smtp.ethereal.email";
        const port = Number(process.env.SMTP_PORT) || 587;
        let user = process.env.SMTP_USER;
        let pass = process.env.SMTP_PASS;

        // If credentials are not provided, dynamically generate an Ethereal SMTP account
        if (!user || !pass) {
            console.log("[EmailService] No SMTP credentials provided. Generating a test account on Ethereal Email...");
            try {
                const testAccount = await nodemailer.createTestAccount();
                user = testAccount.user;
                pass = testAccount.pass;
                console.log(`[EmailService] Generated test credentials: User="${user}", Pass="${pass}"`);
                console.log("[EmailService] You can preview sent emails at https://ethereal.email");
            } catch (err) {
                console.error("[EmailService] Failed to generate test account, using basic sandbox settings:", err);
            }
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass,
            },
        });

        this.initialized = true;
    }

    async sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
        await this.initTransporter();

        const from = process.env.FROM_EMAIL || "noreply@workspace.local";

        const info = await this.transporter.sendMail({
            from: `"Workspace App" <${from}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });

        console.log(`[EmailService] Email sent to ${options.to}. MessageID: ${info.messageId}`);
        
        // Ethereal helper: get test email URL
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`[EmailService] Preview URL: ${previewUrl}`);
        }
    }
}

export const emailService = new EmailService();
