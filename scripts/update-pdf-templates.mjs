import fs from 'node:fs';
import path from 'node:path';

const dir = 'apps/backend/src/resumes/templates';
for (let i = 1; i <= 7; i++) {
  const file = path.join(dir, `template_${i}.ts`);
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes("from './base-pdf-template'")) {
    src = src.replace(
      "import { ResumeData, DEFAULT_RESUME_PDF_SETTINGS, filterSkillsForPdf, getCertificationText, type ResumePdfSettings } from '.';",
      "import { ResumeData, DEFAULT_RESUME_PDF_SETTINGS, filterSkillsForPdf, getCertificationText, type ResumePdfSettings } from '.';\nimport { normalizeResumeData } from './base-pdf-template';",
    );
  }
  src = src.replace(
    'this.data = this._normalizeData(data);',
    'this.data = normalizeResumeData(data);',
  );
  src = src.replace(
    /\n  private _normalizeData\(data: ResumeData\): ResumeData \{[\s\S]*?\n  \}\n/,
    '\n',
  );
  fs.writeFileSync(file, src);
  console.log('updated', file);
}
