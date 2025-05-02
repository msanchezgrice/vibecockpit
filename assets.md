1 Install Playwright (once)
pnpm add -D playwright @types/node ts-node
npx playwright install chromium
2 Create the capture script
scripts/capture-screenshots.ts
/* Run with:  pnpm exec ts-node scripts/capture-screenshots.ts         */
/* Assumes `pnpm dev` is already running on http://localhost:3000      */
/* Make sure you’re signed in and have dummy projects/tasks populated. */

import { chromium, FullPageScreenshotOptions } from 'playwright';

const shots: {
  url: string;
  file: string;
  opts?: FullPageScreenshotOptions;
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
  const page     = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  for (const { url, file, opts } of shots) {
    console.log('▶️  capturing', url);
    await page.goto(`http://localhost:3000${url}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `public/screenshots/${file}`, type: 'png', ...opts });
  }

  await browser.close();
  console.log('✅ screenshots saved to public/screenshots/');
})();
3 Add npm script
package.json
{
  "scripts": {
    "capture:screens": "pnpm dev & wait-on http://localhost:3000 && ts-node scripts/capture-screenshots.ts"
  }
}

4 Run it
pnpm run capture:screens
# → six PNGs are created / overwritten in public/screenshots/
#    - dashboard-desktop.png
#    - dashboard-mobile.png
#    - ai-chat.png
#    - task-recommendations.png
#    - launch-checklist.png
#    - integrations.png

5 Verify locally
pnpm build && pnpm start
open http://localhost:3000
# check Features grid, Screenshots carousel, Hero image, etc.
6 Commit & deploy
git add public/screenshots/ scripts/capture-screenshots.ts package.json pnpm-lock.yaml
git commit -m "chore: add real marketing screenshots"
git push
Vercel will redeploy; the broken icons will be replaced with full-fidelity images.
Notes / Tips
If a page requires auth, log in once before running the script (session cookie will persist during the run).
Feel free to tweak URLs or viewports—just keep file names unchanged so components resolve correctly.
Images are ~250–450 KB each; total footprint <3 MB, well within Vercel’s static asset limits.
Once this checklist is executed, all marketing pages at vibecockpit.vercel.app will display the real screenshots instead of “missing image” placeholders.