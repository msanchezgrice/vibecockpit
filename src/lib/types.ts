// Types and enums for the application
import { Prisma } from '@/generated/prisma';

// Re-export types from Prisma for easier access
export type Project = Prisma.ProjectGetPayload<{
  include: {
    checklistItems: true;
  }
}>;

export type ChecklistItem = Prisma.ChecklistItemGetPayload<{}>;

// Enum for coding platforms
export enum CodingPlatform {
  CURSOR = 'CURSOR',
  WINDSURF = 'WINDSURF',
  REPLIT = 'REPLIT',
  MANUS = 'MANUS',
  OPENAI_CANVAS = 'OPENAI_CANVAS',
  ANTHROPIC_CONSOLE = 'ANTHROPIC_CONSOLE',
  OTHER = 'OTHER'
}

// Project status
export enum ProjectStatus {
  DESIGN = 'design',
  PREP_LAUNCH = 'prep_launch',
  LAUNCHED = 'launched',
  PAUSED = 'paused',
  RETIRED = 'retired'
} 