#!/usr/bin/env node
/**
 * Transliterates kana (hiragana/katakana) segments in filenames to romaji.
 * Keeps ASCII (A-Za-z0-9._-) intact. Replaces JP punctuation/space with "_".
 * Usage:
 *   node kana2romaji-filenames.js --dir ./library --dry-run
 *   node kana2romaji-filenames.js --dir ./library
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const args = process.argv.slice(2);
const getArg = (k, d=null) => {
  const i = args.indexOf(k);
  return i>=0 ? (args[i+1] ?? true) : d;
};
const ROOT = path.resolve(String(getArg('--dir', '.')));
const DRY  = args.includes('--dry-run');

function say(...a){ console.log('[kana2romaji]', ...a); }
function fail(msg){ console.error('[kana2romaji] ERROR:', msg); process.exit(1); }

// Basic Hepburn-ish mappings
const BASE = {
  // vowels
  'あ':'a','い':'i','う':'u','え':'e','お':'o',
  'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
  // k
  'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
  // s
  'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
  'サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
  // t
  'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
  'タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
  // n
  'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  'ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no',
  // h
  'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
  'ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
  // m
  'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  'マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo',
  // y
  'や':'ya','ゆ':'yu','よ':'yo',
  'ヤ':'ya','ユ':'yu','ヨ':'yo',
  // r
  'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
  'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro',
  // w
  'わ':'wa','を':'o','ん':'n',
  'ワ':'wa','ヲ':'o','ン':'n',
  // g
  'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
  'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go',
  // z/j
  'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
  'ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo',
  // d
  'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
  'ダ':'da','ヂ':'ji','ヅ':'zu','デ':'de','ド':'do',
  // b/p
  'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
  'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
  'バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo',
  'パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po',
  // small vowels (rare)
  'ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o',
  'ァ':'a','ィ':'i','ゥ':'u','ェ':'e','ォ':'o',
  // long mark
  'ー':'-', // will elongate previous vowel later
};

// yōon combos
const YOON = {
  'きゃ':'kya','きゅ':'kyu','きょ':'kyo','ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
  'しゃ':'sha','しゅ':'shu','しょ':'sho','じゃ':'ja','じゅ':'ju','じょ':'jo',
  'ちゃ':'cha','ちゅ':'chu','ちょ':'cho','にゃ':'nya','にゅ':'nyu','にょ':'nyo',
  'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo','びゃ':'bya','びゅ':'byu','びょ':'byo','ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo',
  'みゃ':'mya','みゅ':'myu','みょ':'myo','りゃ':'rya','りゅ':'ryu','りょ':'ryo',
  // katakana
  'キャ':'kya','キュ':'kyu','キョ':'kyo','ギャ':'gya','ギュ':'gyu','ギョ':'gyo',
  'シャ':'sha','シュ':'shu','ショ':'sho','ジャ':'ja','ジュ':'ju','ジョ':'jo',
  'チャ':'cha','チュ':'chu','チョ':'cho','ニャ':'nya','ニュ':'nyu','ニョ':'nyo',
  'ヒャ':'hya','ヒュ':'hyu','ヒョ':'hyo','ビャ':'bya','ビュ':'byu','ビョ':'byo','ピャ':'pya','ピュ':'pyu','ピョ':'pyo',
  'ミャ':'mya','ミュ':'myu','ミョ':'myo','リャ':'rya','リュ':'ryu','リョ':'ryo',
};

const SMALL_TSU = new Set(['っ','ッ']);
const SMALL_YOON = new Set(['ゃ','ュ','ょ','ャ','ュ','ョ']);

const JP_SEP = /[・。、「」『』（）()［］【】〔〕｛｝、，。・：；？！（）\s]+/g;

// transliterate one kana string → romaji
function kanaToRomaji(s){
  s = s.normalize ? s.normalize('NFC') : s;
  let out = '';
  for (let i=0; i<s.length; i++){
    const ch = s[i];
    // small tsu: double next consonant
    if (SMALL_TSU.has(ch) && i+1 < s.length){
      // peek next yoon combo if any
      const two = s.slice(i+1, i+3);
      const next = (YOON[two] || BASE[s[i+1]] || '');
      const c = next.match(/^[bcdfghjklmnpqrstvwxyz]/i)?.[0] || '';
      out += c.toLowerCase();
      continue;
    }
    const two = s.slice(i, i+2);
    if (YOON[two]){
      out += YOON[two];
      i++;
      continue;
    }
    // long mark: extend previous vowel if present
    if (ch === 'ー'){
      if (out.length){
        const last = out[out.length-1];
        const map = { a:'a', i:'i', u:'u', e:'e', o:'o' };
        if (map[last]) out += last; // simple doubling
      }
      continue;
    }
    if (BASE[ch]) { out += BASE[ch]; continue; }
    // plain ASCII allowed as-is; other JP punct → underscore
    if (/^[A-Za-z0-9._-]$/.test(ch)){ out += ch; }
    else if (JP_SEP.test(ch)){ out += '_'; JP_SEP.lastIndex = 0; }
    else { out += '_'; }
  }

  // fix common n + vowel boundaries: "n a" -> "n a" (leave as-is for filenames)
  // collapse underscores, trim
  out = out.replace(/_+/g,'_').replace(/^_+|_+$/g,'');
  return out;
}

// transliterate filename (just the base name), keeping extension
function translitFilename(name){
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  const rom = kanaToRomaji(stem);
  const safe = rom || '_';
  return safe + ext;
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
      out.push({ rel, full, name: ent.name, dir: path.join(dir) });
    }
  }
  return out;
}

async function main(){
  say('Start', `dir=${ROOT}`, DRY ? '(dry-run)' : '(apply)');
  // Collect .data files only
  const all = await walk(ROOT, '');
  const datas = all.filter(f => f.name.toLowerCase().endsWith('.data'));
  say(`.data files: ${datas.length}`);

  let changes = 0;
  for (const f of datas){
    const newName = translitFilename(f.name);
    if (newName !== f.name){
      changes++;
      console.log(`  ${f.rel}  ->  ${path.posix.join(path.posix.dirname(f.rel), newName)}`);
      if (!DRY){
        await fsp.rename(f.full, path.join(f.dir, newName));
      }
    }
  }

  if (!changes) say('No filename changes required.');
  else if (!DRY) say(`Renamed ${changes} files.`);
  say('Done.');
}

main().catch(e => fail(e.stack || e.message));