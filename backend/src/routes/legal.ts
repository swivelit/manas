import { Router, Request, Response } from 'express';

import { privacyPolicy } from '../legal/privacyPolicy';
import { termsOfService } from '../legal/termsOfService';

type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDocument = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const router = Router();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLegalPage(document: LegalDocument): string {
  const sections = document.sections.map(section => {
    const paragraphs = section.paragraphs?.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n') ?? '';
    const bullets = section.bullets && section.bullets.length > 0
      ? `<ul>\n${section.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join('\n')}\n</ul>`
      : '';

    return `<section>
  <h2>${escapeHtml(section.heading)}</h2>
  ${paragraphs}
  ${bullets}
</section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(document.title)}</title>
  <style>
    :root {
      color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      color: #1f2933;
      background: #fafafa;
    }
    body {
      margin: 0;
      padding: 32px 18px;
    }
    main {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 28px;
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 2rem;
      line-height: 1.2;
      color: #111827;
    }
    h2 {
      margin-top: 28px;
      font-size: 1.2rem;
      line-height: 1.3;
      color: #111827;
    }
    p, li {
      font-size: 1rem;
    }
    .updated {
      color: #52606d;
      margin: 0 0 24px;
    }
    ul {
      padding-left: 1.35rem;
    }
    @media (max-width: 640px) {
      body {
        padding: 16px 10px;
      }
      main {
        padding: 20px;
      }
      h1 {
        font-size: 1.65rem;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(document.title)}</h1>
    <p class="updated">Last updated: ${escapeHtml(document.lastUpdated)}</p>
    ${sections}
  </main>
</body>
</html>`;
}

function sendLegalPage(res: Response, document: LegalDocument) {
  res
    .status(200)
    .type('html')
    .send(renderLegalPage(document));
}

router.get('/privacy-policy', (_req: Request, res: Response) => {
  sendLegalPage(res, privacyPolicy);
});

router.get('/terms', (_req: Request, res: Response) => {
  sendLegalPage(res, termsOfService);
});

export default router;
