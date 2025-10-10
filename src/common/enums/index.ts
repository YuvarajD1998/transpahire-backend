// src/common/enums/index.ts
import { Role, SubscriptionTier, ParseStatus, ProficiencyLevel, SkillSource, PrivacyMode } from '@prisma/client';

export { Role, SubscriptionTier, ParseStatus, ProficiencyLevel, SkillSource, PrivacyMode };

export enum FileType {
  PROFILE_PHOTO = 'profiles',
  RESUME = 'resumes',
}
