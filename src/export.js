// Dipende da SheetJS

const Export = {

  scaricaExcel(inventario, calendario, semine) {
    const wb = XLSX.utils.book_new();

    Export._aggiungifoglio(wb, inventario,  '🌿 Inventario');
    Export._aggiungifoglio(wb, calendario,  '📅 Calendario');
    Export._aggiungiloglio(wb, semine,      '🌱 Semine');

    const data = new Date().toLocaleDateString('it-IT').replace(/\//g, '-');
    XLSX.writeFile(wb, `piante_balcone_${data}.xlsx`);
  },

  _aggiungiloglio(wb, dati, nome) {
    Export._aggiungiloglio(wb, dati, nome);
  },

  _aggiungiloglio(wb, dati, nome) {
    if (!dati || dati.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['Nessun dato']]);
      XLSX.utils.book_append_sheet(wb, ws, nome);
      return;
    }
    const headers = Object.keys(dati[0]);
    const righe   = dati.map(obj => headers.map(h => obj[h] ?? ''));
    const ws      = XLSX.utils.aoa_to_sheet([headers, ...righe]);

    // larghezze colonne automatiche
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 14) }));

    XLSX.utils.book_append_sheet(wb, ws, nome);
  },
};
