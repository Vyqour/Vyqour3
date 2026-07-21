"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_METHODS = exports.CORS_ALLOWED_HEADERS = void 0;
exports.parseCorsOrigins = parseCorsOrigins;
exports.isDynamicDevOrigin = isDynamicDevOrigin;
exports.isOriginAllowed = isOriginAllowed;
exports.createCorsOriginDelegate = createCorsOriginDelegate;
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;
const CODESPACES_ORIGIN = /^https:\/\/([a-z0-9-]+)-\d+\.app\.github\.dev$/i;
const GITHUB_PREVIEW_ORIGIN = /^https:\/\/([a-z0-9-]+)-\d+\.(?:preview\.)?app\.github\.dev$/i;
function trimOrigin(value) {
    return value.trim().replace(/\/+$/, '');
}
function parseCorsOrigins(raw) {
    if (Array.isArray(raw)) {
        return raw.map(trimOrigin).filter(Boolean);
    }
    if (!raw || typeof raw !== 'string')
        return [];
    return raw
        .split(',')
        .map(trimOrigin)
        .filter(Boolean);
}
function isDynamicDevOrigin(origin) {
    if (!origin)
        return false;
    if (LOCALHOST_ORIGIN.test(origin))
        return true;
    if (CODESPACES_ORIGIN.test(origin))
        return true;
    if (GITHUB_PREVIEW_ORIGIN.test(origin))
        return true;
    return false;
}
function isOriginAllowed(origin, allowedList, opts) {
    if (!origin)
        return true;
    const normalized = trimOrigin(origin);
    const list = allowedList.map(trimOrigin).filter(Boolean);
    if (list.includes('*')) {
        const env = opts?.nodeEnv || process.env.NODE_ENV || 'development';
        if (env !== 'production' || opts?.allowAnyInDev)
            return true;
    }
    if (list.some((o) => o.toLowerCase() === normalized.toLowerCase())) {
        return true;
    }
    if (isDynamicDevOrigin(normalized)) {
        return true;
    }
    return false;
}
function createCorsOriginDelegate(allowedList) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    return (origin, callback) => {
        try {
            if (isOriginAllowed(origin, allowedList, { nodeEnv })) {
                if (!origin)
                    return callback(null, true);
                return callback(null, origin);
            }
            return callback(null, false);
        }
        catch (err) {
            return callback(err, false);
        }
    };
}
exports.CORS_ALLOWED_HEADERS = [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'x-session-id',
    'X-Session-Id',
    'x-razorpay-signature',
    'x-qikink-signature',
    'x-signature',
    'Cookie',
];
exports.CORS_METHODS = [
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
];
//# sourceMappingURL=cors.util.js.map