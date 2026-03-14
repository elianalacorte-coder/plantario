const Notifiche = {

  async richiediPermesso() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  },

  async schedula(titolo, corpo, dataOra) {
    // Le notifiche schedulate non sono supportate nativamente su tutti i browser.
    // Usiamo il service worker per simularle al mattino.
    const config = Storage.caricaConfig();
    const notifiche = config.notifiche || [];
    notifiche.push({ titolo, corpo, dataOra: dataOra.toISOString() });
    Storage.salvaConfig({ notifiche });
  },

  // Chiamata ogni mattina dal service worker o all'apertura dell'app
  controllaOggi(calendario) {
    if (Notification.permission !== 'granted') return;

    const oggi  = new Date();
    const mese  = oggi.toLocaleString('it-IT', { month: 'short' }); // "mar", "apr"...
    const MESI  = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    const idx   = MESI.indexOf(mese.toLowerCase());
    if (idx < 0) return;

    const colMese = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][idx];

    const interventi = calendario
      .filter(r => r[colMese] && String(r[colMese]).trim())
      .map(r => `${r.pianta || r['Pianta'] || ''}: ${r[colMese]}`);

    if (interventi.length === 0) return;

    new Notification('🌿 Interventi di ' + colMese, {
      body: interventi.slice(0, 5).join('\n') + (interventi.length > 5 ? '\n...' : ''),
      icon: 'icon-192.png',
    });
  },

  // Orario mattutino — salva nelle config
  impostaOrario(ora) {
    Storage.salvaConfig({ orarioNotifica: ora }); // es. "07:30"
  },
};
