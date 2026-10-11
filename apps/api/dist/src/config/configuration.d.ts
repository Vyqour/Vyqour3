declare const _default: () => {
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    appUrl: string;
    webUrl: string;
    corsOrigins: string[];
    databaseUrl: string | undefined;
    redisUrl: string;
    jwt: {
        accessSecret: string | undefined;
        refreshSecret: string | undefined;
        accessExpires: string;
        refreshExpires: string;
    };
    google: {
        clientId: string | undefined;
        clientSecret: string | undefined;
        callbackUrl: string | undefined;
    };
    cloudinary: {
        cloudName: string | undefined;
        apiKey: string | undefined;
        apiSecret: string | undefined;
    };
    smtp: {
        host: string | undefined;
        port: number;
        user: string | undefined;
        pass: string | undefined;
        from: string;
    };
    razorpay: {
        keyId: string | undefined;
        keySecret: string | undefined;
        webhookSecret: string | undefined;
    };
    admin: {
        email: string;
        password: string;
    };
    qikink: {
        enabled: boolean;
        sandbox: boolean;
        clientId: string;
        clientSecret: string;
        sandboxSecret: string;
        baseUrl: string;
        shipping: string;
        webhookSecret: string;
        autoSubmit: boolean;
        maxAttempts: number;
        workerIntervalMs: number;
        statusPollEnabled: boolean;
        statusEndpoint: string;
        productsEndpoint: string;
    };
};
export default _default;
