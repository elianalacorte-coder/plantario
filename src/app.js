const MESI      = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

Vue.createApp({
  data() {
    return {
      pronto:      false,
      caricando:   false,
      erroreImport: '',
      sheetsUrl:   '',
      vista:       'home',
      vistaPrec:   'home',
      inventario:  [],
      calendario:  [],
      semine:      [],
      config:      {},
      filtro:      'Tutte',
      piantaSel:   null,
      meseIdx:     new Date().getMonth(),
      spuntati:    {},
      toast:       '',
      notificheAttive: false,
      modal: { aperto: false, chiave: '', label: '', val: '', multi: false, tipo: '', specie: '' },
      tabs: [
        { id: 'home',       ico: '🏠', label: 'Home'     },
        { id: 'inventario', ico: '🌿', label: 'Piante'   },
        { id: 'calendario', ico: '📅', label: 'Agenda'   },
        { id: 'semine',     ico: '🌱', label: 'Semine'   },
        { id: 'settings',   ico: '⚙️', label: 'Info'     },
      ],
      campiDettaglio: [
        { chiave: 'Dove ora\n(balcone/casa)',           label: 'Posizione',        edit: true  },
        { chiave: 'Zona balcone\n(A-E)',                label: 'Zona',             edit: false },
        { chiave: 'Ø vaso attuale\n(cm)',               label: 'Vaso Ø (cm)',      edit: true  },
        { chiave: 'Soglia umidità\ninnaffia sotto (%)', label: 'Innaffia sotto %', edit: false },
        { chiave: 'Data ultima\nannaffiatura',          label: 'Ultima annaffiatura', edit: false },
        { chiave: 'Frequenza indicativa',               label: 'Frequenza',        edit: false },
        { chiave: 'Esposizione\nideale',                label: 'Esposizione',      edit: false },
        { chiave: 'Periodo\nfertilizzazione',           label: 'Fertilizzazione',  edit: false },
        { chiave: 'Stato salute',                       label: 'Stato',            edit: true  },
        { chiave: 'Note libere',                        label: 'Note',             edit: true, multi: true },
      ],
      MESI_NOMI,
    };
  },

  computed: {
    titoloHeader() {
      const t = { home:'🌿 Le mie piante', inventario:'🌿 Piante',
                  calendario:'📅 Agenda', semine:'🌱 Semine',
                  settings:'⚙️ Impostazioni', dettaglio: this.piantaSel?.['Nome comune'] || '' };
      return t[this.vista] || '🌿';
    },
    sottotitoloHeader() {
      if (this.vista==='home')       return `${this.inventario.length} piante · ${this.interventiMese.length} interventi questo mese`;
      if (this.vista==='inventario') return `${this.pianteFiltrate.length} piante`;
      if (this.vista==='calendario') return MESI_NOMI[this.meseIdx];
      return '';
    },
    filtriTipo() {
      const t = [...new Set(this.inventario.map(p => p['Tipo']).filter(Boolean))];
      return ['Tutte', ...t];
    },
    pianteFiltrate() {
      if (this.filtro==='Tutte') return this.inventario;
      return this.inventario.filter(p => p['Tipo']===this.filtro);
    },
    piantePerGiorni() {
      return this.inventario
        .map(p => {
          const s = p['Data ultima\nannaffiatura'];
          if (!s) return null;
          const pt = String(s).split('/');
          if (pt.length!==3) return null;
          const d = new Date(pt[2], pt[1]-1, pt[0]);
          if (isNaN(d)) return null;
          const g = Math.floor((new Date()-d)/86400000);
          return { nome: p['Nome comune'], zona: p['Dove ora\n(balcone/casa)'], giorni: g, raw: p };
        })
        .filter(Boolean)
        .sort((a,b) => b.giorni-a.giorni)
        .slice(0,8);
    },
    alertUrgenti() {
      return this.inventario
        .filter(p => String(p['Stato salute']).includes('⚠️') || String(p['Stato salute']).includes('❗'))
        .map(p => ({
          testo: `⚠️ ${p['Nome comune']} — ${String(p['Note libere']||p['Stato salute']).slice(0,80)}`,
          tipo: String(p['Stato salute']).includes('❗') ? 'error' : 'warn'
        }));
    },
    interventiMese() {
      return this._interventiDiMese(new Date().getMonth());
    },
    interventiMeseVista() {
      return this._interventiDiMese(this.meseIdx).map(item => ({
        ...item,
        fatto: !!this.spuntati[`${item.pianta}_${this.meseIdx}`]
      }));
    },
  },

  methods: {
    // ── IMPORT ──────────────────────────────────────────────────────────────
    async importaDaFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.caricando = true; this.erroreImport = '';
      try {
        const dati = await Import.daExcel(file);
        this._salvaDati(dati);
      } catch(err) {
        this.erroreImport = err.message;
      }
      this.caricando = false;
    },

    async importaDaSheets() {
      if (!this.sheetsUrl) return;
      this.caricando = true; this.erroreImport = '';
      try {
        const dati = await Import.daGoogleSheets(this.sheetsUrl);
        this._salvaDati(dati);
      } catch(err) {
        this.erroreImport = '❌ ' + err.message + ' — assicurati che il foglio sia condiviso pubblicamente.';
      }
      this.caricando = false;
    },

    _salvaDati(dati) {
      Storage.salva('inventario', dati.inventario);
      Storage.salva('calendario', dati.calendario);
      Storage.salva('semine',     dati.semine);
      Storage.salvaConfig({ ultimoAggiornamento: new Date().toLocaleString('it-IT') });
      this.inventario = dati.inventario;
      this.calendario = dati.calendario;
      this.semine     = dati.semine;
      this.config     = Storage.caricaConfig();
      this.pronto     = true;
      alert('Chiavi: ' + JSON.stringify(Object.keys(dati.inventario[0])));
    },

    // ── NAVIGAZIONE ─────────────────────────────────────────────────────────
    cambiaVista(id) { this.vistaPrec = id; this.vista = id; },

    apriDettaglio(p) {
      this.piantaSel = p; this.vistaPrec = this.vista; this.vista = 'dettaglio';
    },

    // ── ANNAFFIATURA ────────────────────────────────────────────────────────
    annaffiaOra() {
      const oggi = new Date().toLocaleDateString('it-IT');
      this.piantaSel['Data ultima\nannaffiatura'] = oggi;
      const idx = this.inventario.findIndex(p => p['Nome comune']===this.piantaSel['Nome comune']);
      if (idx>=0) this.inventario[idx]['Data ultima\nannaffiatura'] = oggi;
      Storage.salva('inventario', this.inventario);
      this.mostraToast(`✅ ${this.piantaSel['Nome comune']} annaffiata`);
    },

    // ── MODAL ───────────────────────────────────────────────────────────────
    apriModal(chiave, label, val, multi=false) {
      this.modal = { aperto:true, chiave, label, val: val||'', multi, tipo:'inventario', specie:'' };
    },
    apriModalSemina(specie, campo, val) {
      this.modal = { aperto:true, chiave:campo, label:campo, val: val||'', multi:false, tipo:'semina', specie };
    },

    salvaModal() {
      if (this.modal.tipo==='inventario') {
        this.piantaSel[this.modal.chiave] = this.modal.val;
        const idx = this.inventario.findIndex(p => p['Nome comune']===this.piantaSel['Nome comune']);
        if (idx>=0) this.inventario[idx][this.modal.chiave] = this.modal.val;
        Storage.salva('inventario', this.inventario);
      } else {
        const idx = this.semine.findIndex(s => s['Specie']===this.modal.specie);
        if (idx>=0) this.semine[idx][this.modal.chiave] = this.modal.val;
        Storage.salva('semine', this.semine);
      }
      this.modal.aperto = false;
      this.mostraToast('✅ Salvato');
    },

    // ── CALENDARIO ──────────────────────────────────────────────────────────
    mesePrev() { this.meseIdx = (this.meseIdx+11)%12; },
    meseNext() { this.meseIdx = (this.meseIdx+1)%12;  },

    toggleFatto(item) {
      const k = `${item.pianta}_${this.meseIdx}`;
      this.spuntati[k] = !this.spuntati[k];
      Storage.salvaConfig({ spuntati: this.spuntati });
    },

    // ── EXPORT ──────────────────────────────────────────────────────────────
    esporta() {
      Export.scaricaExcel(this.inventario, this.calendario, this.semine);
      this.mostraToast('📥 File scaricato');
    },

    // ── NOTIFICHE ───────────────────────────────────────────────────────────
    async attivaNotifiche() {
      const ok = await Notifiche.richiediPermesso();
      this.notificheAttive = ok;
      if (ok) {
        Notifiche.controllaOggi(this.calendario);
        this.mostraToast('🔔 Notifiche attivate');
      }
    },

    // ── REIMPOSTA ───────────────────────────────────────────────────────────
    reimposta() {
      if (!confirm('Cancellare tutti i dati? Non è reversibile.')) return;
      ['inventario','calendario','semine','config'].forEach(k => Storage.cancella(k));
      this.inventario=[]; this.calendario=[]; this.semine=[];
      this.pronto=false;
    },

    // ── UTILITY ─────────────────────────────────────────────────────────────
    mostraToast(msg) {
      this.toast = msg;
      setTimeout(() => this.toast = '', 2500);
    },

    _interventiDiMese(idx) {
      const col = MESI[idx];
      return this.calendario
        .filter(r => r[col] && String(r[col]).trim())
        .map(r => ({ pianta: r.pianta || r['Pianta'] || '', azione: String(r[col]).trim() }));
    },

    coloreGiorni(g) {
      return g>14 ? '#E24B4A' : g>7 ? '#EF9F27' : '#639922';
    },
    coloreTipo(t) {
      const m = { 'Cactus/Succulenta':'#EF9F27','Tropicale':'#378ADD',
                  'Aromatica':'#1D9E75','Bulbo/Rizoma':'#7F77DD',
                  'Rampicante':'#D4537E','Orto':'#D85A30','Annuale':'#888780' };
      return m[t] || '#888';
    },
    coloreStato(s) {
      if (!s) return 'var(--muted)';
      if (String(s).includes('⚠️')||String(s).includes('❗')) return 'var(--rosso)';
      if (String(s).includes('✅')) return 'var(--verde)';
      return 'var(--arancio)';
    },
    stileBadge(a) {
      if (!a) return {};
      const s = a.toLowerCase();
      if (s.includes('semina'))    return { background:'#C8E6C9', color:'#1B4332' };
      if (s.includes('trapianto')) return { background:'#FFF9C4', color:'#633806' };
      if (s.includes('rinvaso'))   return { background:'#FFE0B2', color:'#7B3F00' };
      if (s.includes('fuori'))     return { background:'#B3E5FC', color:'#01579B' };
      if (s.includes('rientra'))   return { background:'#F8BBD9', color:'#880E4F' };
      if (s.includes('potatura')||s.includes('talea')) return { background:'#D7CCC8', color:'#3E2723' };
      if (s.includes('concime'))   return { background:'#E8F5E9', color:'#1B4332' };
      if (s.includes('raccolta'))  return { background:'#FFF3E0', color:'#7B3F00' };
      if (s.includes('attenzione'))return { background:'#FFCDD2', color:'#B71C1C' };
      return { background:'#F5F5F5', color:'#333' };
    },
  },

  mounted() {
    // Carica dati da localStorage se già presenti
    if (!Storage.tuttiVuoti()) {
      this.inventario = Storage.carica('inventario') || [];
      this.calendario = Storage.carica('calendario') || [];
      this.semine     = Storage.carica('semine')     || [];
      this.config     = Storage.caricaConfig();
      this.spuntati   = this.config.spuntati || {};
      this.notificheAttive = Notification.permission === 'granted';
      this.pronto = true;
      Notifiche.controllaOggi(this.calendario);
    }

    // Registra service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(console.error);
    }
  },
}).mount('#app');
