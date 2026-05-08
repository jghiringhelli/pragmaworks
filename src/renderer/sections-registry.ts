/**
 * Section renderer registry — single source of truth for the eight-section
 * order defined in spec.md §5. The HTML composer (`html.ts`) iterates this
 * list to render the body. Add or reorder sections here, not in the composer.
 */

import type { AuditResult } from '../types.js';
import { renderSection as cover } from './sections/01-cover.js';
import { renderSection as disciplines } from './sections/02-structural-disciplines.js';
import { renderSection as documentation } from './sections/03-documentation-health.js';
import { renderSection as tests } from './sections/04-test-pyramid.js';
import { renderSection as rubric } from './sections/05-rubric.js';
import { renderSection as security } from './sections/06-security-logging.js';
import { renderSection as teamHabits } from './sections/07-team-habits.js';
import { renderSection as remediation } from './sections/08-roadmap-remediation.js';

export interface SectionRendererEntry {
  id: string;
  title: string;
  render: (audit: AuditResult) => string;
}

export const SECTION_RENDERERS: SectionRendererEntry[] = [
  { id: '01-cover', title: 'Cover summary', render: cover },
  { id: '02-structural-disciplines', title: 'Structural disciplines', render: disciplines },
  { id: '03-documentation-health', title: 'Documentation health', render: documentation },
  { id: '04-test-pyramid', title: 'Test pyramid coverage', render: tests },
  { id: '05-rubric', title: 'Seven GS rubric scores', render: rubric },
  { id: '06-security-logging', title: 'Security and logging', render: security },
  { id: '07-team-habits', title: 'Team-habit analysis', render: teamHabits },
  { id: '08-roadmap-remediation', title: 'Roadmap to remediation', render: remediation },
];
