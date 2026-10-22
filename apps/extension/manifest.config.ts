import { defineManifest } from '@crxjs/vite-plugin';

const atsMatches = [
  'https://boards.greenhouse.io/*',
  'https://job-boards.greenhouse.io/*',
  'https://jobs.lever.co/*',
  'https://*.workable.com/*',
  'https://apply.workable.com/*',
  'https://jobs.ashbyhq.com/*',
  'https://*.ashbyhq.com/*',
  'https://*.applytojob.com/*',
  'https://*.paylocity.com/*',
  'https://recruiting.paylocity.com/*',
];

export default defineManifest({
  manifest_version: 3,
  name: 'Resume Builder Apply',
  version: '1.1.0',
  description:
    'Fill ATS job applications from your Resume Builder profile and tailored resume. Stops before submit.',
  commands: {
    'capture-job': {
      suggested_key: { default: 'Alt+Shift+1' },
      description: 'Capture job title, company, and description',
    },
    'capture-questions': {
      suggested_key: { default: 'Alt+Shift+2' },
      description: 'Capture application questions and generate answers',
    },
    'fill-application': {
      suggested_key: { default: 'Alt+Shift+3' },
      description: 'Fill the application with captured data (does not submit)',
    },
  },
  action: {
    default_title: 'Resume Builder Apply',
    default_popup: 'index.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: [
    'storage',
    'activeTab',
    'scripting',
    'tabs',
    'webNavigation',
  ],
  host_permissions: [
    'http://localhost/*',
    'http://127.0.0.1/*',
    'http://*/*',
    ...atsMatches,
  ],
  optional_host_permissions: ['http://*/*', 'https://*/*'],
  content_scripts: [
    {
      matches: atsMatches,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: true,
    },
  ],
});
