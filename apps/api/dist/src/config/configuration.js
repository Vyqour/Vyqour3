"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    appUrl: process.env.APP_URL || 'http://localhost:4000',
    webUrl: process.env.WEB_URL || 'http://localhost:3000',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
        refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || 'VYQOUR <noreply@vyqour.com>',
    },
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET,
    },
    admin: {
        email: process.env.ADMIN_EMAIL || 'admin@vyqour.com',
        password: process.env.ADMIN_PASSWORD || 'VyqourAdmin@2026',
    },
    qikink: {
        enabled: (process.env.QIKINK_ENABLED || 'false').toLowerCase() === 'true',
        sandbox: (process.env.QIKINK_SANDBOX || 'true').toLowerCase() === 'true',
        clientId: process.env.QIKINK_CLIENT_ID || '',
        clientSecret: process.env.QIKINK_CLIENT_SECRET || '',
        sandboxSecret: process.env.QIKINK_SANDBOX_SECRET || process.env.QIKINK_CLIENT_SECRET || '',
        baseUrl: process.env.QIKINK_BASE_URL ||
            ((process.env.QIKINK_SANDBOX || 'true').toLowerCase() === 'true'
                ? 'https://sandbox.qikink.com'
                : 'https://api.qikink.com'),
        shipping: process.env.QIKINK_SHIPPING || '1',
        webhookSecret: process.env.QIKINK_WEBHOOK_SECRET || '',
        autoSubmit: (process.env.QIKINK_AUTO_SUBMIT || 'true').toLowerCase() === 'true',
        maxAttempts: parseInt(process.env.QIKINK_MAX_ATTEMPTS || '8', 10),
        workerIntervalMs: parseInt(process.env.QIKINK_WORKER_INTERVAL_MS || '15000', 10),
        statusPollEnabled: (process.env.QIKINK_STATUS_POLL_ENABLED || 'true').toLowerCase() === 'true',
        statusEndpoint: process.env.QIKINK_STATUS_ENDPOINT || '/api/order/status',
        productsEndpoint: process.env.QIKINK_PRODUCTS_ENDPOINT || '/api/products',
    },
});
//# sourceMappingURL=configuration.js.map