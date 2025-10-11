#!/usr/bin/env node
/**
 * Normalize library filenames to ASCII-safe slugs and update index.json.
 * Usage:
 *   node normalize-library.js --root ./library --dry-run
 *   node normalize-library.js --root ./library
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const args = process.argv.slice(2);
const getArg = (k, d=null) => {
  const i = args.indexOf(k);
  return i>=0 ? (args[i+1] || true) : d;
};
const ROOT = path.resolve(String(getArg('--root','library')));
const DRY = args.includes('--dry-run');

function nfc(s){ try{ return s.normalize('NFC'); }catch{ return s; } }

// Map a few common full-width punctuation to ASCII
function punctMap(ch){
  const map = {
    '＋': '+', '－': '-', 'ー': '-', '＿': '_', '：': ':', '・': '_',
    '（': '(', '）': ')', '［':'[', '］':']', '｛':'{', '｝':'}',
    '，': ',', '．': '.', '／': '/', '、': ',', '。': '.',
    '！':'!', '？':'?', '〜':'~', '・':'_', '　':' ' // full-width space
  };
  return map[ch] ?? ch;
}

function asciiSlugSegment(seg){
  seg = nfc(seg);
  // map known full-width/symbols
  seg = Array.from(seg).map(punctMap).join('');
  // allow ASCII letters/digits/._- only (directories also allow '-')
  seg = seg.replace(/[^A-Za-z0-9._-]/g, '_');
  // collapse/trim underscores & dots
  seg = seg.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  seg = seg.replace(/\.+$/,''); // no trailing dot on Windows-y systems
  if (!seg) seg = '_';
  return seg;
}

function normalizeRelPath(rel){
  rel = rel.replace(/^[/\\]+/, '').replace(/\\/g,'/'); // POSIX style
  const parts = rel.split('/').filter(Boolean).map(asciiSlugSegment);
  return parts.join('/');
}

async function walk(dir, base=''){
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes:true });
  for (const ent of entries){
    const full = path.join(dir, ent.name);
    const rel = path.posix.join(base, ent.name);
    if (ent.isDirectory()){
      out.push(...await walk(full, rel));
    } else {
      out.push({ rel, full });
    }
  }
  return out;
}

async function main(){
  // 1) read index.json
  const indexPath = path.join(ROOT, 'index.json');
  const idxRaw = await fsp.readFile(indexPath, 'utf8');
  const idx = JSON.parse(idxRaw);
  const files = (idx.files || []).map(f => typeof f === 'string' ? { path:f } : f);

  // 2) build rename plan for actual files in tree
  const allFiles = await walk(ROOT, '');
  const dataFiles = allFiles.filter(f => f.rel.toLowerCase().endsWith('.data'));

  // 3) Plan renames: normalize every rel path
  const plan = [];
  const taken = new Set();

  function uniqueRel(p){
    let cand = p, i = 2;
    while (taken.has(cand)){
      const ext = path.extname(cand);
      const stem = cand.slice(0, cand.length - ext.length);
      cand = `${stem}_${i}${ext}`;
      i++;
    }
    taken.add(cand);
    return cand;
  }

  for (const f of dataFiles){
    const norm = normalizeRelPath(f.rel);
    const withExt = norm.endsWith('.data') ? norm : norm.replace(/\.[^.]*$/, '') + '.data';
    const uniq = uniqueRel(withExt);
    if (uniq !== f.rel){
      plan.push({ fromRel: f.rel, fromFull: f.full, toRel: uniq, toFull: path.join(ROOT, uniq) });
    }
  }

  // 4) Apply renames (files)
  if (plan.length === 0){
    console.log('No filename changes required.');
  } else {
    console.log(`Planned renames (${plan.length}):`);
    for (const p of plan) console.log(`  ${p.fromRel}  ->  ${p.toRel}`);
    if (!DRY){
      // Ensure target dirs exist
      for (const p of plan){
        await fsp.mkdir(path.dirname(p.toFull), { recursive:true });
        await fsp.rename(p.fromFull, p.toFull);
      }
      console.log(`Renamed ${plan.length} files on disk.`);
    } else {
      console.log('(dry-run) No files renamed.');
    }
  }

  // 5) Update index.json paths to normalized ones
  const mapOldToNew = new Map(plan.map(p => [p.fromRel, p.toRel]));
  let updates = 0;
  for (const entry of files){
    const old = entry.path.replace(/^library\//, '');
    const norm = normalizeRelPath(old);
    const ensureExt = norm.toLowerCase().endsWith('.data') ? norm : norm + '.data';
    const mapped = mapOldToNew.get(old) || ensureExt;
    if (mapped !== old){
      entry.path = mapped;
      updates++;
    }
  }

  if (updates > 0){
    const out = { ...idx, files };
    const backup = indexPath + '.bak';
    if (!DRY){
      await fsp.writeFile(backup, idxRaw, 'utf8');
      await fsp.writeFile(indexPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
      console.log(`Updated index.json (${updates} paths). Backup at ${path.basename(backup)}`);
    } else {
      console.log(`(dry-run) Would update index.json (${updates} paths).`);
    }
  } else {
    console.log('index.json paths already normalized.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
