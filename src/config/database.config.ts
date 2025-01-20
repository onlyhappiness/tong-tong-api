import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';

export const MongoDBConfig: MongooseModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    uri: configService.get('MONGODB_URI'),
  }),
};
