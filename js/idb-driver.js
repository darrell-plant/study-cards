
// Simple IndexedDB driver for Study Cards (read-only in Step 2)
(function(global){
  const DB_NAME = 'sc_idb';
  const DB_VER  = 1;
  const STORE   = 'files'; // key = path, value = {path, group, name, mtime, text}

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e)=>{
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE, { keyPath:'path' });
        }
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror   = ()=> reject(req.error);
    });
  }
  async function withStore(mode, fn){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE, mode);
      const st = tx.objectStore(STORE);
      Promise.resolve(fn(st, tx)).then(resolve, reject);
      tx.onerror = ()=> reject(tx.error);
    });
  }

  // Helpers
  function groupFromPath(path){
    const p = String(path||'').replace(/^\/+/,'');
    const i = p.lastIndexOf('/');
    return i === -1 ? '__base__' : p.slice(0, i);
  }
  function fnameFromPath(path){
    const p = String(path||'');
    const i = p.lastIndexOf('/');
    return i === -1 ? p : p.slice(i+1);
  }
  function slugFromFilename(name){ return name.replace(/\.[^.]+$/, ''); }
  function titleCase(s){
    return String(s||'').toLowerCase().trim().split(/\s+/).map(w=>w? w[0].toUpperCase()+w.slice(1):'').join(' ');
  }
  function parseNameHeader(text){
    const m = String(text||'').split(/\r?\n/,1)[0].match(/^\s*name\s*:\s*(.+)$/i);
    return m ? m[1].trim() : '';
  }

  // Fetch helpers (respect current site origin)
  async function fetchText(path){
    const url = new URL(path, location.href).toString();
    const res = await fetch(url, { cache:'no-cache' });
    if(!res.ok) throw new Error(`Fetch ${path} ${res.status}`);
    return await res.text();
  }
  async function fetchJSON(path){ return JSON.parse(await fetchText(path)); }

  const idbDriver = {
    name: 'idb',

    async init(){
      await openDB();
      // (Optional) show a small toast in your app hook, not here
    },

    // Step 2: read-only library sync into IDB
    async syncFromManifest(indexPath='library/index.json'){
      const idx = await fetchJSON(indexPath);
      const files = Array.isArray(idx.files) ? idx.files : [];
      let wrote=0, skipped=0, errors=0;

      for(const entry of files){
        try{
          const rel = typeof entry === 'string' ? entry : (entry.path || entry.file || entry.name);
          if(!rel) continue;
          const relNorm = String(rel).replace(/^library\//,'').replace(/^\/*/,'');
          const absLib  = 'library/' + relNorm;
          const text    = await fetchText(absLib);

          const path    = relNorm;                 // key in IDB
          const group   = groupFromPath(path);
          const fname   = fnameFromPath(path);
          const header  = parseNameHeader(text);
          const name    = header || titleCase(slugFromFilename(fname));
          const mtime   = Date.now();

          // Upsert
          await withStore('readwrite', (st)=> st.put({ path, group, name, mtime, text }));
          wrote++;
        }catch(e){
          console.warn('[idb sync] failure', entry, e);
          errors++;
        }
      }
      return { wrote, skipped, errors };
    },

    async listGroups(){
      const groups = new Set();
      await withStore('readonly', (st)=>{
        return new Promise((resolve)=>{
          const req = st.openCursor();
          req.onsuccess = (e)=>{
            const cur = e.target.result;
            if(cur){ groups.add(cur.value.group || '__base__'); cur.continue(); }
            else resolve();
          };
        });
      });
      const arr = Array.from(groups);
      // Sort with __base__ first
      arr.sort((a,b)=> (a==='__base__')? -1 : (b==='__base__')? 1 : a.localeCompare(b));
      return arr;
    },

    async listFiles(group){
      const want = group || '__base__';
      const out = [];
      await withStore('readonly', (st)=>{
        return new Promise((resolve)=>{
          const req = st.openCursor();
          req.onsuccess = (e)=>{
            const cur = e.target.result;
            if(cur){
              const v = cur.value;
              if((v.group||'__base__') === want){
                out.push({ path:v.path, name: fnameFromPath(v.path), display: v.name });
              }
              cur.continue();
            } else resolve();
          };
        });
      });
      // Sort by display then filename
      out.sort((a,b)=> (a.display||'').localeCompare(b.display||'') || a.name.localeCompare(b.name));
      return out;
    },

    async readFile(path){
      const rec = await withStore('readonly', (st)=> st.get(path));
      if(!rec) throw new Error('Not found: '+path);
      return rec.text || '';
    },

    // Step 2: read-only—stubs for now
    async writeFile(){ throw new Error('IDB write not implemented (Step 3)'); },
    async deleteFile(){ throw new Error('IDB delete not implemented (Step 3)'); },
  };

  // expose
  global.idbDriver = idbDriver;
})(window);
