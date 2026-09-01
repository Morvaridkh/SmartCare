import dotenv from 'dotenv';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      //removes properties that are not in the DTO
      whitelist: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
