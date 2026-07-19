import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing?.isActive) throw new ConflictException('Already subscribed');
    if (existing) {
      return this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { isActive: true, unsubscribedAt: null, subscribedAt: new Date() },
      });
    }
    return this.prisma.newsletterSubscriber.create({
      data: { email: email.toLowerCase() },
    });
  }

  async unsubscribe(email: string) {
    await this.prisma.newsletterSubscriber.updateMany({
      where: { email: email.toLowerCase() },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
    return { message: 'Unsubscribed' };
  }

  list() {
    return this.prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      orderBy: { subscribedAt: 'desc' },
    });
  }
}
