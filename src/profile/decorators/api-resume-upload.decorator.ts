// src/modules/profile/decorators/api-resume-upload.decorator.ts
import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';

export function ApiResumeUpload() {
  return applyDecorators(
    UseInterceptors(FileInterceptor('file')),
    ApiConsumes('multipart/form-data'),
    ApiOperation({ summary: 'Upload new resume' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Resume file (PDF, DOC, DOCX)',
          },
          isPrimary: {
            type: 'boolean',
            description: 'Set as primary resume',
            default: false,
          },
          enhanceImages: {
            type: 'boolean', 
            description: 'Enable image enhancement during parsing',
            default: false,
          },
        },
        required: ['file'],
      },
    }),
  );
}
