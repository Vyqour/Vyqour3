import { Module, forwardRef } from '@nestjs/common';
import { QikinkApiClient } from './client/qikink-api.client';
import { QikinkJobQueue } from './queue/qikink-job.queue';
import { QikinkService } from './qikink.service';
import { QikinkWorker } from './qikink.worker';
import { QikinkController } from './qikink.controller';

@Module({
  controllers: [QikinkController],
  providers: [QikinkApiClient, QikinkJobQueue, QikinkService, QikinkWorker],
  exports: [QikinkService, QikinkJobQueue, QikinkApiClient],
})
export class QikinkModule {}
