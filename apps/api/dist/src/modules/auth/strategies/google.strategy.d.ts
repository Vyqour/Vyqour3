import { ConfigService } from '@nestjs/config';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
declare const GoogleStrategy_base: new (...args: any[]) => Strategy;
export declare class GoogleStrategy extends GoogleStrategy_base {
    constructor(config: ConfigService);
    validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): void;
}
export {};
