// js/idb-driver.js
// IndexedDB-backed storage driver for Study Cards (IDB mode).
// Public API (mirrors fsDriver):
//   init(), 
//   syncFromManifest(indexUrl)
//   listGroups()
//   listFiles(group)
//   readFile(path)
//   writeFile(path, text)
//   deleteFile(path)
(function(global){
  const DB_NAME = 'sc_idb_library';
  const STORE   = 'files'; // key: path, value: { path, name, display, group, text, ts }

  // ---------- DB plumbing ----------
  function openDB(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e)=>{
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE)){
          const os = db.createObjectStore(STORE, { keyPath: 'path' });
          os.createIndex('by_group', 'group', { unique:false });
        }
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror   = ()=> reject(req.error);
    });
  }

  async function withStore(mode, fn){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      let settled = false;
      const tx = db.transaction(STORE, mode);
      const st = tx.objectStore(STORE);
      tx.oncomplete = ()=>{ if(!settled){ settled = true; resolve(); } };
      tx.onerror    = ()=>{ if(!settled){ settled = true; reject(tx.error); } };
      Promise.resolve(fn(st)).catch(err=>{
        if(!settled){ settled = true; reject(err); }
      });
    });
  }

  // ---------- helpers ----------
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
    return i>=0 ? path.slice(0,i) : '__base__';
  }
  function _normalizeKey(path){
    // strip leading slashes and any leading "library/" prefix
    return String(path||'').replace(/^\/+/,'').replace(/^library\//,'');
  }

  // ---------- public driver ----------
  const idbDriver = {
    name: 'idb',

    async init(){
      await openDB();
      return true;
    },

    // Fetch /library/index.json and store each file at key "group/filename" or "filename" for base.
    async syncFromManifest(indexUrl){
      const idxRes = await fetch(indexUrl, { cache:'no-cache' });
      if(!idxRes.ok) throw new Error(`index fetch ${idxRes.status}`);
      const index = await idxRes.json();
      const files = (index && index.files) || [];
      let wrote=0, errors=0;

      async function fetchText(rel){
        const clean = String(rel||'').replace(/^\/+/,'').replace(/^library\//,'');
        const url = new URL('library/' + clean, location.href).toString();
        const r = await fetch(url, { cache:'no-cache' });
        if(!r.ok) throw new Error(`fetch ${clean} ${r.status}`);
        return await r.text();
      }

      for(const item of files){
        try{
          const rel = typeof item === 'string' ? item : (item.path || item.file || item.name);
          if(!rel) continue;
          const clean = String(rel).replace(/^\/+/,'').replace(/^library\//,'');
          const text  = await fetchText(clean);

          const path  = clean;                   // e.g. "miku/No_47.data" or "000_test.data"
          const name  = _basename(path);         // "No_47.data"
          const group = _groupOf(path);          // "miku" or "__base__"
          const display = _extless(name);        // "No_47"
          const rec = { path, name, display, group, text, ts: Date.now() };

          await withStore('readwrite', st => st.put(rec));
          wrote++;
        }catch(e){
          // console.warn('[idb sync] error', e);
          errors++;
        }
      }
      return { wrote, errors };
    },

    async listGroups(){
      const groups = new Set();
      await withStore('readonly', st=>{
        const req = st.openCursor();
        req.onsuccess = e=>{
          const cur = e.target.result;
          if(cur){
            const v = cur.value || {};
            const g = v.group || _groupOf(v.path||'') || '__base__';
            groups.add(g);
            cur.continue();
          }
        };
      });
      if(!groups.size) return ['__base__'];
      const out = Array.from(groups);
      out.sort((a,b)=> a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }));
      return out;
    },

    // Return [{ path, name, display }] for a given group ('__base__' for root)
    async listFiles(group){
      group = group || '__base__';
      const rows = [];
      await withStore('readonly', st=>{
        const hasIdx = st.indexNames && Array.from(st.indexNames).includes('by_group');
        if (hasIdx){
          const idx = st.index('by_group');
          const key = IDBKeyRange.only(group);
          const req = idx.openCursor(key);
          req.onsuccess = e=>{
            const cur = e.target.result;
            if(cur){
              const v = cur.value || {};
              const path = v.path || '';
              const name = _basename(path) || (v.name || '');
              const display = _extless(name);
              rows.push({ path, name, display });
              cur.continue();
            }
          };
        } else {
          const req = st.openCursor();
          req.onsuccess = e=>{
            const cur = e.target.result;
            if(cur){
              const v = cur.value || {};
              const path = v.path || '';
              const g = v.group || _groupOf(path) || '__base__';
              if (g === group){
                const name = _basename(path) || (v.name || '');
                const display = _extless(name);
                rows.push({ path, name, display });
              }
              cur.continue();
            }
          };
        }
      });
      rows.sort((a,b)=> a.display.localeCompare(b.display, undefined, { numeric:true, sensitivity:'base' }));
      return rows;
    },

    // Return text content for path (with robust fallbacks for legacy keys)
    async readFile(path){
      const key = _normalizeKey(path);
      let out = '';

      await withStore('readonly', st=>{
        const tryGet = (k, done)=>{
          const req = st.get(k);
          req.onsuccess = e=>{
            const v = e.target.result;
            if (v && typeof v.text === 'string' && v.text.length){
              out = v.text;
              done(true);
            } else {
              done(false);
            }
          };
          req.onerror = ()=> done(false);
        };

        const attempts = [];
        attempts.push(key);                       // "foo/bar.data" or "000_test.data"
        attempts.push('library/' + key);          // older stored key w/ prefix

        const base = _basename(key);              // "bar.data"
        const baseNoExt = _extless(base);         // "bar"
        if (baseNoExt && baseNoExt !== base){
          attempts.push(baseNoExt + '.data');     // normalize to .data
          attempts.push(baseNoExt);               // very old schema
        }

        let i = 0;
        const next = ()=>{
          if (i >= attempts.length){
            // last resort: scan for matching basename (handles odd keys)
            const wanted = _basename(key);
            const req = st.openCursor();
            req.onsuccess = e=>{
              const cur = e.target.result;
              if(!cur) return; // stop; out remains ''
              const v = cur.value || {};
              const name = _basename(v.path || v.name || '');
              if (name === wanted || _extless(name) === _extless(wanted)){
                if (v && typeof v.text === 'string') out = v.text;
                return; // stop; tx completes -> returns out
              }
              cur.continue();
            };
            return;
          }
          const k = attempts[i++];
          tryGet(k, ok => { if(!ok) next(); });
        };
        next();
      });

      return out || '';
    },

    async writeFile(path, text){
      const norm = _normalizeKey(path);
      const name  = _basename(norm);
      const group = _groupOf(norm);
      const display = _extless(name);
      const rec = { path: norm, name, display, group, text: String(text||''), ts: Date.now() };
      await withStore('readwrite', st=> st.put(rec));
      return true;
    },

    async deleteFile(path){
      const norm = _normalizeKey(path);
      await withStore('readwrite', st=> st.delete(norm));
      return true;
    }
  };

  global.idbDriver = idbDriver;
})(window);
