// src/modules/profile/services/file-upload.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { FileType } from '../../common/enums';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadPath: string;
  private readonly maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private readonly allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly allowedResumeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(private readonly configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
    this.ensureUploadDirectories();
  }

  private async ensureUploadDirectories() {
    try {
      await fs.mkdir(path.join(this.uploadPath, FileType.PROFILE_PHOTO), { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, FileType.RESUME), { recursive: true });
      this.logger.log('Upload directories created successfully');
    } catch (error) {
      this.logger.error('Failed to create upload directories', error);
    }
  }

  /**
   * Save file with UUID-based naming (matching FastAPI pattern)
   */
  async saveFile(content: Buffer, filename: string, contentType: string, fileType: FileType): Promise<string> {
    const fileId = uuidv4();
    const fileExtension = this.getFileExtension(filename);
    const newFilename = `${fileId}${fileExtension}`;
    
    const filePath = path.join(this.uploadPath, fileType, newFilename);
    
    await fs.writeFile(filePath, content);
    
    this.logger.log(`File saved: ${newFilename} in ${fileType}`);
    return newFilename;
  }

  async uploadProfilePhoto(file: Express.Multer.File, userId: number): Promise<string> {
    this.validateImageFile(file);

    try {
      // Process and optimize image using Sharp
      const processedImageBuffer = await sharp(file.buffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ 
          quality: 85,
          progressive: true
        })
        .toBuffer();

      const savedFileName = await this.saveFile(
        processedImageBuffer, 
        file.originalname, 
        file.mimetype, 
        FileType.PROFILE_PHOTO
      );
      
      this.logger.log(`Profile photo uploaded successfully for user ${userId}: ${savedFileName}`);
      return savedFileName;
    } catch (error) {
      this.logger.error(`Failed to upload profile photo: ${error.message}`, error);
      throw new BadRequestException('Failed to process and save profile photo');
    }
  }

  async uploadResume(file: Express.Multer.File, userId: number): Promise<{ filePath: string; fileName: string }> {
    this.validateResumeFile(file);

    try {
      const savedFileName = await this.saveFile(
        file.buffer, 
        file.originalname, 
        file.mimetype, 
        FileType.RESUME
      );
      
      this.logger.log(`Resume uploaded successfully for user ${userId}: ${savedFileName}`);
      return {
        filePath: savedFileName,
        fileName: savedFileName
      };
    } catch (error) {
      this.logger.error(`Failed to upload resume: ${error.message}`, error);
      throw new BadRequestException('Failed to save resume file');
    }
  }

  async deleteFile(fileName: string, fileType: FileType): Promise<void> {
    const filePath = path.join(this.uploadPath, fileType, fileName);
    
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully: ${fileName} from ${fileType}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Failed to delete file: ${error.message}`, error);
        throw new BadRequestException('Failed to delete file');
      }
    }
  }

  async getFileUrl(fileName: string, fileType: FileType): Promise<string> {
    const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    return `${baseUrl}/uploads/${fileType}/${fileName}`;
  }

  async readFile(fileName: string, fileType: FileType): Promise<Buffer> {
    const filePath = path.join(this.uploadPath, fileType, fileName);
    
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`Failed to read file: ${error.message}`, error);
      throw new BadRequestException('File not found');
    }
  }

  private getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
    }
  }

  private validateResumeFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    if (!this.allowedResumeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF and Word documents are allowed');
    }
  }
}
