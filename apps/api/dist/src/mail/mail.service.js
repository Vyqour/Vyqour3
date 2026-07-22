"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let MailService = MailService_1 = class MailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MailService_1.name);
        this.transporter = null;
        this.from = this.config.get('smtp.from') || 'VYQOUR <noreply@vyqour.com>';
        const host = this.config.get('smtp.host');
        const user = this.config.get('smtp.user');
        const pass = this.config.get('smtp.pass');
        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port: this.config.get('smtp.port') || 587,
                secure: false,
                auth: { user, pass },
            });
        }
        else {
            this.logger.warn('SMTP not configured — emails will be logged only');
        }
    }
    async send(to, subject, html) {
        if (!this.transporter) {
            this.logger.log(`[email:dev] to=${to} subject=${subject}`);
            return;
        }
        try {
            await this.transporter.sendMail({ from: this.from, to, subject, html });
        }
        catch (err) {
            this.logger.error(`Failed to send email to=${to} subject=${subject}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async sendVerificationEmail(email, token) {
        const webUrl = this.config.get('webUrl');
        const link = `${webUrl}/verify-email?token=${token}`;
        await this.send(email, 'Verify your VYQOUR account', `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">VYQOUR</h1>
        <p>Welcome. Verify your email to start wearing your identity.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;background:#5B21B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Verify Email</a>
        <p style="margin-top:24px;color:#888;font-size:12px">Or open: ${link}</p>
      </div>`);
    }
    async sendPasswordResetEmail(email, token) {
        const webUrl = this.config.get('webUrl');
        const link = `${webUrl}/reset-password?token=${token}`;
        await this.send(email, 'Reset your VYQOUR password', `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">VYQOUR</h1>
        <p>We received a password reset request. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;background:#5B21B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Reset Password</a>
        <p style="margin-top:24px;color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>`);
    }
    async sendOrderConfirmation(email, orderNumber, total) {
        const webUrl = this.config.get('webUrl');
        await this.send(email, `Order confirmed · ${orderNumber}`, `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">VYQOUR</h1>
        <p>Thanks for your order <strong>${orderNumber}</strong>.</p>
        <p>Total: <strong>₹${total}</strong></p>
        <a href="${webUrl}/track-order?order=${orderNumber}" style="display:inline-block;margin-top:16px;background:#5B21B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Track Order</a>
      </div>`);
    }
    async sendShippingNotification(email, orderNumber, trackingNumber, carrier) {
        const webUrl = this.config.get('webUrl');
        const track = trackingNumber
            ? `<p>Tracking: <strong>${trackingNumber}</strong>${carrier ? ` · ${carrier}` : ''}</p>`
            : '';
        await this.send(email, `Your VYQOUR order shipped · ${orderNumber}`, `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">VYQOUR</h1>
        <p>Good news — order <strong>${orderNumber}</strong> is on the way.</p>
        ${track}
        <a href="${webUrl}/track-order?order=${orderNumber}" style="display:inline-block;margin-top:16px;background:#5B21B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Track shipment</a>
      </div>`);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map