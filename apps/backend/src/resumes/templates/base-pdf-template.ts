import { existsSync } from 'fs';
import { join } from 'path';
import type { ResumeData } from '.';

import type PDFKit from 'pdfkit';

export interface PdfFontConfig {
  fontsDir: string;
  familyName: string;
  regularVariants: string[];
  boldVariants: string[];
  italicVariants: string[];
  boldItalicVariants: string[];
  fallbackFamily?: {
    regular: string;
    bold: string;
    italic: string;
    boldItalic: string;
  };
}

export interface PdfFontState {
  fontName: string;
  fontBold: string;
  fontItalic: string;
  fontBoldItalic: string;
  fontPath: string | null;
  fontBoldPath: string | null;
  fontItalicPath: string | null;
  fontBoldItalicPath: string | null;
}

export function createInitialFontState(
  config: PdfFontConfig,
): PdfFontState {
  const fallback = config.fallbackFamily ?? {
    regular: config.familyName,
    bold: `${config.familyName}-Bold`,
    italic: `${config.familyName}-Italic`,
    boldItalic: `${config.familyName}-BoldItalic`,
  };

  return {
    fontName: fallback.regular,
    fontBold: fallback.bold,
    fontItalic: fallback.italic,
    fontBoldItalic: fallback.boldItalic,
    fontPath: null,
    fontBoldPath: null,
    fontItalicPath: null,
    fontBoldItalicPath: null,
  };
}

export function normalizeResumeData(data: ResumeData): ResumeData {
  const coerceBullet = (value: unknown): string => {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      for (const key of [
        'text',
        'bullet',
        'achievement',
        'description',
        'content',
        'value',
        'item',
        'summary',
        'name',
        'skill',
        'label',
      ]) {
        const candidate = record[key];
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
      for (const candidate of Object.values(record)) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  };

  return {
    name: data.name || '',
    title: data.title || '',
    contact: data.contact || {},
    summary: data.summary || '',
    skills: data.skills,
    experience: (data.experience || []).map((entry) => ({
      ...entry,
      responsibilities: Array.isArray(entry.responsibilities)
        ? entry.responsibilities.map(coerceBullet).filter(Boolean)
        : [],
      achievements: Array.isArray(entry.achievements)
        ? entry.achievements.map(coerceBullet).filter(Boolean)
        : [],
      skills: Array.isArray(entry.skills)
        ? entry.skills.map(coerceBullet).filter(Boolean)
        : entry.skills,
    })),
    education: data.education || [],
    certifications: Array.isArray(data.certifications)
      ? data.certifications
      : [],
  };
}

function findFontVariant(
  fontsDir: string,
  variants: string[],
): string | null {
  if (!existsSync(fontsDir)) {
    return null;
  }

  for (const variant of variants) {
    const fontPath = join(fontsDir, variant);
    if (existsSync(fontPath) && !fontPath.toLowerCase().endsWith('.ttc')) {
      return fontPath;
    }
  }

  return null;
}

export function findPdfFonts(
  config: PdfFontConfig,
  state: PdfFontState,
): PdfFontState {
  const fontsDir = join(process.cwd(), 'assets', 'fonts', config.fontsDir);
  const next = { ...state };

  const regularPath = findFontVariant(fontsDir, config.regularVariants);
  if (regularPath) {
    next.fontPath = regularPath;
    next.fontName = config.familyName;
  }

  const boldPath = findFontVariant(fontsDir, config.boldVariants);
  if (boldPath) {
    next.fontBoldPath = boldPath;
    next.fontBold = `${config.familyName}-Bold`;
  }

  const italicPath = findFontVariant(fontsDir, config.italicVariants);
  if (italicPath) {
    next.fontItalicPath = italicPath;
    next.fontItalic = `${config.familyName}-Italic`;
  }

  const boldItalicPath = findFontVariant(
    fontsDir,
    config.boldItalicVariants,
  );
  if (boldItalicPath) {
    next.fontBoldItalicPath = boldItalicPath;
    next.fontBoldItalic = `${config.familyName}-BoldItalic`;
  }

  if (next.fontBoldPath === null && next.fontPath) {
    next.fontBoldPath = next.fontPath;
  }
  if (next.fontItalicPath === null && next.fontPath) {
    next.fontItalicPath = next.fontPath;
  }
  if (next.fontBoldItalicPath === null && next.fontBoldPath) {
    next.fontBoldItalicPath = next.fontBoldPath;
  }

  return next;
}

export function registerPdfFonts(
  doc: PDFKit.PDFDocument,
  state: PdfFontState,
  fallbackFamily?: PdfFontConfig['fallbackFamily'],
): PdfFontState {
  if (!state.fontPath || !existsSync(state.fontPath)) {
    return state;
  }

  try {
    doc.registerFont(state.fontName, state.fontPath);
    if (state.fontBoldPath) {
      doc.registerFont(state.fontBold, state.fontBoldPath);
    }
    if (state.fontItalicPath) {
      doc.registerFont(state.fontItalic, state.fontItalicPath);
    }
    if (state.fontBoldItalicPath) {
      doc.registerFont(state.fontBoldItalic, state.fontBoldItalicPath);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Warning: Could not register fonts: ${errorMessage}`);

    if (fallbackFamily) {
      return {
        ...state,
        fontName: fallbackFamily.regular,
        fontBold: fallbackFamily.bold,
        fontItalic: fallbackFamily.italic,
        fontBoldItalic: fallbackFamily.boldItalic,
      };
    }
  }

  return state;
}

export type BulletRenderOptions = {
  bulletX?: number;
  width?: number;
  fontSize?: number;
  lineGap?: number;
};

export function renderBulletItems(
  doc: PDFKit.PDFDocument,
  items: string[],
  marginX: number,
  contentWidth: number,
  fontName: string,
  options: BulletRenderOptions = {},
): void {
  const bulletX = options.bulletX ?? marginX + 18;
  const width = options.width ?? contentWidth - (bulletX - marginX);
  const fontSize = options.fontSize ?? 11;
  const lineGap = options.lineGap ?? 1.5;

  doc.font(fontName).fontSize(fontSize);

  for (const item of items) {
    const itemText = (typeof item === 'string' ? item : String(item ?? ''))
      .trim();
    if (!itemText || itemText === '[object Object]') {
      continue;
    }

    const bulletText = `• ${itemText}`;
    doc.text(bulletText, bulletX, doc.y, {
      width,
      align: 'left',
      lineGap,
    });
    doc.moveDown(0.2);
  }
}
