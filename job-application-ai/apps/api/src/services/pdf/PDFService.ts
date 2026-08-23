import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { OptimizedResumeOutput } from '@repo/shared';

export class PDFService {
  async generateMasterResumeDocument(title: string, body: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const margin = 48;
    const maxWidth = width - margin * 2;
    let y = height - 56;

    const drawLines = (text: string, options: { size?: number; bold?: boolean; gap?: number } = {}) => {
      const size = options.size ?? 11;
      const lineFont = options.bold ? boldFont : font;
      for (const line of this.wrapText(text, lineFont, size, maxWidth)) {
        page.drawText(line, { x: margin, y, size, font: lineFont, color: rgb(0.08, 0.09, 0.12) });
        y -= size + 4;
      }
      y -= options.gap ?? 6;
    };

    page.drawText(title, {
      x: margin,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.32),
    });
    y -= 24;
    drawLines(body);

    return Buffer.from(await pdfDoc.save());
  }

  async generateResume(
    resume: OptimizedResumeOutput,
    company: string,
    title: string,
    version: number,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

    let y = height - 50;
    const margin = 50;
    const lineHeight = 14;
    const maxWidth = width - margin * 2;

    const drawText = (
      text: string,
      opts: { size?: number; bold?: boolean; y?: number; color?: [number, number, number] } = {},
    ): void => {
      const size = opts.size ?? 11;
      const currentFont = opts.bold ? boldFont : font;
      const color = opts.color ? rgb(...opts.color) : rgb(0, 0, 0);
      const lines = this.wrapText(text, currentFont, size, maxWidth);
      for (const line of lines) {
        page.drawText(line, {
          x: margin,
          y: y,
          size,
          font: currentFont,
          color,
        });
        y -= size + 4;
      }
      y -= 4;
    };

    drawText(`${title} - ${company}`, { size: 18, bold: true });
    drawText('Professional Summary', { size: 13, bold: true, color: [0.1, 0.1, 0.5] });
    drawText(resume.summary);

    drawText('Skills', { size: 13, bold: true, color: [0.1, 0.1, 0.5] });
    drawText(resume.skills.join(' • '));

    drawText('Experience', { size: 13, bold: true, color: [0.1, 0.1, 0.5] });
    for (const exp of resume.experience) {
      drawText(`${exp.title} | ${exp.company} | ${exp.duration}`, { bold: true });
      for (const highlight of exp.highlights) {
        drawText(`• ${highlight}`);
      }
    }

    drawText('Education', { size: 13, bold: true, color: [0.1, 0.1, 0.5] });
    for (const edu of resume.education) {
      drawText(`${edu.degree} - ${edu.institution}, ${edu.year}`);
    }

    if (resume.certifications && resume.certifications.length > 0) {
      drawText('Certifications', { size: 13, bold: true, color: [0.1, 0.1, 0.5] });
      for (const cert of resume.certifications) {
        drawText(`• ${cert}`);
      }
    }

    page.drawText(`Version ${version}`, {
      x: margin,
      y: 30,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private wrapText(text: string, font: import('pdf-lib').PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }
}
