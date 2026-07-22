import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CheckinGateway } from './checkin.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [CheckinGateway],
  exports: [CheckinGateway],
})
export class RealtimeModule {}
