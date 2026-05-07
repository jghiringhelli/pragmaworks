export type Role = 'developer' | 'tech-lead' | 'reviewer' | 'onboarding';

export interface ForgeCraftData {
  available: boolean;
  score?: number;
  maxScore?: number;
  failingGates?: string[];
  specGaps?: string[];
  error?: string;
}

export interface ModuleInfo {
  path: string;
  symbols: string[];
  dependsOn: string[];
  dependedOnBy: string[];
}

export interface CodeSeekerData {
  available: boolean;
  modules?: ModuleInfo[];
  rawSnippets?: string[];
  error?: string;
}

export interface ArchitecturalDecision {
  id?: string;
  content: string;
  memoryType?: string;
  tags?: string[];
}

export interface ChronicleData {
  available: boolean;
  decisions?: ArchitecturalDecision[];
  error?: string;
}

export interface AssembledContext {
  projectName: string;
  generatedAt: string;
  role: Role;
  focusArea: string;
  firstTask: string;
  forgecraft: ForgeCraftData;
  codeseeker: CodeSeekerData;
  chronicle: ChronicleData;
}
