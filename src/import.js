// Dipende da SheetJS — caricato in index.html come script esterno

const Import = {

  // ── DA FILE EXCEL ────────────────────────────────────────────────────────
  async daExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb   = XLSX.read(data, { type: 'array' });
          const risultato = Import._leggiWorkbook(wb);
          resolve(risultato);
        } catch(err) {
          reject(new Error('File Excel non valido: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Errore lettura file'));
      reader.readAsArrayBuffer(file);
    });
  },

  // ── DA GOOGLE SHEETS PUBBLICO ────────────────────────────────────────────
  async daGoogleSheets(url) {
  const id = Import._estraiIdSheets(url);
  if (!id) throw new Error('URL Google Sheets non valido');

  const fogli  = ['🌿 Inventario', '📅 Calendario', '🌱 Semine'];
  const chiavi = ['inventario', 'calendario', 'semine'];
  const risultato = { inventario: [], calendario: [], semine: [] };

  for (let i = 0; i < fogli.length; i++) {
    const nome = encodeURIComponent(fogli[i]);
    const url  = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${nome}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`Foglio "${fogli[i]}" non raggiungibile`);
    const testo = await res.text();
    // Google restituisce json con prefisso: /*O_o*/\ngoogle.visualization.Query.setResponse(...)
    const json  = JSON.parse(testo.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
    risultato[chiavi[i]] = Import._gvizToObjects(json);
  }

  return risultato;
},

  // ── PRIVATI ──────────────────────────────────────────────────────────────
  _leggiWorkbook(wb) {
    const nomi   = ['🌿 Inventario', '📅 Calendario', '🌱 Semine'];
    const chiavi = ['inventario', 'calendario', 'semine'];
    const risultato = {};

    chiavi.forEach((chiave, i) => {
      // cerca il foglio per nome esatto, poi per indice come fallback
      const ws = wb.Sheets[nomi[i]] || wb.Sheets[wb.SheetNames[i]];
      if (!ws) { risultato[chiave] = []; return; }

      const righe = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (righe.length < 3) { risultato[chiave] = []; return; }

      // riga 0 = titolo, riga 1 = intestazioni, riga 2+ = dati
      const headers = righe[1].map(h => String(h).trim());
      risultato[chiave] = righe
        .slice(2)
        .filter(r => r[0] && !String(r[0]).startsWith('LEGENDA'))
        .map(r => {
          const obj = {};
          headers.forEach((h, j) => { if (h) obj[h] = r[j] ?? ''; });
          return obj;
        });
    });

    return risultato;
  },

  _estraiIdSheets(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  },

  _csvToObjects(csv) {
    const righe = csv.split('\n').map(r => {
      // gestisce virgolette CSV
      const cells = [];
      let inQuote = false, cell = '';
      for (const ch of r) {
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { cells.push(cell.trim()); cell = ''; }
        else { cell += ch; }
      }
      cells.push(cell.trim());
      return cells;
    }).filter(r => r.some(c => c));

    if (righe.length < 3) return [];

    const headers = righe[1].map(h => h.replace(/^"|"$/g, '').trim());
    return righe
      .slice(2)
      .filter(r => r[0] && !r[0].startsWith('LEGENDA'))
      .map(r => {
        const obj = {};
        headers.forEach((h, j) => {
          if (h) obj[h] = (r[j] || '').replace(/^"|"$/g, '').trim();
        });
        return obj;
      });
  },
  _gvizToObjects(json) {
  const cols = json.table.cols.map(c => c.label || '');
  const rows = json.table.rows || [];

  // trova la riga delle intestazioni (riga 1, indice 1)
  // in gviz la riga 0 è il titolo, la riga 1 sono le intestazioni vere
  if (rows.length < 2) return [];

  const headers = rows[1].c.map(c => c ? String(c.v || '').trim() : '');

  return rows
    .slice(2)
    .filter(r => r && r.c && r.c[0] && r.c[0].v)
    .filter(r => !String(r.c[0].v).startsWith('LEGENDA'))
    .map(r => {
      const obj = {};
      headers.forEach((h, j) => {
        if (h) obj[h] = r.c[j] ? String(r.c[j].v ?? '').trim() : '';
      });
      return obj;
    });
},
};
