import * as PDFKit from 'pdfkit';
import { existsSync } from 'fs';
import { join } from 'path';
import { ResumeData, DEFAULT_RESUME_PDF_SETTINGS, filterSkillsForPdf, getCertificationText, type ResumePdfSettings } from '.';

const COLORS = {
  primary: '#1A1A1A',
  secondary: '#4A4A4A',
  body: '#2C3E50',
  accent: '#2C3E50',
};

const FONT_SIZES = {
  name: 24,
  title: 13,
  contact: 10,
  sectionHeader: 12,
  jobHeader: 11.5,
  jobMeta: 10.5,
  subHeader: 10.5,
  body: 10.5,
  educationInstitution: 11,
};

const CONTENT_INDENT = 18;
const EXPERIENCE_ENTRY_GAP = 0.4;
const EXPERIENCE_BULLET_LINE_GAP = 1;
const EXPERIENCE_BULLET_PARAGRAPH_GAP = 1;
const EXPERIENCE_BULLET_ITEM_GAP = 0.08;
const EXPERIENCE_SUBTITLE_GAP = 0.12;
const EXPERIENCE_AFTER_HEADER_GAP = 0.18;

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTH_NAME_TO_ABBREV: Record<string, string> = {
  jan: 'Jan',
  january: 'Jan',
  feb: 'Feb',
  february: 'Feb',
  mar: 'Mar',
  march: 'Mar',
  apr: 'Apr',
  april: 'Apr',
  may: 'May',
  jun: 'Jun',
  june: 'Jun',
  jul: 'Jul',
  july: 'Jul',
  aug: 'Aug',
  august: 'Aug',
  sep: 'Sep',
  sept: 'Sep',
  september: 'Sep',
  oct: 'Oct',
  october: 'Oct',
  nov: 'Nov',
  november: 'Nov',
  dec: 'Dec',
  december: 'Dec',
};

export class ResumePDFTemplate7 {
  private data: ResumeData;
  private pageWidth = 612; // Letter width in points (8.5 * 72)
  private pageHeight = 792; // Letter height in points (11 * 72)
  private marginX = 0.75 * 72; // 0.4 inch in points (horizontal)
  private marginT = 0.75 * 72; // 0.8 inch in points (vertical top)
  private marginB = 0.75 * 72; // 0.4 inch in points (vertical bottom)
  private contentWidth: number;
  private fontName = 'Arial';
  private fontBold = 'Arial-Bold';
  private fontItalic = 'Arial-Italic';
  private fontBoldItalic = 'Arial-BoldItalic';
  private fontPath: string | null = null;
  private fontBoldPath: string | null = null;
  private fontItalicPath: string | null = null;
  private fontBoldItalicPath: string | null = null;
  private pdfSettings: ResumePdfSettings;

  constructor(
    data: ResumeData,
    pdfSettings: ResumePdfSettings = DEFAULT_RESUME_PDF_SETTINGS,
  ) {
    this.data = this._normalizeData(data);
    this.pdfSettings = pdfSettings;
    this.contentWidth = this.pageWidth - 2 * this.marginX;
    this._findFonts();
  }

  private _normalizeData(data: ResumeData): ResumeData {
    return {
      name: data.name || '',
      title: data.title || '',
      contact: data.contact || {},
      summary: data.summary || '',
      skills: data.skills,
      experience: data.experience || [],
      education: data.education || [],
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
    };
  }

  private _formatDatePart(part: string): string {
    const text = part.trim();
    if (!text) {
      return '';
    }

    if (/^(present|current|now)$/i.test(text)) {
      return 'Present';
    }

    const slashMonthYearMatch = text.match(/^(\d{1,2})\/(\d{4})$/);
    if (slashMonthYearMatch) {
      const month = Number.parseInt(slashMonthYearMatch[1], 10);
      const year = slashMonthYearMatch[2];
      const monthName = MONTH_ABBREVIATIONS[month - 1];
      if (monthName) {
        return `${monthName} ${year}`;
      }
    }

    const slashFullDateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashFullDateMatch) {
      const month = Number.parseInt(slashFullDateMatch[1], 10);
      const year = slashFullDateMatch[3];
      const monthName = MONTH_ABBREVIATIONS[month - 1];
      if (monthName) {
        return `${monthName} ${year}`;
      }
    }

    const monthYearMatch = text.match(/^([A-Za-z.]+)\s+(\d{4})$/);
    if (monthYearMatch) {
      const monthName =
        MONTH_NAME_TO_ABBREV[monthYearMatch[1].replace(/\./g, '').toLowerCase()];
      if (monthName) {
        return `${monthName} ${monthYearMatch[2]}`;
      }
    }

    return text;
  }

  private _formatDateRange(dateRange: string): string {
    const trimmed = dateRange.trim();
    if (!trimmed) {
      return '';
    }

    const rangeMatch = trimmed.match(/^(.+?)\s*(?:-|–|—|\sto\s)\s*(.+)$/i);
    if (!rangeMatch) {
      return this._formatDatePart(trimmed);
    }

    const start = this._formatDatePart(rangeMatch[1]);
    const end = this._formatDatePart(rangeMatch[2]);

    if (start && end) {
      return `${start} – ${end}`;
    }

    return start || end || trimmed;
  }

  private _formatGraduationDate(dateRange: string): string {
    const trimmed = dateRange.trim();
    if (!trimmed) {
      return '';
    }

    const rangeMatch = trimmed.match(/^(.+?)\s*(?:-|–|—|\sto\s)\s*(.+)$/i);
    if (rangeMatch) {
      return this._formatDatePart(rangeMatch[2]);
    }

    return this._formatDatePart(trimmed);
  }

  private _findFonts() {
    // const fontsDir = join(process.cwd(), 'assets', 'fonts', 'cambria');
    const fontsDir = join(process.cwd(), 'assets', 'fonts', 'arial');

    const regularVariants = [
      'ARIAL.ttf',
    ];
    const boldVariants = [
      'ARIALBD.ttf',
    ];
    const italicVariants = [
      'ARIALI.ttf',
    ];
    const boldItalicVariants = [
      'ARIALBI.ttf',
    ];

    if (existsSync(fontsDir)) {
      for (const variant of regularVariants) {
        const fontPath = join(fontsDir, variant);
        if (existsSync(fontPath) && !fontPath.toLowerCase().endsWith('.ttc')) {
          this.fontPath = fontPath;
          this.fontName = 'Arial';
          break;
        }
      }

      for (const variant of boldVariants) {
        const fontPath = join(fontsDir, variant);
        if (existsSync(fontPath) && !fontPath.toLowerCase().endsWith('.ttc')) {
          this.fontBoldPath = fontPath;
          this.fontBold = 'Arial-Bold';
          break;
        }
      }

      for (const variant of italicVariants) {
        const fontPath = join(fontsDir, variant);
        if (existsSync(fontPath) && !fontPath.toLowerCase().endsWith('.ttc')) {
          this.fontItalicPath = fontPath;
          this.fontItalic = 'Arial-Italic';
          break;
        }
      }

      for (const variant of boldItalicVariants) {
        const fontPath = join(fontsDir, variant);
        if (existsSync(fontPath) && !fontPath.toLowerCase().endsWith('.ttc')) {
          this.fontBoldItalicPath = fontPath;
          this.fontBoldItalic = 'Arial-BoldItalic';
          break;
        }
      }

      if (this.fontBoldPath === null && this.fontPath) {
        this.fontBoldPath = this.fontPath;
      }
      if (this.fontItalicPath === null && this.fontPath) {
        this.fontItalicPath = this.fontPath;
      }
      if (this.fontBoldItalicPath === null && this.fontBoldPath) {
        this.fontBoldItalicPath = this.fontBoldPath;
      }
    }
  }

  private _registerFonts(doc: any) {
    if (this.fontPath && existsSync(this.fontPath)) {
      try {

        doc.registerFont(this.fontName, this.fontPath);
        if (this.fontBoldPath) {
          doc.registerFont(this.fontBold, this.fontBoldPath);
        }
        if (this.fontItalicPath) {
          doc.registerFont(this.fontItalic, this.fontItalicPath);
        }
        if (this.fontBoldItalicPath) {
          doc.registerFont(this.fontBoldItalic, this.fontBoldItalicPath);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.log(`Warning: Could not register fonts: ${errorMessage}`);
        this.fontName = 'Arial';
        this.fontBold = 'Arial-Bold';
        this.fontItalic = 'Arial-Italic';
        this.fontBoldItalic = 'Arial-BoldItalic';
      }
    }
  }

  private _addName(doc: any) {
    const name = this.data.name || '';

    doc
      .font(this.fontBold)
      .fontSize(FONT_SIZES.name)
      .fillColor(COLORS.primary)
      .text(name, this.marginX, this.marginT, {
        width: this.contentWidth,
        align: 'left',
      });

    doc.moveDown(0.3);
  }

  private _addTitle(doc: any) {
    const title = this.data.title || '';

    if (title) {
      doc
        .font(this.fontName)
        .fontSize(FONT_SIZES.title)
        .fillColor(COLORS.secondary)
        .text(title, {
          width: this.contentWidth,
          align: 'left',
        });
    }

    doc.moveDown(0.5);
  }

  private _addContact(doc: any) {
    const contact = this.data.contact || {};
    const address = contact.address || '';
    const email = contact.email || '';
    const phone = contact.phone || '';

    doc.fontSize(FONT_SIZES.contact).fillColor(COLORS.secondary);

    const startY = doc.y;
    doc.font(this.fontName).fillColor(COLORS.secondary);
    const addressAndPhone = `${address} | ${phone} | `;
    doc.text(addressAndPhone, this.marginX, startY);

    doc
      .fillColor(COLORS.secondary)
      .text(email, this.marginX + doc.widthOfString(addressAndPhone), startY, {
        link: `mailto:${email}`,
        underline: false,
      });

    doc.fillColor(COLORS.body);
    doc.moveDown(1);
  }

  private _addSectionHeader(doc: any, title: string) {
    const headerFontSize = FONT_SIZES.sectionHeader;
    const headerHeight = headerFontSize * 1.5;
    const paddingVertical = headerFontSize * 0.15;
    const spacingAfter = headerFontSize * 0.5;

    const contentFontSize = FONT_SIZES.body;
    const sectionTitleHeight = contentFontSize * 1.2; // Section title line
    const sectionTitleSpacing = contentFontSize * 0.3; // moveDown(0.3)
    const minContentLineHeight = contentFontSize * 1.2; // At least one bullet point line
    const minContentSpace =
      sectionTitleHeight +
      sectionTitleSpacing +
      minContentLineHeight +
      contentFontSize * 0.3; // Section title + spacing + one line + spacing

    const totalSpaceNeeded = headerHeight + spacingAfter + minContentSpace;

    const currentY = doc.y;
    const spaceAvailable = this.pageHeight - this.marginB - currentY;

    if (spaceAvailable < totalSpaceNeeded) {
      // Not enough space, add a new page
      doc.addPage();
    }

    const startY = doc.y;
    const fontSize = headerFontSize;
    const titleText = title.toUpperCase();

    // Reset opacity for text
    doc.opacity(1);

    // Draw text aligned to the left on top of background
    doc
      .font(this.fontBold)
      .fontSize(fontSize)
      .fillColor(COLORS.accent)
      .text(titleText, this.marginX, startY + paddingVertical, {
        width: this.contentWidth,
        align: 'left',
      });
    const lineY = doc.y + 3;
    doc
      .moveTo(this.marginX, lineY)
      .lineTo(this.marginX + this.contentWidth, lineY)
      .strokeColor(COLORS.accent)
      .lineWidth(0.75)
      .stroke();

    doc.moveDown(0.5);
  }

  private _estimateTextHeight(
    doc: any,
    text: string,
    width: number,
    fontSize: number,
    lineHeight?: number,
  ): number {
    const effectiveLineHeight = lineHeight || fontSize * 1.2;

    // Save current font and font size
    const savedFont = doc._font ? doc._font.name : null;
    const savedFontSize = doc._fontSize || 12;

    // Temporarily set font size for measurement
    doc.fontSize(fontSize);

    try {
      // Try to use PDFKit's widthOfString to calculate wrapping
      const words = text.split(' ');
      let currentLine = '';
      let lines = 1;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        let lineWidth: number;

        try {
          lineWidth = doc.widthOfString(testLine);
        } catch (e) {
          // Fallback: estimate based on average character width
          // Average character width is approximately 0.6 * fontSize for most fonts
          const avgCharWidth = fontSize * 0.6;
          lineWidth = testLine.length * avgCharWidth;
        }

        if (lineWidth > width) {
          if (currentLine) {
            lines++;
            currentLine = word;
          } else {
            // Single word is too long, estimate how many lines it needs
            let wordWidth: number;
            try {
              wordWidth = doc.widthOfString(word);
            } catch (e) {
              const avgCharWidth = fontSize * 0.6;
              wordWidth = word.length * avgCharWidth;
            }
            lines += Math.max(1, Math.ceil(wordWidth / width));
            currentLine = '';
          }
        } else {
          currentLine = testLine;
        }
      }

      // Restore font state
      if (savedFont) {
        doc.font(savedFont).fontSize(savedFontSize);
      } else {
        doc.fontSize(savedFontSize);
      }

      return lines * effectiveLineHeight;
    } catch (e) {
      // If all else fails, use a simple character-based estimation
      // Restore font state
      if (savedFont) {
        doc.font(savedFont).fontSize(savedFontSize);
      } else {
        doc.fontSize(savedFontSize);
      }

      // Estimate: average 80 characters per line for 11pt font at standard width
      const avgCharsPerLine = Math.floor(width / (fontSize * 0.6));
      const estimatedLines = Math.max(
        1,
        Math.ceil(text.length / avgCharsPerLine),
      );
      return estimatedLines * effectiveLineHeight;
    }
  }

  private _addSummary(doc: any) {
    this._addSectionHeader(doc, 'PROFESSIONAL SUMMARY');
    const summary = (this.data.summary || '').replace(/\n/g, ' ');

    doc
      .font(this.fontName)
      .fontSize(FONT_SIZES.body)
      .fillColor(COLORS.body)
      .text(summary, {
        width: this.contentWidth,
        align: 'justify',
        paragraphGap: 2,
        lineGap: 2,
      });

    doc.moveDown(1);
  }

  private _addSkills(doc: any) {
    const skills = filterSkillsForPdf(
      this.data.skills || [],
      this.pdfSettings.skillCategories,
    );
    if (skills.length === 0) {
      return;
    }

    this._addSectionHeader(doc, 'CORE TECHNOLOGIES');

    doc.font(this.fontName).fontSize(FONT_SIZES.body).fillColor(COLORS.body);

    for (const skill of skills) {
      const itemsText = skill.items.join(', ');
      const categoryText = `${skill.category}: `;
      const fullText = categoryText + itemsText;

      const fontSize = FONT_SIZES.body;
      const estimatedHeight = this._estimateTextHeight(
        doc,
        fullText,
        this.contentWidth,
        fontSize,
      );
      const spacingAfter = fontSize * 0.3;
      const minSpaceNeeded = estimatedHeight + spacingAfter;

      const currentY = doc.y;
      const spaceAvailable = this.pageHeight - this.marginB - currentY;

      if (spaceAvailable < minSpaceNeeded) {
        doc.addPage();
      }

      doc.font(this.fontBold).text(categoryText, this.marginX, doc.y, {
        width: this.contentWidth,
        align: 'justify',
        continued: true,
        lineGap: 2,
      });
      doc.font(this.fontName).text(itemsText, {
        align: 'justify',
        lineGap: 1,
      });
      doc.moveDown(0.15);
    }

    doc.moveDown(0.6);
  }

  private _ensureSpaceForSubtitleSection(
    doc: any,
    items: string[],
    options: {
      heightEstimateWidth?: number;
    } = {},
  ) {
    if (items.length === 0) {
      return;
    }

    const titleFontSize = FONT_SIZES.subHeader;
    const contentFontSize = FONT_SIZES.body;
    const titleHeight = titleFontSize * 1.2;
    const titleSpacing = titleFontSize * 0.2;
    const contentSpacing = contentFontSize * 0.15;
    const paragraphGap = EXPERIENCE_BULLET_PARAGRAPH_GAP;
    const heightEstimateWidth =
      options.heightEstimateWidth ??
      this.contentWidth - CONTENT_INDENT;

    let totalContentHeight = 0;
    doc.font(this.fontName).fontSize(contentFontSize);
    const prefixWidth = doc.widthOfString('• ');
    const wrappedTextWidth = heightEstimateWidth - prefixWidth;
    for (const item of items) {
      const itemText = String(item).replace(/\n/g, ' ').trim();
      if (!itemText) {
        continue;
      }
      totalContentHeight +=
        this._estimateTextHeight(
          doc,
          itemText,
          wrappedTextWidth,
          contentFontSize,
        ) + paragraphGap;
    }

    const titleBlockHeight = this.pdfSettings.showSubTitle
      ? titleHeight + titleSpacing
      : 0;
    const totalSpaceNeeded =
      titleBlockHeight + totalContentHeight + contentSpacing;

    const currentY = doc.y;
    const spaceAvailable = this.pageHeight - this.marginB - currentY;
    const minSpaceRequired = this.pdfSettings.showSubTitle
      ? titleHeight + titleSpacing + contentFontSize * 1.2
      : contentFontSize * 1.2;

    if (spaceAvailable < minSpaceRequired) {
      doc.addPage();
    } else if (spaceAvailable < totalSpaceNeeded) {
      if (spaceAvailable < minSpaceRequired * 2) {
        doc.addPage();
      }
    }
  }

  private _addSubTitle(doc: any, subtitle: string) {
    doc
      .font(this.fontBold)
      .fontSize(FONT_SIZES.subHeader)
      .fillColor(COLORS.accent)
      .text(subtitle, this.marginX + CONTENT_INDENT, doc.y, {
        width: this.contentWidth - CONTENT_INDENT,
        align: 'left',
      });
    doc.moveDown(EXPERIENCE_SUBTITLE_GAP);
  }

  private _addBulletItems(
    doc: any,
    items: string[],
    options: {
      bulletX?: number;
      textWidth?: number;
      contentColor?: string;
      lineGap?: number;
      indent?: boolean;
    } = {},
  ) {
    if (items.length === 0) {
      return;
    }

    const contentFontSize = FONT_SIZES.body;
    const useIndent = options.indent !== false;
    const bulletX =
      options.bulletX ??
      (useIndent ? this.marginX + CONTENT_INDENT : this.marginX);
    const textWidth =
      options.textWidth ??
      (useIndent
        ? this.contentWidth - CONTENT_INDENT
        : this.contentWidth);
    const contentColor = options.contentColor ?? COLORS.body;
    const lineGap = options.lineGap ?? EXPERIENCE_BULLET_LINE_GAP;

    doc.font(this.fontName).fontSize(contentFontSize).fillColor(contentColor);
    const bulletPrefix = '• ';
    const prefixWidth = doc.widthOfString(bulletPrefix);

    for (const item of items) {
      const itemText = String(item).replace(/\n/g, ' ').trim();
      if (!itemText) {
        continue;
      }

      doc.text(bulletPrefix, bulletX, doc.y, {
        continued: true,
        lineBreak: false,
      });
      doc.text(itemText, {
        width: textWidth - prefixWidth,
        align: 'left',
        paragraphGap: EXPERIENCE_BULLET_PARAGRAPH_GAP,
        lineGap,
      });
      doc.moveDown(EXPERIENCE_BULLET_ITEM_GAP);
    }
  }

  private _addCompanySkills(
    doc: any,
    skillsInCompany: string | string[] | undefined,
  ) {
    if (!skillsInCompany) {
      return;
    }

    const skillsText = Array.isArray(skillsInCompany)
      ? skillsInCompany.join(', ')
      : String(skillsInCompany);
    const bulletX = this.marginX + CONTENT_INDENT;
    const textWidth = this.contentWidth - CONTENT_INDENT;

    doc
      .font(this.fontBoldItalic)
      .fontSize(FONT_SIZES.body)
      .fillColor(COLORS.body);
    doc.text('Skills: ', bulletX, doc.y, {
      width: textWidth,
      align: 'left',
      continued: true,
    });
    doc.font(this.fontItalic).fillColor(COLORS.body).text(skillsText, {
      align: 'left',
    });
    doc.moveDown(EXPERIENCE_SUBTITLE_GAP);
  }

  private _addExperience(doc: any) {
    this._addSectionHeader(doc, 'PROFESSIONAL EXPERIENCE');
    const experiences = this.data.experience || [];

    for (const exp of experiences) {
      const companyFontSize = FONT_SIZES.jobHeader;
      const jobMetaFontSize = FONT_SIZES.jobMeta;
      const companyHeight = companyFontSize * 1.2;
      const companyLineHeight = companyFontSize * 1.2;
      const spacingAfterCompany = companyLineHeight * 0.5;
      const minContentSpace = FONT_SIZES.body * 2.5;

      const minSpaceNeeded =
        companyHeight + spacingAfterCompany + minContentSpace;

      const currentY = doc.y;
      const spaceAvailable = this.pageHeight - this.marginB - currentY;

      // Check if we need a page break before rendering the job title
      if (spaceAvailable < minSpaceNeeded) {
        doc.addPage();
      }

      const company = exp.company || '';
      const dateRange = this._formatDateRange(exp.date_range || '').trim();
      const companyText = company.trim();

      const col1Width = this.contentWidth * 0.5;
      const col2Width = this.contentWidth * 0.5;
      // Get current Y position
      let lineY = doc.y;
      const lineHeight = doc.currentLineHeight(true) || 13;

      // Check if we need a page break - ensure company and date stay together with content
      // Calculate if there's enough space on current page
      const spaceNeededForCompany =
        companyHeight + spacingAfterCompany + minContentSpace;
      const spaceAvailableForCompany = this.pageHeight - this.marginB - lineY;

      if (spaceAvailableForCompany < spaceNeededForCompany) {
        // Not enough space - add a new page
        doc.addPage();
        lineY = this.marginT; // Start at top margin of new page
      }

      // Render company text on the left
      const expTitle = (exp.title || '').trim();
      const headerPart = `${expTitle} — ${companyText}`;

      doc
        .font(this.fontBoldItalic)
        .fontSize(companyFontSize)
        .fillColor(COLORS.primary)
        .text(headerPart, this.marginX, lineY, {
          width: col1Width,
          align: 'left',
        });

      doc
        .font(this.fontName)
        .fontSize(jobMetaFontSize)
        .fillColor(COLORS.secondary)
        .text(dateRange, this.marginX + col1Width, lineY, {
          width: col2Width,
          align: 'right',
        });

      doc.moveDown(EXPERIENCE_AFTER_HEADER_GAP);

      const responsibilities = exp.responsibilities || [];
      if (responsibilities.length > 0) {
        this._ensureSpaceForSubtitleSection(doc, responsibilities, {
          heightEstimateWidth: this.contentWidth - CONTENT_INDENT,
        });
        if (this.pdfSettings.showSubTitle) {
          this._addSubTitle(doc, 'Key Qualifications & Responsibilities');
        }
        this._addBulletItems(doc, responsibilities, {
          contentColor: COLORS.body,
          lineGap: EXPERIENCE_BULLET_LINE_GAP,
        });
      }

      const achievements = exp.achievements || [];
      if (achievements.length > 0) {
        this._ensureSpaceForSubtitleSection(doc, achievements, {
          heightEstimateWidth: this.contentWidth - CONTENT_INDENT,
        });
        if (this.pdfSettings.showSubTitle) {
          this._addSubTitle(doc, 'Key Achievements');
        }
        this._addBulletItems(doc, achievements, {
          contentColor: COLORS.body,
          lineGap: EXPERIENCE_BULLET_LINE_GAP,
        });
      }

      if (this.pdfSettings.showCompanySkills) {
        this._addCompanySkills(doc, exp.skills);
      }

      doc.moveDown(EXPERIENCE_ENTRY_GAP);
    }
    doc.moveDown(0.5);
  }

  private _addEducation(doc: any) {
    this._addSectionHeader(doc, 'EDUCATION');
    const educationList = this.data.education || [];
    const lineGap = 2;

    for (const edu of educationList) {
      const institution = (edu.institution || '').trim();
      const degree = (edu.degree || '').trim();
      const graduationDate = this._formatGraduationDate(edu.date_range || '');
      const degreeLine = graduationDate
        ? `${degree} – ${graduationDate}`
        : degree;

      const minSpaceNeeded =
        (FONT_SIZES.educationInstitution + FONT_SIZES.body) * 2.4;
      const spaceAvailable = this.pageHeight - this.marginB - doc.y;

      if (spaceAvailable < minSpaceNeeded) {
        doc.addPage();
      }

      if (institution) {
        doc
          .font(this.fontBoldItalic)
          .fontSize(FONT_SIZES.educationInstitution)
          .fillColor(COLORS.primary)
          .text(institution, this.marginX, doc.y, {
            width: this.contentWidth,
            align: 'left',
            lineGap,
          });
      }

      if (degreeLine) {
        doc
          .font(this.fontName)
          .fontSize(FONT_SIZES.body)
          .fillColor(COLORS.body)
          .text(degreeLine, this.marginX, doc.y, {
            width: this.contentWidth,
            align: 'justify',
            lineGap,
          });
      }

      doc.moveDown(1);
    }
  }

  private _addCertifications(doc: any) {
    const certifications = this.data.certifications || [];
    if (certifications.length === 0) {
      return;
    }

    const items = certifications
      .map((cert) => getCertificationText(cert))
      .filter(Boolean);

    if (items.length === 0) {
      return;
    }

    this._ensureSpaceForSubtitleSection(doc, items, {
      heightEstimateWidth: this.contentWidth - CONTENT_INDENT,
    });
    this._addSectionHeader(doc, 'CERTIFICATIONS');
    this._addBulletItems(doc, items, {
      contentColor: COLORS.body,
      lineGap: 3,
    });
    doc.moveDown(1);
  }

  async generate(): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const PDFDoc = (PDFKit as any).default || PDFKit;
        const doc = new PDFDoc({
          size: 'LETTER',
          margins: {
            top: this.marginT,
            bottom: this.marginB,
            left: this.marginX,
            right: this.marginX,
          },
        });

        this._registerFonts(doc);

        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
        this._addName(doc);
        if (this.pdfSettings.showTitle) {
          this._addTitle(doc);
        }
        this._addContact(doc);
        this._addSummary(doc);
        this._addSkills(doc);
        this._addExperience(doc);
        this._addEducation(doc);
        this._addCertifications(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
