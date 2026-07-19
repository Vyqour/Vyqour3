import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>('google.clientId') || 'unused';
    const clientSecret = config.get<string>('google.clientSecret') || 'unused';
    super({
      clientID,
      clientSecret,
      callbackURL:
        config.get<string>('google.callbackUrl') ||
        'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
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
}
