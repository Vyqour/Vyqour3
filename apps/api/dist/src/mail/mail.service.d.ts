import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private readonly logger;
    private transporter;
    private from;
    constructor(config: ConfigService);
    private send;
    sendVerificationEmail(email: string, token: string): Promise<void>;
    sendPasswordResetEmail(email: string, token: string): Promise<void>;
    sendOrderConfirmation(email: string, orderNumber: string, total: string): Promise<void>;
    sendShippingNotification(email: string, orderNumber: string, trackingNumber?: string, carrier?: string): Promise<void>;
}
