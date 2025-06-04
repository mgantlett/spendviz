// Date format utility
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Enable custom parsing
dayjs.extend(customParseFormat);

// Common date formats to use in dropdowns and for parsing
export const COMMON_DATE_FORMATS = [
  'YYYY-MM-DD',     // ISO standard
  'MM/DD/YYYY',     // US common
  'DD/MM/YYYY',     // EU common
  'M/D/YYYY',       // US with single digits
  'D/M/YYYY',       // EU with single digits
  'MM-DD-YYYY',     // US with dashes
  'DD-MM-YYYY',     // EU with dashes
  'YYYY/MM/DD',     // Alternative ISO
  'MM/DD/YY',       // US short year
  'DD/MM/YY',       // EU short year
  'M/D/YY',         // US short year, single digits
  'D/M/YY',         // EU short year, single digits
  'MMM DD, YYYY',   // Jan 01, 2023
  'DD MMM YYYY',    // 01 Jan 2023
  'MMMM DD, YYYY',  // January 01, 2023
  'DD MMMM YYYY',   // 01 January 2023
];

/**
 * Converts a date string from one format to SQLite-compatible format (YYYY-MM-DD)
 * @param dateStr Original date string
 * @param sourceFormat The format of the source date
 * @returns Formatted date string or null if invalid
 */
export function convertDateToSQLiteFormat(dateStr: string, sourceFormat: string): string | null {
  try {
    const parsed = dayjs(dateStr, sourceFormat, true);
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Tries to detect the date format from a list of sample date strings.
 * @param dateSamples An array of date strings.
 * @param maxSamplesToTest Maximum number of samples to test for performance.
 * @returns The detected format string and confidence, or null if no reliable format is found.
 */
export function detectDateFormat(
  dateSamples: string[],
  maxSamplesToTest: number = 20
): { format: string; confidence: number; validSamples: number; totalSamples: number } | null {
  if (!dateSamples || dateSamples.length === 0) {
    return null;
  }

  const samplesToTest = dateSamples.slice(0, maxSamplesToTest);
  let bestMatch: { format: string; confidence: number; validSamples: number; totalSamples: number } | null = null;

  for (const format of COMMON_DATE_FORMATS) {
    let validCount = 0;
    for (const sample of samplesToTest) {
      if (dayjs(sample, format, true).isValid()) {
        validCount++;
      }
    }

    const confidence = validCount / samplesToTest.length;
    if (confidence > 0) { // Consider any format that can parse at least one sample
      if (!bestMatch || confidence > bestMatch.confidence || (confidence === bestMatch.confidence && validCount > bestMatch.validSamples)) {
        bestMatch = {
          format,
          confidence,
          validSamples: validCount,
          totalSamples: samplesToTest.length,
        };
      }
    }
  }
  // If multiple formats have the same high confidence, prefer more specific ones (e.g., YYYY-MM-DD over M/D/YY)
  // This can be refined further if needed by ordering COMMON_DATE_FORMATS by specificity.
  return bestMatch;
}

/**
 * Get a human-readable description of a date format
 * @param format dayjs format string
 * @returns Human readable description
 */
export function getFormatDescription(format: string): string {
  const examples: Record<string, string> = {
    'YYYY-MM-DD': 'ISO format (2023-12-25)',
    'MM/DD/YYYY': 'US format (12/25/2023)',
    'DD/MM/YYYY': 'European format (25/12/2023)',
    'M/D/YYYY': 'US format, no leading zeros (12/5/2023)',
    'D/M/YYYY': 'European format, no leading zeros (5/12/2023)',
    'MM-DD-YYYY': 'US format with dashes (12-25-2023)',
    'DD-MM-YYYY': 'European format with dashes (25-12-2023)',
    'YYYY/MM/DD': 'ISO with slashes (2023/12/25)',
    'MM/DD/YY': 'US short year (12/25/23)',
    'DD/MM/YY': 'European short year (25/12/23)',
    'M/D/YY': 'US short year, no zeros (12/5/23)',
    'D/M/YY': 'European short year, no zeros (5/12/23)',
    'MMM DD, YYYY': 'Month name format (Dec 25, 2023)',
    'DD MMM YYYY': 'European month name (25 Dec 2023)',
    'MMMM DD, YYYY': 'Full month name (December 25, 2023)',
    'DD MMMM YYYY': 'European full month (25 December 2023)',
  };
  return examples[format] || `Custom format (${format})`;
}
