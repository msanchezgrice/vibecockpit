/* Run with:  pnpm exec ts-node scripts/capture-screenshots.ts         */
/* Assumes `pnpm dev` is already running on http://localhost:3000      */
/* Make sure you're signed in and have dummy projects/tasks populated. */

import { chromium } from 'playwright';
import type { Page } from 'playwright';

const shots: {
  url: string;
  file: string;
  opts?: Parameters<Page['screenshot']>[0];
}[] = [
  { url: '/',                           file: 'dashboard-desktop.png'  },
  { url: '/dashboard?mobile=true',      file: 'dashboard-mobile.png',  opts:{fullPage:false} },
  { url: '/ask-ai-demo',                file: 'ai-chat.png'            },
  { url: '/tasks?demo',                 file: 'task-recommendations.png'},
  { url: '/launch-checklist?demo',      file: 'launch-checklist.png'   },
  { url: '/settings/integrations?demo', file: 'integrations.png'       },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  for (const { url, file, opts } of shots) {
    console.log('▶️  capturing', url);
    await page.goto(`http://localhost:3000${url}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `public/screenshots/${file}`, type: 'png', ...opts });
  }

  await browser.close();
  console.log('✅ screenshots saved to public/screenshots/');
})(); 