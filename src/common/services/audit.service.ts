// src/common/services/audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

interface AuditLogData {
  userId: number;
  action: string;
  resource: string;
  resourceId?: number;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private prisma = new PrismaClient();

  async log(data: AuditLogData) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async getAuditTrail(resource: string, resourceId: number) {
    return this.prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }
}
