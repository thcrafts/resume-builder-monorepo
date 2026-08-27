import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync('apps/backend/src/resumes/resumes.service.ts', 'utf8');
const industries = [
  'ai',
  'cybersecurity',
  'ecommerce',
  'fintech',
  'food',
  'insurance',
  'marketing',
  'realestate',
  'gaming',
  'telecom',
  'healthcare',
];
const outDir = 'apps/backend/assets/prompts/industries';
fs.mkdirSync(outDir, { recursive: true });

for (let i = 0; i < industries.length; i++) {
  const ind = industries[i];
  const marker = `else if (industry == '${ind}')`;
  const start = src.indexOf(marker);
  if (start === -1) {
    console.error('missing', ind);
    continue;
  }

  const instrStart = src.indexOf('instructions = `', start) + 'instructions = `'.length;
  const nextIndustry = industries[i + 1];
  const endMarker = nextIndustry
    ? `\n    } else if (industry == '${nextIndustry}')`
    : '\n    // Call OpenRouter to generate the resume JSON';
  const blockEnd = src.indexOf(endMarker, instrStart);
  if (blockEnd === -1) {
    console.error('no end for', ind);
    continue;
  }

  const instrEnd = src.lastIndexOf('`', blockEnd);
  const content = src.slice(instrStart, instrEnd).trim();
  fs.writeFileSync(path.join(outDir, `${ind}.md`), `${content}\n`);
  console.log('wrote', ind, content.length);
}
