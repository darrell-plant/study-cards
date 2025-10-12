#!/usr/bin/env node
/**
 * For each input file, generate a “cleaned” filename:
 * - Convert ASCII + full-width punctuation and spaces -> '_'
 * - Compress multiple '_' to single '_'
 * - Preserve extension
 * - By default preserve '(' and ')' (use --no-preserve-parens to convert them to '_')
 *
 * Usage:
 *   node rename_punct_to_underscore.js file1.md "No 35 _ -ようになった (Now I can…)_.md"
 *   node rename_punct_to_underscore.js --apply *.md
 *   node rename_punct_to_underscore.js --no-preserve-parens --apply *.md
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const NO_PARENS = args.includes('--no-preserve-parens');

const files = args.filter(a => !a.startsWith('--'));
if (files.length === 0) {
  console.error('Usage: rename_punct_to_underscore.js [--apply] [--no-preserve-parens] <files...>');
  process.exit(1);
}

function nfc(s){ try { return s.normalize('NFC'); } catch { return s; } }

// Build a regex that matches:
// - Unicode punctuation (\p{P})
// - Unicode separators (spaces etc., \p{Z})
// Optionally *exclude* parentheses from replacement.
function makeReplaceRegex(preserveParens) {
  // Note: needs a recent Node with Unicode property escapes (Node 12+).
  if (preserveParens) {
    // Match punctuation except () plus all separators
    // We do this by matching all \p{P} then subtracting () via a negative lookahead,
    // and by matching all \p{Z} (separators).
    // Simpler approach: replace everything *except* () explicitly.
    return /[^\p{L}\p{N}().-]+|[^\S\r\n]+|[！-／：-＠［-｀｛-～]/gu;
  } else {
    // Replace all punctuation and separators
    return /[\p{P}\p{Z}]+/gu;
  }
}

// Clean a *basename* (no dirs), preserving extension
function cleanName(basename, { preserveParens = true } = {}) {
  const name = nfc(basename);
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);

  const re = makeReplaceRegex(preserveParens);
  let out = stem.replace(re, '_');

  // If preserving parens, tidy underscores adjacent to parens: "_(" -> "(", ")_" -> ")"
  if (preserveParens) {
    out = out.replace(/_+\(/g, '(').replace(/\)_+/g, ')');
  }

  // Collapse multiple underscores and trim
  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '');

  // Avoid empty stem
  if (!out) out = '_';

  return out + ext;
}

let hadError = false;

for (const input of files) {
  const dir = path.dirname(input);
  const base = path.basename(input);
  const cleaned = cleanName(base, { preserveParens: !NO_PARENS });

  // Print mapping
  console.log(`${base} -> ${cleaned}`);

  if (APPLY && cleaned !== base) {
    try {
      fs.renameSync(path.join(dir, base), path.join(dir, cleaned));
    } catch (e) {
      hadError = true;
      console.error(`  ERROR renaming ${base}: ${e.message}`);
    }
  }
}

process.exit(hadError ? 1 : 0);