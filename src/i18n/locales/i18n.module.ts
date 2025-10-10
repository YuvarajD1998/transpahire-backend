import { Module } from '@nestjs/common';
import { I18nModule as NestI18nModule, I18nJsonLoader } from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, 'locales'),
        watch: true,
      },
      loader: I18nJsonLoader,
    }),
  ],
})
export class I18nModule {}
