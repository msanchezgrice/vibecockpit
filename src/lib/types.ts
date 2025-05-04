import { Project, CostSnapshot, AnalyticsSnapshot, ChangeLogEntry, ProjectStatus } from '@/generated/prisma';

// Project with relations type
export type ProjectWithRelations = Project & {
  costSnapshots: CostSnapshot[]; 
  analyticsSnapshots: AnalyticsSnapshot[]; 
  changelog: ChangeLogEntry[];
};

// Project creation payload
export interface CreateProjectPayload extends Record<string, unknown> {
  name: string;
  description?: string;
  url?: string;
  repoUrl?: string;
  status: ProjectStatus;
}

// API response for project creation
export interface CreateProjectResponse {
  projectId: string;
  status: ProjectStatus;
  thumbUrl: string;
}

export { ProjectStatus }; 