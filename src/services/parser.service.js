import pdf from 'pdf-parse';
import * as yaml from 'js-yaml';
import { logger } from '../utils/logger.js';

/**
 * Service responsible for parsing raw document formats (PDFs and Markdown batch files)
 * into structured text representations.
 */
export class ParserService {
  /**
   * Reads a Markdown batch file content and splits it into multiple virtual documents.
   * Each document starts with a YAML frontmatter block enclosed in ---
   * @param {string} fileContent - Entire markdown file content.
   * @param {string} fileName - File name for reference.
   * @returns {Array<{pageContent: string, metadata: object}>} LangChain-style documents.
   */
  static parseMarkdownBatch(fileContent, fileName) {
    logger.debugStage('markdown_batch_parsing_start', {
      fileName,
      fileSizeChars: fileContent.length
    });

    // Split content by lines containing exactly '---'
    const parts = fileContent.split(/^---$/m).map(p => p.trim());
    
    // If the file starts with '---', the first split part is empty
    if (parts[0] === '') {
      parts.shift();
    }

    const virtualDocuments = [];
    
    // Each document is formed by a pair of [YAML, Markdown Content]
    for (let i = 0; i < parts.length; i += 2) {
      const yamlStr = parts[i];
      const markdownStr = parts[i + 1] || '';
      
      if (!yamlStr) continue;

      try {
        const metadata = yaml.load(yamlStr);
        if (!metadata || !metadata.id) {
          logger.warn(`Document block missing required 'id' in frontmatter. Skipping block in file ${fileName}.`);
          continue;
        }

        virtualDocuments.push({
          pageContent: markdownStr,
          metadata: {
            id: metadata.id,
            document: fileName, // Link back to original markdown batch file
            title: metadata.title || 'Untitled',
            category: metadata.category || 'General',
            crop: metadata.crop || [],
            season: metadata.season || [],
            region: metadata.region || [],
            keywords: metadata.keywords || [],
            related_documents: metadata.related_documents || [],
            version: metadata.version || '1.0',
            // Preserve all additional parsed metadata keys (e.g. subcategory, chemical_group, etc.)
            ...metadata
          }
        });
      } catch (err) {
        logger.error(`Failed to parse YAML frontmatter in file ${fileName} around block index ${i}:`, err);
      }
    }

    logger.debugStage('markdown_batch_parsing_success', {
      fileName,
      documentsExtractedCount: virtualDocuments.length
    });

    return virtualDocuments;
  }

  /**
   * Parses page-by-page text from a raw PDF buffer.
   * @param {Buffer} fileBuffer - The buffer of the PDF file.
   * @returns {Promise<Array<{pageNumber: number, text: string}>>} Array of parsed pages.
   */
  static async parsePdf(fileBuffer) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('PDF file buffer is empty or invalid.');
    }

    logger.debugStage('pdf_parsing_start', {
      fileBufferSizeBytes: fileBuffer.length,
    });

    const pages = [];

    // Custom pagerender implementation to extract page numbers alongside text.
    const options = {
      pagerender: async function (pageData) {
        try {
          const textContent = await pageData.getTextContent();
          let lastY, text = '';
          
          for (const item of textContent.items) {
            // Reconstruct lines based on y-coordinate transform
            if (lastY === undefined || lastY === item.transform[5]) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }

          // Clean whitespace and normalize formatting
          const cleanText = text
            .replace(/[ \t]+/g, ' ')               // Collapse horizontal spaces
            .replace(/\r\n/g, '\n')                // Normalize CRLF to LF
            .replace(/\n\s*\n/g, '\n')             // Remove empty lines
            .trim();

          const pageNumber = pageData.pageIndex + 1;

          pages.push({
            pageNumber,
            text: cleanText,
          });

          return cleanText;
        } catch (err) {
          logger.error(`Error rendering page index ${pageData.pageIndex}:`, err);
          return '';
        }
      }
    };

    try {
      await pdf(fileBuffer, options);
      
      if (pages.length === 0) {
        throw new Error('No text content could be parsed from the PDF.');
      }

      // Sort pages to ensure proper reading order (1, 2, 3...)
      pages.sort((a, b) => a.pageNumber - b.pageNumber);
      
      logger.info(`Successfully parsed PDF document, extracted ${pages.length} pages.`);
      
      logger.debugStage('pdf_parsing_success', {
        pagesExtractedCount: pages.length,
        totalCharacterCount: pages.reduce((sum, p) => sum + p.text.length, 0),
      });

      return pages;
    } catch (error) {
      logger.error('Failed to parse PDF document:', error);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }
}
