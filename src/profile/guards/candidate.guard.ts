// src/shared/guards/candidate.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class CandidateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== Role.CANDIDATE) {
      throw new ForbiddenException('Access restricted to candidates only');
    }

    return true;
  }
}
