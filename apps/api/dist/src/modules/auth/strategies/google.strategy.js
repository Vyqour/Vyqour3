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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_google_oauth20_1 = require("passport-google-oauth20");
let GoogleStrategy = class GoogleStrategy extends (0, passport_1.PassportStrategy)(passport_google_oauth20_1.Strategy, 'google') {
    constructor(config) {
        const clientID = config.get('google.clientId') || 'unused';
        const clientSecret = config.get('google.clientSecret') || 'unused';
        super({
            clientID,
            clientSecret,
            callbackURL: config.get('google.callbackUrl') ||
                'http://localhost:4000/api/v1/auth/google/callback',
            scope: ['email', 'profile'],
        });
    }
    validate(_accessToken, _refreshToken, profile, done) {
        const email = profile.emails?.[0]?.value;
        const user = {
            googleId: profile.id,
            email,
            firstName: profile.name?.givenName || profile.displayName || 'User',
            lastName: profile.name?.familyName,
            avatarUrl: profile.photos?.[0]?.value,
            emailVerified: true,
        };
        done(null, user);
    }
};
exports.GoogleStrategy = GoogleStrategy;
exports.GoogleStrategy = GoogleStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleStrategy);
//# sourceMappingURL=google.strategy.js.map