import fs from 'node:fs';

const path = 'apps/backend/src/resumes/resumes.service.ts';
const lines = fs.readFileSync(path, 'utf8').split('\n');

function findLineIndex(predicate, start = 0) {
  for (let i = start; i < lines.length; i++) {
    if (predicate(lines[i], i)) return i;
  }
  return -1;
}

const generateStart = findLineIndex((l) => l.includes('async generateResume('));
const parseQuestionsStart = findLineIndex((l) =>
  l.includes('async parseAndAnswerQuestions('),
);
const stripDatesStart = findLineIndex((l) =>
  l.includes('private stripDatesFromCoverLetterHeader'),
);
const generateCoverLetterPdfStart = findLineIndex((l) =>
  l.includes('private async generateCoverLetterPDF('),
);
const generateCoverLetterPdfEnd = findLineIndex(
  (l) => l.trim() === '}' && l.startsWith('  }'),
  generateCoverLetterPdfStart + 5,
);
// find closing brace of generateCoverLetterPDF - scan for "  }" after doc.end
let coverPdfEnd = generateCoverLetterPdfStart;
let depth = 0;
for (let i = generateCoverLetterPdfStart; i < lines.length; i++) {
  if (lines[i].includes('{')) depth += (lines[i].match(/\{/g) || []).length;
  if (lines[i].includes('}')) depth -= (lines[i].match(/\}/g) || []).length;
  if (i > generateCoverLetterPdfStart && depth <= 0 && lines[i].trim() === '}') {
    coverPdfEnd = i;
    break;
  }
}

const normalizeCoverStart = findLineIndex((l) =>
  l.includes('private normalizeCoverLetterText('),
);
const normalizeCoverEnd = findLineIndex(
  (l, i) => i > normalizeCoverStart && l.trim() === '}' && l.startsWith('  }'),
  normalizeCoverStart + 1,
);

const kept = [
  ...lines.slice(0, generateStart - 3), // before doc comment of generateResume
  ...lines.slice(parseQuestionsStart, stripDatesStart),
  ...lines.slice(coverPdfEnd + 1, normalizeCoverStart),
  ...lines.slice(normalizeCoverEnd + 1),
];

let src = kept.join('\n');

// Apply text replacements
src = src.replace("import * as PDFKit from 'pdfkit';\n\n", '');
src = src.replace(
  `import { getResumePdfSettings } from '../ai/resume-settings';
import { formatAiProviderError } from '../ai/format-ai-error';

const VALID_TEMPLATES = [
  'template1',
  'template2',
  'template3',
  'template4',
  'template5',
  'template6',
  'template7',
] as const;`,
  `import {
  DEFAULT_RESUME_PDF_SETTINGS,
  getResumePdfSettings,
  type ResumePdfSettings,
} from '../ai/resume-settings';
import { formatAiProviderError } from '../ai/format-ai-error';
import { CoverLetterPdfService } from './cover-letter-pdf.service';
import { ResumeGenerationService } from './resume-generation.service';
import { isValidTemplate, MISSING_OPENROUTER_KEY_MESSAGE } from '@resume-builder/shared';`,
);
src = src.replace(
  `  DEFAULT_RESUME_PDF_SETTINGS,
  type ResumePdfSettings,
} from './templates';`,
  `} from './templates';`,
);
src = src.replace(
  'private readonly gateway: ResumesGateway\n  ) {}',
  `private readonly gateway: ResumesGateway,
    private readonly coverLetterPdfService: CoverLetterPdfService,
    private readonly resumeGenerationService: ResumeGenerationService,
  ) {}`,
);
src = src.replace(
  "'No OpenRouter API key configured. Add your OpenRouter API key in Profile settings.'",
  'MISSING_OPENROUTER_KEY_MESSAGE',
);
src = src.replace(
  'this.generateResume(',
  'this.resumeGenerationService.generateResume(',
);
src = src.replace(
  '!VALID_TEMPLATES.includes(template as (typeof VALID_TEMPLATES)[number])',
  '!isValidTemplate(template)',
);
src = src.replace(
  /this\.normalizeCoverLetterText\(/g,
  'this.coverLetterPdfService.normalizeCoverLetterText(',
);
src = src.replace(
  /await this\.generateCoverLetterPDF\(/g,
  'await this.coverLetterPdfService.generatePdf(',
);

fs.writeFileSync(path, src);
console.log('lines:', src.split('\n').length);
