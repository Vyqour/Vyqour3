"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.generateOrderNumber = generateOrderNumber;
exports.generateTicketNumber = generateTicketNumber;
exports.formatInr = formatInr;
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
function generateOrderNumber() {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VYQ${y}${m}${d}${rand}`;
}
function generateTicketNumber() {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TKT-${rand}`;
}
function formatInr(amount) {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(n);
}
//# sourceMappingURL=slug.util.js.map