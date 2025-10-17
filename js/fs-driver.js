// js/fs-driver.js
// File System Access (FSA) driver for Study Cards.
// Public API (mirrors idbDriver):
//   setRoot(handle)         // set DirectoryHandle root (required)
//   getRoot()
//   init()                  // no-op (root is set externally)
//   syncFromManifest(indexUrl)
//   listGroups()
//   listFiles(group)
//   readFile(path)
//   writeFile(path, text)
//   deleteFile(path)
(function(global){
  const EXT = '.data';
  const BASE_GROUP = '__base__';
  let rootDir = null;

  function _basename(p){
    p = String(p||'').replace(/^\/+/, '');
    const i = p.lastIndexOf('/');
    return i>=0 ? p.slice(i+1) : p;
  }
  function _extless(n){
    const j = n.lastIndexOf('.');
    return j>0 ? n.slice(0,j) : n;
  }
  function _groupOf(path){
    const i = path.lastIndexOf('/');
    return i>=0 ? path.slice(0,i) : BASE_GROUP;
  }
  function _normalizeRel(path){
    return String(path||'').replace(/^\/+/, '').replace(/^library\//,'');
  }

  async function _ensureSubdir(dir, name){
    return name ? await dir.getDirectoryHandle(name, { create:true }) : dir;
  }
  async function _ensurePath(dir, relPath){
    const clean = _normalizeRel(relPath);
    const parts = clean.split('/').filter(Boolean);
    let d = dir;
    for(let i=0;i<parts.length-1;i++){
      d = await d.getDirectoryHandle(parts[i], { create:true });
    }
    const filename = parts[parts.length-1] || '';
    return { dir: d, filename };
  }
  async function _fileExists(dir, filename){
    try { await dir.getFileHandle(filename); return true; }
    catch { return false; }
  }
  async function _readFileIfExists(dir, filename){
    try {
      const fh = await dir.getFileHandle(filename);
      const f = await fh.getFile();
      return await f.text();
    }catch{ return null; }
  }

  async function _fetchText(path){
    const url = new URL(path, location.href).toString();
    const res = await fetch(url, { cache: 'no-cache' });
    if(!res.ok) throw new Error(`Fetch ${path} ${res.status}`);
    return await res.text();
  }
  async function _fetchJSON(path){
    return JSON.parse(await _fetchText(path));
  }

  const fsDriver = {
    name: 'fs',
    setRoot(handle){ rootDir = handle || null; },
    getRoot(){ return rootDir; },
    async init(){ return true; },

    async syncFromManifest(indexUrl){
      if(!rootDir) throw new Error('No folder selected');
      const index = await _fetchJSON(indexUrl);
      const files = (index && index.files) || [];
      if(!files.length) return { wrote:0, errors:0 };

      const targetDir = rootDir;
      let wrote=0, skipped=0, errors=0;

      for(const item of files){
        const rel = typeof item === 'string' ? item : (item.path || item.file || item.name);
        if(!rel) continue;
        try{
          const relNorm = _normalizeRel(rel);
          const { dir, filename } = await _ensurePath(targetDir, relNorm);
          const libText = await _fetchText('library/' + relNorm);

          const current = await _readFileIfExists(dir, filename);
          if(current !== null && current === libText){ skipped++; continue; }

          const fh = await dir.getFileHandle(filename, { create:true });
          const ws = await fh.createWritable();
          await ws.write(libText);
          await ws.close();
          wrote++;
        }catch(err){
          console.warn('[fsa sync] fail', rel, err);
          errors++;
        }
      }
      return { wrote, skipped, errors };
    },

    async listGroups(){
      if(!rootDir) return [BASE_GROUP];
      const names = new Set([BASE_GROUP]);
      for await (const [name, handle] of rootDir.entries()){
        if(handle.kind === 'directory') names.add(name);
      }
      return Array.from(names).sort((a,b)=> a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }));
    },

    async listFiles(group){
      if(!rootDir) return [];
      let dir = rootDir;
      if(group && group !== BASE_GROUP){
        try{ dir = await rootDir.getDirectoryHandle(group); }
        catch{ return []; }
      }
      const rows = [];
      for await (const [name, handle] of dir.entries()){
        if(handle.kind === 'file' && name.toLowerCase().endsWith(EXT)){
          const path = (group && group !== BASE_GROUP) ? `${group}/${name}` : name;
          rows.push({ path, name, display: _extless(name) });
        }
      }
      rows.sort((a,b)=> a.display.localeCompare(b.display, undefined, { numeric:true, sensitivity:'base' }));
      return rows;
    },

    async readFile(path){
      if(!rootDir) throw new Error('No folder selected');
      const rel = _normalizeRel(path);
      const group = _groupOf(rel);
      const name  = _basename(rel);
      let dir = rootDir;
      if(group && group !== BASE_GROUP){
        dir = await rootDir.getDirectoryHandle(group);
      }
      const fh = await dir.getFileHandle(name);
      const f = await fh.getFile();
      return await f.text();
    },

    async writeFile(path, text){
      if(!rootDir) throw new Error('No folder selected');
      const rel = _normalizeRel(path);
      const { dir, filename } = await _ensurePath(rootDir, rel);
      const fh = await dir.getFileHandle(filename, { create:true });
      const ws = await fh.createWritable();
      await ws.write(String(text||''));
      await ws.close();
      return true;
    },

    async deleteFile(path){
      if(!rootDir) throw new Error('No folder selected');
      const rel = _normalizeRel(path);
      const group = _groupOf(rel);
      const name  = _basename(rel);
      let dir = rootDir;
      if(group && group !== BASE_GROUP){
        dir = await rootDir.getDirectoryHandle(group);
      }
      await dir.removeEntry(name);
      return true;
    }
  };

  global.fsDriver = fsDriver;
})(window);