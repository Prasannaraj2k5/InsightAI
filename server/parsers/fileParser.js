const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

/**
 * Multi-format File Parser Pipeline
 * Supports: .xlsx, .xls, .csv, .pdf, .docx, .doc, .txt, .json
 */
class FileParser {
  /**
   * Main entrypoint to parse an uploaded file or file buffer
   * @param {Object} file - Express multer file object or { buffer, originalname, mimetype }
   * @returns {Promise<Object>} Structured parsed result
   */
  static async parse(file) {
    const ext = path.extname(file.originalname || file.name || '').toLowerCase();
    const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);

    if (!buffer) {
      throw new Error('No valid file buffer or path provided for parsing.');
    }

    const startTime = Date.now();
    let result = {
      filename: file.originalname || file.name || 'unnamed_file',
      extension: ext,
      fileSize: buffer.length,
      fileSizeBytes: buffer.length,
      fileSizeFormatted: FileParser.formatBytes(buffer.length),
      parsedAt: new Date().toISOString(),
      type: 'unknown'
    };

    switch (ext) {
      case '.xlsx':
      case '.xls':
      case '.csv': {
        const sheetData = await FileParser.parseSpreadsheet(buffer, ext);
        result = { ...result, type: 'spreadsheet', ...sheetData };
        break;
      }

      case '.pdf': {
        const pdfData = await FileParser.parsePDF(buffer);
        result = { ...result, type: 'document', format: 'pdf', ...pdfData };
        break;
      }

      case '.docx':
      case '.doc': {
        const docData = await FileParser.parseDocx(buffer);
        result = { ...result, type: 'document', format: 'docx', ...docData };
        break;
      }

      case '.txt':
      case '.md':
      case '.json':
      default: {
        const textContent = buffer.toString('utf-8');
        result = {
          ...result,
          type: ext === '.json' ? 'json' : 'text',
          text: textContent,
          charCount: textContent.length,
          wordCount: textContent.trim().split(/\s+/).filter(Boolean).length
        };
        break;
      }
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Parse Excel or CSV buffers using sheetjs (xlsx)
   */
  static async parseSpreadsheet(buffer, ext) {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetNames = workbook.SheetNames;
    const sheets = {};

    let totalRows = 0;
    let primaryData = [];
    let primarySheet = sheetNames[0] || 'Sheet1';

    for (const name of sheetNames) {
      const worksheet = workbook.Sheets[name];
      const json = xlsx.utils.sheet_to_json(worksheet, { defval: null });
      sheets[name] = {
        rowCount: json.length,
        columnCount: json.length > 0 ? Object.keys(json[0]).length : 0,
        headers: json.length > 0 ? Object.keys(json[0]) : [],
        sample: json.slice(0, 10),
        data: json
      };
      totalRows += json.length;
    }

    primaryData = sheets[primarySheet] ? sheets[primarySheet].data : [];

    return {
      sheetNames,
      activeSheet: primarySheet,
      totalSheets: sheetNames.length,
      totalRows,
      columns: sheets[primarySheet] ? sheets[primarySheet].headers : [],
      data: primaryData,
      preview: primaryData.slice(0, 50),
      sheets
    };
  }

  /**
   * Parse PDF documents using pdf-parse
   */
  static async parsePDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      const text = data.text || '';
      return {
        text,
        numPages: data.numpages,
        info: data.info || {},
        version: data.version,
        charCount: text.length,
        wordCount: text.trim().split(/\s+/).filter(Boolean).length,
        pages: text.split('\n\n\n').filter(p => p.trim().length > 0)
      };
    } catch (err) {
      // In case of password or malformed pdf, fallback to readable text
      const fallbackText = buffer.toString('latin1').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      return {
        text: fallbackText,
        numPages: 1,
        charCount: fallbackText.length,
        wordCount: fallbackText.trim().split(/\s+/).filter(Boolean).length,
        warning: 'Standard PDF parse encountered an exception; recovered text using fallback stream.'
      };
    }
  }

  /**
   * Parse DOCX documents using mammoth
   */
  static async parseDocx(buffer) {
    try {
      const textResult = await mammoth.extractRawText({ buffer });
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const text = textResult.value || '';
      return {
        text,
        html: htmlResult.value || '',
        messages: textResult.messages,
        charCount: text.length,
        wordCount: text.trim().split(/\s+/).filter(Boolean).length
      };
    } catch (err) {
      const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      return {
        text,
        charCount: text.length,
        wordCount: text.trim().split(/\s+/).filter(Boolean).length,
        warning: 'DOCX parsing fallback utilized.'
      };
    }
  }

  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = FileParser;
