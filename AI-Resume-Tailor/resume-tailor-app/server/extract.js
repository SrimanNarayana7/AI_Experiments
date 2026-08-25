import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractPdf(buffer) {
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  const data = await parser.getText();
  return (data.text || '').replace(/\u0000/g, '').trim();
}

export async function extractDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return (value || '').replace(/\u0000/g, '').trim();
}

export async function extractText(filename, buffer) {
  const name = (filename || '').toLowerCase();
  if (name.endsWith('.pdf')) return extractPdf(buffer);
  if (name.endsWith('.docx')) return extractDocx(buffer);
  if (name.endsWith('.doc')) return extractDocx(buffer);
  return buffer.toString('utf8').replace(/\u0000/g, '').trim();
}
