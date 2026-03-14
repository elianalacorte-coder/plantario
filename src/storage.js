const KEYS = {
  inventario: 'piante_inventario',
  calendario: 'piante_calendario',
  semine:     'piante_semine',
  config:     'piante_config',
};

const Storage = {
  salva(chiave, dati) {
    localStorage.setItem(KEYS[chiave], JSON.stringify(dati));
  },

  carica(chiave) {
    const raw = localStorage.getItem(KEYS[chiave]);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return null; }
  },

  cancella(chiave) {
    localStorage.removeItem(KEYS[chiave]);
  },

  tuttiVuoti() {
    return !localStorage.getItem(KEYS.inventario);
  },

  salvaConfig(obj) {
    const attuale = this.carica('config') || {};
    this.salva('config', { ...attuale, ...obj });
  },

  caricaConfig() {
    return this.carica('config') || {};
  },
};
