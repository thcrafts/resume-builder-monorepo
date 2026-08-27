import { Injectable } from '@nestjs/common';
import * as PDFKit from 'pdfkit';

@Injectable()
export class CoverLetterPdfService {
  stripDatesFromCoverLetterHeader(text: string): string {
    const dateLinePatterns = [
      /^\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\s*$/gim,
      /^\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\s*$/gim,
      /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/gim,
    ];

    let result = text;
    for (const pattern of dateLinePatterns) {
      result = result.replace(pattern, '');
    }

    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  normalizeCoverLetterText(coverLetter: unknown): string {
    let coverLetterText: unknown = coverLetter;

    try {
      const parsed =
        typeof coverLetterText === 'string'
          ? JSON.parse(coverLetterText)
          : coverLetterText;
      if (typeof parsed === 'object' && parsed !== null) {
        coverLetterText =
          (parsed as { cover_letter?: string; coverLetter?: string })
            .cover_letter ||
          (parsed as { cover_letter?: string; coverLetter?: string })
            .coverLetter ||
          coverLetterText;
      }
    } catch {
      // Not JSON, use as-is
    }

    const normalized =
      typeof coverLetterText === 'string'
        ? coverLetterText
        : String(coverLetterText);

    return normalized.replace(/\\n/g, '\n').trim();
  }

  async generatePdf(
    username: string,
    coverLetterText: string,
    resumeCreatedAt: Date,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const PDFDoc = (PDFKit as any).default || PDFKit;
        const doc = new PDFDoc({
          size: 'LETTER',
          margins: {
            top: 0.75 * 72,
            bottom: 0.75 * 72,
            left: 0.75 * 72,
            right: 0.75 * 72,
          },
        });

        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        const dearMatch = coverLetterText.match(/Dear\s+Hiring/i);
        const dearIndex = dearMatch?.index ?? -1;

        let headerText =
          dearIndex >= 0
            ? coverLetterText.slice(0, dearIndex).trim()
            : '';
        const contentText =
          dearIndex >= 0
            ? coverLetterText.slice(dearIndex).trim()
            : coverLetterText.trim();

        headerText = this.stripDatesFromCoverLetterHeader(headerText);

        const normalizedUsername = username.trim();
        if (
          normalizedUsername &&
          headerText.toLowerCase().startsWith(normalizedUsername.toLowerCase())
        ) {
          headerText = headerText
            .slice(normalizedUsername.length)
            .replace(/^\s*\n+/, '')
            .trim();
        }

        const dateText = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(resumeCreatedAt);

        doc.fontSize(15).text(normalizedUsername, { align: 'left' });
        doc.moveDown(0.35);

        doc.fontSize(11);

        if (headerText) {
          doc.text(headerText, {
            align: 'left',
            lineGap: 1.5,
          });
          doc.moveDown(0.75);
        }

        doc.text(dateText, {
          align: 'left',
          lineGap: 1.5,
        });

        doc.moveDown(0.75);

        if (contentText.split('Sincerely')[0].endsWith('.\n')) {
          const fixedContentText = contentText
            .split('Sincerely')
            .join('\nSincerely');
          doc.text(fixedContentText, {
            align: 'justify',
            lineGap: 1.5,
          });
        } else {
          doc.text(contentText, {
            align: 'justify',
            lineGap: 1.5,
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
