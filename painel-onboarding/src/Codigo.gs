/**
 * Painel Onboarding — Acompanhamento Semanal
 * Fonte: colagem da visão Lista do Cockpit (Concierge e Gestor de IA)
 *
 * A colagem é uma FOTO do agora. Para saber o que aconteceu na semana
 * (ativou, avançou, entrou), o script guarda snapshots e compara.
 * Sem snapshot não existe métrica semanal — só estoque.
 */

const CFG = {
  COLAR_C: 'Colar_Concierge',
  COLAR_G: 'Colar_Gestor',
  COLAR_CT: 'Colar_Contratos',
  CONFIG: 'Config',
  SNAP: 'Snapshots',
  SEMANAL: 'Semanal',
  RITUAL: 'Historico_Ritual',
  EVENTOS: 'Eventos',

  // Quando uma dupla troca de composição, a série histórica quebra em duas linhas
  // e a curva perde continuidade. Este mapa costura o nome antigo ao novo.
  // Cada troca de pessoa cria uma linha nova na série e a curva perde continuidade.
  // Todo nome antigo aponta para o nome ATUAL da dupla.
  RENOMEAR: { 'Gabi + Igor': 'Carla + Igor' },

  // Duplas desfeitas: somem dos blocos, dos slides e do PDF. Os clientes continuam
  // contados nos totais — some o nome de quem não está mais na empresa, não o cliente.
  DUPLAS_OCULTAS: ['Gabi + Hugo'],

  // Quem entra na aba Metas. Lista fechada: nome de pessoa solta ou dupla desfeita
  // não vira linha, vira registro órfão no diagnóstico.
  DUPLAS_PILOTO: ['Ana + Bruno', 'Carla + Davi', 'Elisa + Fábio'],
  COLAR_CSV: 'Colar_Clientes_CSV',

  // Planilhas EXTRAS que também alimentam este painel. Cole aqui o id de cada uma
  // (o trecho entre /d/ e /edit da URL). A planilha onde o script está entra sempre
  // e é a única que guarda Snapshots e Semanal — as extras só fornecem colagem,
  // Config, Eventos e a exportação de clientes.
  PLANILHAS: [],

  ETAPAS_C: ['Entrada do Cliente','Pré-kickoff','Kickoff','BM e Raio-X','Imersão',
             'Em criação da IA','Pré-Ativação','Validação 7d','Ativo'],
  ETAPAS_G: ['Entrada do Cliente','Form','Criação da IA','Validação de QA','Ativação','Validação 7 dias','Ativo'],
  // Pipe de Contratos (ADM). "Conferência" fica como opcional, caso volte a existir.
  ETAPAS_CT: ['Conferência','Aguardando assinatura','Aguardando Assinatura','Contrato Assinado'],
  FAIXAS: [['até 15 dias',0,15],['16 a 30',16,30],['31 a 60',31,60],['61 a 90',61,90],['mais de 90',91,99999]],

  // Casamento é por trecho e sem acento/caixa (ver norm_). Tags mais longas primeiro,
  // para "Pendente ativar - cliente" não ser consumida por "Pendente ativar".
  // Esta lista serve para EXIBIR a tag como chip. A CLASSIFICAÇÃO não depende dela:
  // quem decide o motivo é o SIT, por palavra-chave, sobre o texto bruto da tag.
  // As 26 tags em uso no Cockpit, na ordem dos grupos usados pela operação.
  // Padrão novo do Cockpit (reorganização em 30 tags, nome único por tag).
  // As antigas ficam no fim só para os snapshots já gravados continuarem legíveis.
  TAGS: ['Go-live','Ativo','Congelado','Em processo de cancelamento','Distrato','Cancelado','Encerrado',
         'Agenda','Meta','Tráfego','Silêncio','Ajuste',
         'Risco','Retido','Satisfeito',
         'Reclame Aqui','Estorno',
         'Indicação','Parceria','Recorrência','Black Friday','Extensão','Condição especial',
         'Pré-venda','Renovado','Diagnóstico',
         'SDR','Closer',
         'Migração','Revisar cadastro','Teste',
         // grafias antigas
         'Ativação prevista próxima semana','Ativação Prevista','Cliente Ativo','Projeto Congelado',
         'EM PROCESSO CANCELAMENTO','CANCELAMENTO 7 DIAS','Contrato Encerrado (não renovou)','Aguardando Configurar Agenda',
         'Problemas na BM','Problema na BM','problema na 2 sincronizacao','Aguardando Tráfego',
         'Aguardando Cliente','Cliente Não Responde','Pendente ativar - cliente','Pendente ajuste',
         'CLIENTE EM RISCO','Cliente de retenção','ATENÇÃO RETIDO','Retenção','Cliente Satisfeito',
         'RECLAME AQUI','Cliente na plataforma legada','Extensão Contratual','Condição Especial',
         'Contrato pré venda','CONTRATO PRE VENDA','Cliente Renovado','Diagnóstico Sócios',
         'Migração ClickUp','Migração 2','Revisar Identidade','Revisar Produto',
         'Sem venda confirmada','Teste Interno','Aguardando assinatura do contrato'],

  // Etapas que contam como marco. Ajuste aqui se o pipe mudar de nome.
  MARCO_ONBOARDING: ['Em criação da IA','Criação da IA'], // entrou aqui = onboarding concluído
  MARCO_VALIDACAO:  ['Validação 7d','Validação 7 dias'],   // entrou aqui = ativação grupo 1
  MARCO_ATIVO:      ['Ativo'],                             // entrou aqui = ativação grupo 2
  // Quente = prestes a ativar. Só Pré-Ativação: no pipe do Gestor, "Ativação"
  // significa que a IA JÁ entrou no ar, e Validação é pós-ativação.
  ETAPAS_QUENTES:   ['Pré-Ativação'],

  // Janela de "o que entregamos no período". Mira JANELA_DIAS e nunca aceita um
  // snapshot com menos de JANELA_MIN dias: com leituras de terça e sexta, o mais
  // próximo de 7 é a terça (3 dias) e a semana apareceria pela metade.
  JANELA_DIAS: 7,
  JANELA_MIN: 5,

  // Abas de registro das metas do piloto. São preenchidas à mão, porque esses
  // dados não existem no Cockpit.
  // Aceitam mais de um nome: usa a primeira aba que existir e tiver linha.
  META_CSAT: ['CSAT', 'Metas_CSAT'],
  META_IND:  ['Metas_Indicacoes', 'Indicacoes', 'Indicações'],
  META_AJU:  ['Ajustes', 'Metas_Ajustes'],

  // Alvos do piloto, como definidos no alinhamento com a liderança.
  // Cabeçalho exato da coluna que é a nota do CSAT na aba CSAT. Vazio = o painel
  // escolhe sozinho a primeira coluna com nota, avalia, satisfação ou "1 a 5".
  CSAT_NOTA: '',

  METAS: { csatResposta: 80, csatNota: 4.5, csatDetrator: 10,
           indicacoes: 10, comissao: 500 },

  // Quantas leituras seguidas na MESMA etapa para o cliente contar como estagnado.
  // Com snapshot só na sexta, cada leitura é uma semana: 1 = parado há uma semana,
  // 2 = parado há duas. Com duas leituras por semana, mantenha 2.
  CICLOS_ESTAGNADO: 2
};

/**
 * SITUAÇÕES — a classificação real, por palavra-chave sobre o texto bruto da tag.
 * A ordem é a prioridade: a primeira que casar é o motivo do cliente.
 * Escrever a tag de outro jeito no Cockpit ("Processo de cancelamento" em vez de
 * "Em processo de cancelamento") não derruba mais a classificação.
 */
const SIT = [
  // Ciclo de vida
  ['Cancelamento em andamento',      /cancelad|cancelamento|distrato|encerrado|nao renovou|estorno/],
  ['Contrato não assinado',          /aguardando assinatura|assinatura do contrato|contrato pre venda|pre-venda|pre venda/],
  // Bloqueio: Meta, Agenda, Tráfego e Silêncio são trava do cliente; Ajuste é nossa
  ['Problema na BM',                 /problema[s]? na bm|problema[s]? de bm|sincroniza|meta/],
  ['Cliente não responde',           /cliente nao responde|nao responde|sem retorno|silencio/],
  ['Aguardando configuração da agenda', /configurar agenda|configuracao da agenda|configuracao de agenda|agenda/],
  ['Aguardando tráfego',             /aguardando trafego|trafego/],
  ['Aguardando retorno do cliente',  /aguardando cliente|aguardando retorno|pendente ativar/],
  ['Projeto congelado',              /projeto congelado|congelad|pausad/],
  ['Pendente de ajuste interno',     /pendente ajuste|pendente de ajuste|revisar produto|revisar valida|ajuste/],
  ['Pendência de migração',          /plataforma legada/]
];

/** Tags que tiram o card de TODAS as contagens do dashboard. */
const RX_CANCELADO = /cancelad|cancelamento|distrato|encerrado|nao renovou|estorno/;
/** Card de teste não é cliente: sai da carteira, mas fica contado à parte. */
const RX_TESTE = /teste/;
/**
 * Fora de TUDO: não é cliente de implantação. Não entra em carteira, ativação,
 * previsão, série semanal, metas nem slide. Hoje: Teste Interno e Parceria.
 */
const RX_FORA = /teste|parceria/;
function foraDaConta_(x) { return tem_(x, RX_FORA); }
/** Conta nas métricas: não cancelado E não é teste nem parceria. */
function conta_(x) { return ativo_(x) && !foraDaConta_(x); }
/** Risco de saída: não trava etapa, mas precisa de leitura da liderança. */
const RX_RISCO = /atencao retido|retido|retencao|reclame aqui|cliente de retencao|cliente em risco|risco/;
/** Já ativo = fora do pipe de onboarding. Tira o cliente da lista de risco da dupla. */
// "Ativo" agora é a tag inteira. Só é seguro porque o texto da tag já não carrega
// a coluna Status (ver semStatus_) — senão todo card "Ativo" de status casaria aqui.
const RX_ATIVO = /cliente ativo|ativo/;
/** Ativo pela TAG ou pela ETAPA: entregue é entregue, o risco vira assunto do CS. */
function jaEntregue_(c) {
  return tem_(c, RX_ATIVO) ||
    CFG.MARCO_ATIVO.indexOf(c.etapa) >= 0 ||
    CFG.MARCO_VALIDACAO.indexOf(c.etapa) >= 0;
}
/** Produto contratado, quando a tag informa. */
function tipoIA_(x) {
  const t = txtTags_(x);
  // Tags chegam coladas ("Migração ClickUpSDR"): borda de palavra não funciona,
  // e como nenhuma outra tag contém essas letras, o trecho basta.
  if (/closer/.test(t)) return 'Closer';
  if (/sdr/.test(t)) return 'SDR';
  return '';
}

/** Normaliza para comparar tag sem depender de caixa, acento ou espaço extra. */
function norm_(t) {
  return String(t || '').toLowerCase()
    .replace(/[áàâã]/g, 'a').replace(/[éêẽ]/g, 'e').replace(/[íî]/g, 'i')
    .replace(/[óôõ]/g, 'o').replace(/[úû]/g, 'u').replace(/ç/g, 'c')
    .replace(/[ºª°]/g, '')          // 2ª, 2°, 2º viram "2"
    .replace(/\s+/g, ' ').trim();
}

/**
 * O bruto gravado no snapshot é "células de Tags · célula de Status". O último
 * trecho depois do · é o Status do card (Ativo, Bloqueado, Concluído) e não é tag:
 * com a tag nova chamada só "Ativo", deixá-lo ali faria todo card parecer ativo.
 */
function semStatus_(raw) {
  return String(raw || '').replace(/\s*·\s*[^·]*$/, '').trim();
}

/** Texto onde procurar tag: as reconhecidas MAIS o bruto da colagem. */
function txtTags_(x) {
  if (x && typeof x === 'object')
    return norm_(String(x.tags || '') + ' | ' + String(x.tagsRaw || ''));
  return norm_(x);
}

/** O card tem esta situação (independente da prioridade)? */
function tem_(x, rx) { return rx.test(txtTags_(x)); }

/** Situação de maior prioridade do card, ou null. */
function situacao_(x) {
  const t = txtTags_(x);
  for (let i = 0; i < SIT.length; i++) if (SIT[i][1].test(t)) return SIT[i][0];
  return null;
}

/** Aceita o card inteiro (preferível) ou só a string de tags. */
function ativo_(x) { return !RX_CANCELADO.test(txtTags_(x)); }

/** O Sheets converte "2026-08-18" em Date. Normaliza os dois casos. */
function dataStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Sao_Paulo', 'yyyy-MM-dd');
  const t = String(v || '').trim();
  // "2026-10-16T00:15:18+00:00" é meia-noite UTC = noite do dia 15 em São Paulo.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) {
    const di = new Date(t);
    if (!isNaN(di.getTime())) return Utilities.formatDate(di, 'America/Sao_Paulo', 'yyyy-MM-dd');
  }
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  // Formulário e planilha brasileira: 16/10/2026 ou 16/10/2026 12:49:00
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return br[3] + '-' + ('0' + br[2]).slice(-2) + '-' + ('0' + br[1]).slice(-2);
  const d = new Date(t);
  return isNaN(d.getTime()) ? t : Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM-dd');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Painel Onboarding')
    .addItem('1 · Tirar snapshot de hoje', 'tirarSnapshot')
    .addItem('2 · Calcular semana', 'calcularSemana')
    .addItem('Recalcular todas as semanas', 'recalcularSemanal')
    .addSeparator()
    .addItem('Conferir números', 'conferirNumeros')
    .addSeparator()
    .addItem('Abrir dashboard', 'abrirDashboard')
    .addItem('Criar abas (primeira vez)', 'criarAbas')
    .addToUi();
}

/* ─────────────────────────── PARSER ─────────────────────────── */

/**
 * A colagem do Cockpit chega de duas formas:
 *   TABELA  — colando no Sheets, vira colunas (Cliente | Etapa atual | ... | Tags | Status)
 *   BLOCOS  — colando em texto puro, vira uma linha por campo
 * O parser detecta qual é e trata as duas.
 */
function parseColagem_(valores, etapasValidas, pipe) {
  if (!valores || !valores.length) return [];
  const iCab = acharCabecalho_(valores);
  return iCab >= 0
    ? parseTabela_(valores, iCab, etapasValidas, pipe)
    : parseBlocos_(valores, etapasValidas, pipe);
}

function acharCabecalho_(valores) {
  for (let i = 0; i < Math.min(valores.length, 15); i++) {
    const linha = valores[i].map(c => String(c || '').trim().toLowerCase());
    const temCliente = linha.some(c => c === 'cliente');
    const temEtapa = linha.some(c => c.indexOf('etapa') >= 0);
    if (temCliente && temEtapa) return i;
  }
  return -1;
}

function col_(cab, nomes) {
  for (let i = 0; i < cab.length; i++) {
    const c = String(cab[i] || '').trim().toLowerCase();
    for (let j = 0; j < nomes.length; j++) {
      if (c.indexOf(nomes[j]) >= 0) return i;
    }
  }
  return -1;
}

function parseTabela_(valores, iCab, etapasValidas, pipe) {
  const cab = valores[iCab];
  const cCli  = col_(cab, ['cliente']);
  const cEta  = col_(cab, ['etapa']);
  const cPra  = col_(cab, ['prazo', 'sla']);
  const cResp = col_(cab, ['responsável', 'responsavel']);
  const cFup  = col_(cab, ['follow']);
  const cTag  = col_(cab, ['tag']);
  const cTask = col_(cab, ['task']);
  const cSta  = col_(cab, ['status']);

  const cards = [];
  const vistos = {};
  const naoReconhecidas = [];
  const desconhecidas = {};
  for (let i = iCab + 1; i < valores.length; i++) {
    const r = valores[i];
    const cel = k => (k >= 0 ? String(r[k] || '').trim() : '');

    const bruto = cel(cCli);
    if (!bruto) continue;
    // Linha de seção: "Bloqueados · 13", "Ativos · 192", "Concluídos · 18"
    if (/^(Bloqueados|Ativos|Conclu[ií]dos|Pausados|Arquivados)\b[\s·|.\-–—]*\d*$/i
        .test(bruto.replace(/\u00a0/g, ' ').trim())) continue;

    // Linha de continuação do card anterior: só sobra texto solto, sem etapa nem responsável
    if (!cel(cEta) && !cel(cResp) && !cel(cTag) && !cel(cSta)) continue;

    const partes = bruto.split('\n').map(x => x.trim()).filter(Boolean);
    const mId = partes[0].match(/^#(\d+)\s*(.*)$/);
    const id = mId ? mId[1] : partes[0].replace(/[^A-Za-zÀ-ÿ0-9]/g, '').slice(0, 18);
    let cliente = mId ? mId[2] : partes[0];
    if (!cliente && partes[1]) cliente = partes[1];
    const produto = partes.find(x => /^IA(\s*\+\s*Tráfego)?$/i.test(x)) || '';

    // A célula pode trazer só a etapa OU etapa grudada no tempo:
    // "Criação da IA476d 16h na etapa". Casa pelo prefixo, do mais longo ao mais curto.
    const bruta = cel(cEta).replace(/\s+/g, ' ').trim();
    const ordenadas = etapasValidas.slice().sort((a, b) => b.length - a.length);
    let etapa = '';
    for (let k = 0; k < ordenadas.length; k++) {
      if (bruta.toLowerCase().indexOf(ordenadas[k].toLowerCase()) === 0) { etapa = ordenadas[k]; break; }
    }
    if (!etapa) {
      naoReconhecidas.push('linha ' + (i + 1) + ': "' + partes[0].slice(0, 34) + '"' +
        (bruta ? ' · etapa lida: "' + bruta.slice(0, 26) + '"' : ' · etapa VAZIA'));
      continue;
    }

    // Dias na etapa: pode estar na coluna de prazo ou grudado na de etapa
    let dias = null;
    const alvo = cel(cPra) + ' ' + bruta;
    const md = alvo.match(/(\d+)\s*d\s*\d*\s*h?\s*(na etapa|no projeto)/i);
    if (md) dias = parseInt(md[1], 10);
    else if (/(na etapa|no projeto)/i.test(alvo)) dias = 0;

    let resp = cel(cResp).split('\n')[0].trim();
    if (/^sem respons[áa]vel$/i.test(resp)) resp = '';

    const textoTags = cel(cTag) + '\n' + cel(cSta);
    // Chips só da coluna Tags. A coluna Status tem "Ativo", que agora é nome de tag.
    const alvoTags = norm_(cel(cTag));
    const achadas = CFG.TAGS.filter(t => alvoTags.indexOf(norm_(t)) >= 0);
    // Tag contida em outra que também casou é a mesma tag: fica só a mais longa.
    // Sem isso, "Ativação prevista próxima semana" virava também "Ativação Prevista".
    // Mesmo nome em grafias diferentes ("RECLAME AQUI" e "Reclame Aqui") é UMA tag:
    // fica a primeira. Sem isso as duas se anulavam e o chip sumia.
    const unicas = achadas.filter((t, i) =>
      achadas.findIndex(o => norm_(o) === norm_(t)) === i);
    const tags = unicas.filter(t => !unicas.some(o =>
      norm_(o) !== norm_(t) && norm_(o).indexOf(norm_(t)) >= 0));
    // O BRUTO é guardado inteiro: é ele que garante a classificação mesmo quando
    // a tag foi escrita de um jeito que a lista acima não prevê.
    const tagsRaw = textoTags.replace(/\s*\n\s*/g, ' · ').replace(/\s+/g, ' ').trim();

    const sta = cel(cSta);
    const status = /Conclu[ií]do/i.test(sta) ? 'Concluído'
                 : /Bloqueado/i.test(sta) ? 'Bloqueado' : 'Ativo';

    let tFeitas = null, tTotal = null;
    const mt = (cel(cTask) || '').match(/(\d+)\s*\/\s*(\d+)/);
    if (mt) { tFeitas = parseInt(mt[1], 10); tTotal = parseInt(mt[2], 10); }

    // As tags vêm coladas na colagem ("Cliente Não RespondeMigração ClickUp").
    // Para diagnosticar, retiro as conhecidas e reporto só o resto.
    (function () {
      let resto = norm_(cel(cTag));
      if (!resto || resto === '—') return;
      CFG.TAGS.forEach(t => { resto = resto.split(norm_(t)).join(' '); });
      resto = resto.replace(/[·|,;]/g, ' ').replace(/\s+/g, ' ').trim();
      if (resto.length > 3) desconhecidas[resto] = (desconhecidas[resto] || 0) + 1;
    })();

    const chave = pipe + '#' + id;
    if (vistos[chave]) continue;
    vistos[chave] = true;

    const fup = cel(cFup);
    cards.push({
      pipe: pipe, id: id, cliente: cliente, produto: produto, etapa: etapa,
      dias: dias, responsavel: resp, tags: tags, tagsRaw: tagsRaw,
      followup: /^sem follow-up$/i.test(fup) ? '' : fup, status: status,
      tFeitas: tFeitas, tTotal: tTotal
    });
  }
  const dk = Object.keys(desconhecidas);
  if (dk.length) {
    PropertiesService.getDocumentProperties().setProperty('tagsNovas' + pipe,
      dk.slice(0, 12).map(t => t + ' (' + desconhecidas[t] + ')').join(' · '));
  }
  if (naoReconhecidas.length) {
    Logger.log('Etapas não reconhecidas em ' + pipe + ': ' + naoReconhecidas.join(' | '));
    PropertiesService.getDocumentProperties()
      .setProperty('avisoEtapas' + pipe, pipe + ' — ' + naoReconhecidas.length + ' linhas:\n  ' + naoReconhecidas.slice(0, 6).join('\n  '));
  }
  return cards;
}

function parseBlocos_(valores, etapasValidas, pipe) {
  const linhas = [];
  valores.forEach(r => r.forEach(c => {
    String(c || '').split('\n').forEach(t => { t = t.trim(); if (t) linhas.push(t); });
  }));

  const cards = [];
  let atual = null;
  linhas.forEach(l => {
    if (/^(Bloqueados|Ativos|Conclu[ií]dos)\s*[·|-]?\s*\d+$/i.test(l)) return;
    const mId = l.match(/^#(\d+)$/);
    if (mId) { if (atual) cards.push(atual); atual = { id: mId[1], linhas: [] }; return; }
    if (atual) atual.linhas.push(l);
  });
  if (atual) cards.push(atual);

  return cards.map(c => {
    const L = c.linhas;
    const card = { pipe: pipe, id: c.id, cliente: '', produto: '', etapa: '',
                   dias: null, responsavel: '', tags: [], tagsRaw: '', followup: '', status: '' };
    for (let i = 0; i < L.length; i++) {
      if (/^IA(\s*\+\s*Tráfego)?$/i.test(L[i])) { card.produto = L[i]; continue; }
      if (etapasValidas.indexOf(L[i]) >= 0) { card.etapa = L[i]; break; }
      if (!card.cliente) card.cliente = L[i];
    }
    if (!card.etapa) {
      const e = L.find(x => etapasValidas.indexOf(x) >= 0);
      if (e) card.etapa = e;
    }
    const md = L.find(x => /na etapa|no projeto/.test(x));
    if (md) {
      const d = md.match(/(\d+)\s*d/); const h = md.match(/(\d+)\s*h/);
      card.dias = d ? parseInt(d[1], 10) : (h ? 0 : null);
    }
    const iFup = L.findIndex(x => /^Sem follow-up$/i.test(x) || /^\d+d\s+\d+h$/.test(x));
    if (iFup > 0) card.responsavel = L[iFup - 1];
    if (/^Sem respons[áa]vel$/i.test(card.responsavel)) card.responsavel = '';
    card.followup = iFup >= 0 && !/^Sem follow-up$/i.test(L[iFup]) ? L[iFup] : '';
    card.tags = L.filter(x => CFG.TAGS.some(t => norm_(t) === norm_(x)));
    // No modo blocos não há coluna de tag: guardo as linhas que parecem tag.
    card.tagsRaw = L.filter(x =>
      /cancel|congelad|pausad|pendente|aguardando|responde|plataforma legada|migra|reten|bm|parceria|prevista/i
        .test(x)).join(' · ') + ' ·';
    card.status = L.indexOf('Concluído') >= 0 ? 'Concluído'
                : L.indexOf('Bloqueado') >= 0 ? 'Bloqueado' : 'Ativo';
    return card;
  }).filter(c => c.etapa);
}

/* ─────────────────────────── SNAPSHOT ─────────────────────────── */

function tirarSnapshot() {
  migrarSnapshots_();
  const ss = SpreadsheetApp.getActive();
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const mapa = mapaDuplas_();

  // Cada planilha é lida separadamente: juntar as linhas antes de parsear faria o
  // cabeçalho da segunda cair no meio dos dados da primeira.
  const cards = [];
  const vistosGlobal = {};
  const porFonte = {};
  [[CFG.COLAR_C, CFG.ETAPAS_C, 'Concierge'],
   [CFG.COLAR_G, CFG.ETAPAS_G, 'Gestor'],
   [CFG.COLAR_CT, CFG.ETAPAS_CT, 'Contratos']].forEach(cfg => {
    lerTodas_(cfg[0]).forEach(f => {
      parseColagem_(f.valores, cfg[1], cfg[2]).forEach(c => {
        const k = cfg[2] + '#' + c.id;
        if (vistosGlobal[k]) return;   // mesmo card em duas planilhas: vale o primeiro
        vistosGlobal[k] = 1;
        cards.push(c);
        porFonte[f.nome] = (porFonte[f.nome] || 0) + 1;
      });
    });
  });

  if (!cards.length) {
    const diag = [CFG.COLAR_C, CFG.COLAR_G].map(nome =>
      lerTodas_(nome).map(f => f.nome + ' · ' + nome + ': ' + f.valores.length +
        ' linhas · cabeçalho ' + (acharCabecalho_(f.valores) >= 0 ? 'encontrado' : 'NÃO encontrado')
      ).join('\n') || nome + ': nenhuma planilha com conteúdo').join('\n');
    SpreadsheetApp.getUi().alert(
      'Nenhum card foi reconhecido.\n\n' + diag + '\n\n' +
      'Se as linhas estão lá mas o cabeçalho não foi encontrado, verifique se a primeira ' +
      'linha da colagem tem as colunas Cliente e Etapa atual.');
    return;
  }

  const aba = ss.getSheetByName(CFG.SNAP);
  // Remove snapshot do mesmo dia. Reescreve a aba inteira de uma vez:
  // apagar linha a linha custa uma chamada de API por linha e trava a planilha.
  const dados = aba.getDataRange().getValues();
  const cab = (dados.length && dados[0].length >= CAB_SNAP.length) ? dados[0] : CAB_SNAP;
  const mantidas = dados.slice(1).filter(r => r[0] !== '' && dataStr_(r[0]) !== hoje)
    .map(r => { const n = new Array(CAB_SNAP.length).fill('');
                for (let i = 0; i < CAB_SNAP.length && i < r.length; i++) n[i] = r[i];
                return n; });

  const linhas = cards.map(c => [
    hoje, c.pipe, c.id, c.cliente, c.etapa, c.responsavel,
    mapa[c.responsavel] || 'Sem dupla', c.dias, c.tags.join(' | '), c.status,
    c.tFeitas, c.tTotal, c.tagsRaw
  ]);
  const tudo = mantidas.concat(linhas);
  aba.clearContents();
  aba.getRange(1, 1, 1, CAB_SNAP.length).setValues([CAB_SNAP]);
  if (tudo.length) {
    const dest = aba.getRange(2, 1, tudo.length, CAB_SNAP.length);
    dest.offset(0, 0, tudo.length, 1).setNumberFormat('@');
    dest.setValues(tudo);
  }

  const props = PropertiesService.getDocumentProperties();
  const av = ['Concierge', 'Gestor'].map(p => props.getProperty('avisoEtapas' + p))
    .filter(Boolean);
  const tn = ['Concierge', 'Gestor', 'Contratos'].map(p => props.getProperty('tagsNovas' + p))
    .filter(Boolean);
  ['Concierge', 'Gestor', 'Contratos'].forEach(p => {
    props.deleteProperty('avisoEtapas' + p); props.deleteProperty('tagsNovas' + p);
  });

  SpreadsheetApp.getUi().alert(
    'Snapshot de ' + hoje + ' gravado.\n\n' +
    cards.filter(c => c.pipe === 'Concierge').length + ' cards no Concierge\n' +
    cards.filter(c => c.pipe === 'Gestor').length + ' cards no Gestor de IA\n' +
    cards.filter(c => c.pipe === 'Contratos').length + ' cards em Contratos' +
    (Object.keys(porFonte).length > 1
      ? '\n\nPor planilha: ' + Object.keys(porFonte)
          .map(k => k + ' — ' + porFonte[k]).join(' · ') : '') +
    (av.length ? '\n\n⚠ Linhas ignoradas por etapa não reconhecida:\n' + av.join('\n') : '') +
    (tn.length ? '\n\n⚠ Tags encontradas que o dashboard não conhece:\n' + tn.join('\n') +
      '\n\nSe alguma delas for usada em indicador, me avise para incluir.' : '')
  );
}

/** Todas as planilhas que alimentam o painel: a ativa primeiro, depois as extras. */
function fontes_() {
  const out = [SpreadsheetApp.getActive()];
  const vistos = {}; vistos[out[0].getId()] = 1;
  (CFG.PLANILHAS || []).forEach(id => {
    const x = String(id || '').trim();
    if (!x) return;
    try {
      const ss = SpreadsheetApp.openById(x);
      if (vistos[ss.getId()]) return;
      vistos[ss.getId()] = 1;
      out.push(ss);
    } catch (e) {
      Logger.log('Planilha não acessível: ' + x + ' — ' + e.message);
      PropertiesService.getDocumentProperties()
        .setProperty('fonteErro' + x.slice(-6), 'Sem acesso à planilha ' + x);
    }
  });
  return out;
}

/** Mesma aba em todas as fontes, uma entrada por planilha que tem conteúdo. */
function lerTodas_(nome) {
  const out = [];
  fontes_().forEach(ss => {
    const v = ler_(ss, nome);
    if (v.length) out.push({ ss: ss, nome: ss.getName(), valores: v });
  });
  return out;
}

function ler_(ss, nome) {
  const a = ss.getSheetByName(nome);
  if (!a || a.getLastRow() < 1) return [];
  return a.getDataRange().getValues();
}

function mapaDuplas_() {
  const m = {};
  lerTodas_(CFG.CONFIG).forEach(f => {
    f.valores.slice(1).forEach(r => {
      if (r[0]) m[String(r[0]).trim()] = String(r[2] || '').trim();
      if (r[1]) m[String(r[1]).trim()] = String(r[2] || '').trim();
    });
  });
  return m;
}

/* ─────────────────────── CÁLCULO SEMANAL ─────────────────────── */

/**
 * Compara o snapshot mais recente com o mais próximo de 7 dias atrás.
 * Cada card que MUDOU de etapa vira um evento contado para a dupla.
 */
const CAB_SNAP = ['data','pipe','id','cliente','etapa','responsavel','dupla','dias_na_etapa',
  'tags','status','tarefas_feitas','tarefas_total','tags_bruto'];

/** Aguardando assinatura ainda não tem dono — é fila do ADM, não card órfão. */
function aguardandoContrato_(c) {
  return tem_(c, /aguardando assinatura|assinatura do contrato/) || c.status === 'Bloqueado';
}

function migrarSnapshots_() {
  const aba = SpreadsheetApp.getActive().getSheetByName(CFG.SNAP);
  if (!aba) return;
  const larg = aba.getLastColumn();
  if (larg >= CAB_SNAP.length) return;
  const dados = aba.getLastRow() > 1
    ? aba.getRange(2, 1, aba.getLastRow() - 1, larg).getValues() : [];
  const novas = dados.map(r => {
    const n = new Array(CAB_SNAP.length).fill('');
    for (let i = 0; i < larg && i < r.length; i++) n[i] = r[i];
    return n;
  });
  aba.clearContents();
  aba.getRange(1, 1, 1, CAB_SNAP.length).setValues([CAB_SNAP]);
  if (novas.length) {
    const d = aba.getRange(2, 1, novas.length, CAB_SNAP.length);
    d.offset(0, 0, novas.length, 1).setNumberFormat('@');
    d.setValues(novas);
  }
}

const CAB_SEMANAL = ['semana','comparado_com','dupla','onboardings','p/ validacao','p/ ativo',
  'ativacoes','avancos','parados','quentes','carteira_ini','entradas','saidas','carteira_fim'];

/**
 * A aba Semanal foi de 10 para 14 colunas. Migra sozinha, preservando o que dá:
 * as colunas 1 a 8 são iguais; "quentes" era a 9 e virou a 10; "carteira" era a 10
 * e virou "carteira_fim", a 14. As colunas novas ficam em branco nas semanas antigas.
 */
function migrarSemanal_() {
  const aba = SpreadsheetApp.getActive().getSheetByName(CFG.SEMANAL);
  if (!aba) return;
  const larg = aba.getLastColumn();
  if (larg >= CAB_SEMANAL.length) return; // já está no formato novo

  const dados = aba.getLastRow() > 1
    ? aba.getRange(2, 1, aba.getLastRow() - 1, larg).getValues() : [];

  const novas = dados.map(r => {
    const n = new Array(CAB_SEMANAL.length).fill('');
    for (let i = 0; i < 8 && i < r.length; i++) n[i] = r[i];
    if (r.length >= 9)  n[9]  = r[8];  // quentes
    if (r.length >= 10) n[13] = r[9];  // carteira -> carteira_fim
    return n;
  });

  aba.clear();
  aba.getRange(1, 1, 1, CAB_SEMANAL.length).setValues([CAB_SEMANAL])
     .setFontWeight('bold').setBackground('#0D1117').setFontColor('#00CFFF');
  aba.setFrozenRows(1);
  if (novas.length) aba.getRange(2, 1, novas.length, CAB_SEMANAL.length).setValues(novas);
  Logger.log('Aba Semanal migrada: ' + larg + ' -> ' + CAB_SEMANAL.length + ' colunas');
}

/**
 * Uma comparação entre dois snapshots, já no formato de linha da aba Semanal.
 *
 * ATIVAÇÃO = entrou em Validação 7 dias, que é o momento em que a IA vai ao ar.
 * Passar de Validação para Ativo é fim de acompanhamento, não entrega nova, e por
 * isso fica na coluna própria "p/ ativo", sem somar nas ativações.
 */
function calcPar_(snaps, anterior, atual) {
  const A = indexar_(snaps.filter(r => dataStr_(r[0]) === anterior));
  const B = indexar_(snaps.filter(r => dataStr_(r[0]) === atual));

  // Contagem por CLIENTE, não por card: o mesmo cliente existe nos dois pipes
  // e entrar em Validação nos dois não é ativar duas vezes.
  const porDupla = {};
  const D = d => porDupla[d] = porDupla[d] || {
    onb: {}, valid: {}, ativo: {}, avancos: {}, parados: {},
    quentes: {}, cartIni: {}, cartFim: {}, entradas: {}, saidas: {}
  };

  Object.keys(A).forEach(k => {
    const a = A[k];
    if (!conta_(a)) return;
    D(a.dupla || 'Sem dupla').cartIni[a.id] = 1;
  });

  Object.keys(B).forEach(k => {
    const b = B[k], a = A[k];
    if (!conta_(b)) return;
    const d = b.dupla || 'Sem dupla';
    D(d).cartFim[b.id] = 1;
    if (CFG.ETAPAS_QUENTES.indexOf(b.etapa) >= 0) D(d).quentes[b.id] = 1;
    if (!a) return;
    if (a.etapa === b.etapa) { D(d).parados[b.id] = 1; return; }
    D(d).avancos[b.id] = 1;
    if (CFG.MARCO_ONBOARDING.indexOf(b.etapa) >= 0) D(d).onb[b.id] = 1;
    if (CFG.MARCO_VALIDACAO.indexOf(b.etapa) >= 0) D(d).valid[b.id] = 1;
    if (CFG.MARCO_ATIVO.indexOf(b.etapa) >= 0) D(d).ativo[b.id] = 1;
  });

  // Entradas e saídas por CLIENTE: entrou = está na carteira de hoje e não estava no início;
  // saiu = estava no início e não está hoje. Assim início + entradas − saídas = carteira hoje.
  Object.keys(porDupla).forEach(d => {
    const x = porDupla[d];
    x.entradas = {}; x.saidas = {};
    Object.keys(x.cartFim).forEach(i => { if (!x.cartIni[i]) x.entradas[i] = 1; });
    Object.keys(x.cartIni).forEach(i => { if (!x.cartFim[i]) x.saidas[i] = 1; });
  });

  const n = o => Object.keys(o || {}).length;
  return Object.keys(porDupla).sort().map(d => {
    const x = porDupla[d];
    return [atual, anterior, d, n(x.onb), n(x.valid), n(x.ativo), n(x.valid),
            n(x.avancos), n(x.parados), n(x.quentes),
            n(x.cartIni), n(x.entradas), n(x.saidas), n(x.cartFim)];
  });
}

/** Grava as linhas na aba Semanal, trocando as do mesmo par de datas. */
function gravarSemanal_(linhas, pares) {
  const aba = SpreadsheetApp.getActive().getSheetByName(CFG.SEMANAL);
  const ja = aba.getDataRange().getValues();
  const manter = ja.slice(1).filter(r => r[0] !== '' &&
    !pares.some(pr => dataStr_(r[0]) === pr[0] && dataStr_(r[1]) === pr[1]));
  const tudo = manter.concat(linhas);
  aba.clearContents();
  aba.getRange(1, 1, 1, CAB_SEMANAL.length).setValues([CAB_SEMANAL])
     .setFontWeight('bold').setBackground('#0D1117').setFontColor('#00CFFF');
  if (tudo.length) {
    const dst = aba.getRange(2, 1, tudo.length, CAB_SEMANAL.length);
    dst.offset(0, 0, tudo.length, 1).setNumberFormat('@');
    dst.setValues(tudo);
  }
}

function calcularSemana() {
  migrarSemanal_();
  const ss = SpreadsheetApp.getActive();
  const snaps = ler_(ss, CFG.SNAP).slice(1);
  if (!snaps.length) { SpreadsheetApp.getUi().alert('Sem snapshots. Rode o passo 1 primeiro.'); return; }

  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  if (datas.length < 2) {
    SpreadsheetApp.getUi().alert(
      'Só existe 1 snapshot (' + datas[0] + ').\n\n' +
      'A comparação semanal precisa de pelo menos dois. ' +
      'Rode o snapshot de novo daqui a alguns dias e o cálculo passa a funcionar.');
    return;
  }
  const atual = datas[datas.length - 1];
  const anterior = escolherAnterior_(datas, atual);
  gravarSemanal_(calcPar_(snaps, anterior, atual), [[atual, anterior]]);
  SpreadsheetApp.getUi().alert('Semana calculada: ' + anterior + ' → ' + atual);
}

/**
 * Refaz a aba Semanal inteira a partir dos snapshots, com a regra atual.
 * Necessário depois de mudar o que conta como ativação: sem isso, semanas antigas
 * ficam com a regra velha e a curva compara coisas diferentes.
 */
function recalcularSemanal() {
  migrarSemanal_();
  const ss = SpreadsheetApp.getActive();
  const snaps = ler_(ss, CFG.SNAP).slice(1);
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  if (datas.length < 2) { SpreadsheetApp.getUi().alert('Precisa de pelo menos dois snapshots.'); return; }

  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert('Recalcular todas as semanas',
    'Isto apaga a aba Semanal e refaz todas as ' + (datas.length - 1) +
    ' comparações a partir dos snapshots, com a regra atual de ativação ' +
    '(entrou em Validação 7 dias). Os snapshots não são alterados.\n\nContinuar?',
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  let linhas = [];
  for (let i = 1; i < datas.length; i++) {
    const atual = datas[i];
    const anterior = escolherAnterior_(datas.slice(0, i + 1), atual);
    linhas = linhas.concat(calcPar_(snaps, anterior, atual));
  }
  const aba = ss.getSheetByName(CFG.SEMANAL);
  aba.clearContents();
  aba.getRange(1, 1, 1, CAB_SEMANAL.length).setValues([CAB_SEMANAL])
     .setFontWeight('bold').setBackground('#0D1117').setFontColor('#00CFFF');
  if (linhas.length) {
    const dst = aba.getRange(2, 1, linhas.length, CAB_SEMANAL.length);
    dst.offset(0, 0, linhas.length, 1).setNumberFormat('@');
    dst.setValues(linhas);
  }
  ui.alert('Pronto: ' + (datas.length - 1) + ' comparações refeitas, de ' +
           datas[0] + ' a ' + datas[datas.length - 1] + '.');
}

function escolherAnterior_(datas, atual) {
  const alvo = new Date(atual).getTime() - 7 * 864e5;
  let melhor = datas[0], dif = Infinity;
  datas.forEach(d => {
    if (d === atual) return;
    const x = Math.abs(new Date(d).getTime() - alvo);
    if (x < dif) { dif = x; melhor = d; }
  });
  return melhor;
}

function indexar_(rows) {
  const m = {};
  rows.forEach(r => {
    m[r[1] + '#' + r[2]] = {
      pipe: r[1], id: r[2], cliente: r[3], etapa: r[4],
      responsavel: r[5], dupla: nomeDupla_(r[6]), dias: r[7], tags: String(r[8] || ''), status: r[9],
      tFeitas: r[10], tTotal: r[11], tagsRaw: semStatus_(r[12])
    };
  });
  return m;
}

/* ─────────────────────────── AUDITORIA ─────────────────────────── */

/**
 * Confere a consistência interna dos números antes de levá-los a qualquer reunião.
 * Toda regra aqui deve dar CONFERE. Se não der, o número está errado, não a regra.
 */
function conferirNumeros() {
  const d = getDados();
  if (!d.data) { SpreadsheetApp.getUi().alert('Sem snapshot ainda.'); return; }
  const L = [];
  const ok = (nome, cond, det) => L.push((cond ? '✓ ' : '✗ ') + nome + (det ? '  →  ' + det : ''));

  const t = d.totais;
  ok('Em onboarding + já ativos = distintos',
     t.emOnboarding + t.concluidos === t.distintos,
     t.emOnboarding + ' + ' + t.concluidos + ' = ' + (t.emOnboarding + t.concluidos) +
     ' (distintos: ' + t.distintos + ')');

  ok('Quentes não passam do total em onboarding',
     t.quentes <= t.emOnboarding,
     t.quentes + ' quentes de ' + t.emOnboarding + ' em onboarding');

  ok('Quentes distintos < cards de quentes (2 pipes)',
     t.quentes <= t.quentesCards,
     t.quentes + ' clientes em ' + t.quentesCards + ' cards');

  ok('Migração não passa do total de distintos',
     t.migracao <= t.distintos, t.migracao + ' de ' + t.distintos);

  const somaC = d.carteira.reduce((a, r) => a + r.total, 0);
  ok('Matriz Concierge soma o total do pipe', somaC === t.concierge,
     somaC + ' vs ' + t.concierge);
  const somaG = d.carteiraG.reduce((a, r) => a + r.total, 0);
  ok('Matriz Gestor soma o total do pipe', somaG === t.gestor, somaG + ' vs ' + t.gestor);

  const somaF = d.faixasDir.total.reduce((a, b) => a + b, 0);
  ok('Faixas de idade somam a carteira Concierge', somaF === t.concierge,
     somaF + ' vs ' + t.concierge);

  const somaM = Object.keys(d.motivos).reduce((a, k) => a + d.motivos[k], 0);
  ok('Motivos de espera somam a carteira Concierge', somaM === t.concierge,
     somaM + ' vs ' + t.concierge);

  ok('Progresso: pré-onboarding + fizeram = carteira',
     d.prog.preOnboarding + d.prog.fezOnboarding === d.prog.total,
     d.prog.preOnboarding + ' + ' + d.prog.fezOnboarding + ' = ' + d.prog.total);

  ok('Sem responsável e aguardando contrato não se sobrepõem',
     t.semDono + t.semDonoContrato <= t.distintos,
     t.semDono + ' + ' + t.semDonoContrato);

  // Equação de fluxo por dupla
  d.porDupla.forEach(p => {
    if (!p.cartIni && !p.cartFim) return;
    const calc = p.cartIni + p.entradas - p.saidas;
    ok('Fluxo fecha — ' + p.dupla, calc === p.cartFim,
       p.cartIni + ' + ' + p.entradas + ' − ' + p.saidas + ' = ' + calc +
       ' | carteira hoje: ' + p.cartFim);
  });

  const falhas = L.filter(x => x.indexOf('✗') === 0).length;
  SpreadsheetApp.getUi().alert(
    (falhas ? '⚠ ' + falhas + ' verificação(ões) FALHARAM' : '✓ Todas as verificações passaram') +
    '\n\nFoto de ' + d.data + '\n\n' + L.join('\n') +
    '\n\nObs: a equação de fluxo pode não fechar quando um card muda de dupla — ' +
    'nesse caso o dashboard lista quem foi.');
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */

function abrirDashboard() {
  const html = HtmlService.createTemplateFromFile('Dashboard')
    .evaluate().setTitle('Onboarding — Acompanhamento Semanal').setWidth(1400).setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, 'Onboarding — Acompanhamento Semanal');
}

function doGet() {
  return HtmlService.createTemplateFromFile('Dashboard').evaluate()
    .setTitle('Painel de Onboarding')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Alimenta o dashboard. */
function getDados() {
  const ss = SpreadsheetApp.getActive();
  const snaps = ler_(ss, CFG.SNAP).slice(1);
  const semRaw = ler_(ss, CFG.SEMANAL);
  const sem = (semRaw[0] && semRaw[0].length >= 14) ? semRaw.slice(1) : [];

  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  const hoje = datas[datas.length - 1] || null;

  // Diagnóstico bruto: o que a aba realmente contém, sem interpretação.
  const contagem = {};
  snaps.forEach(r => { const d = dataStr_(r[0]); contagem[d] = (contagem[d] || 0) + 1; });
  const tagsPorData = {};
  snaps.forEach(r => {
    const d = dataStr_(r[0]);
    if (norm_(String(r[8] || '') + ' ' + String(r[12] || '')).indexOf('ativacao prevista') >= 0)
      tagsPorData[d] = (tagsPorData[d] || 0) + 1;
  });
  const diagSnap = {
    linhas: snaps.length,
    datas: datas.map(d => ({ data: d, cards: contagem[d] || 0, comTagPrevisao: tagsPorData[d] || 0 })),
    usada: hoje,
    tipoPrimeiraCelula: snaps.length ? (Object.prototype.toString.call(snaps[0][0])) : '—'
  };

  const intervalo = datas.length > 1
    ? Math.max(1, Math.round((new Date(datas[datas.length - 1]).getTime() -
                              new Date(datas[datas.length - 2]).getTime()) / 864e5)) : null;
  const todos = snaps.filter(r => dataStr_(r[0]) === hoje).map(r => ({
    pipe: r[1], id: r[2], cliente: r[3], etapa: r[4],
    resp: r[5], dupla: nomeDupla_(r[6]) || 'Sem dupla', dias: r[7], tags: String(r[8] || ''), status: r[9],
    tFeitas: r[10], tTotal: r[11], tagsRaw: semStatus_(r[12])
  }));
  // QUEM ESTÁ CANCELADO: o campo status_entrega do sistema manda. A tag do card é
  // rótulo manual e erra nos dois sentidos — deixa passar cancelado e exclui cliente vivo.
  // Só na ausência da exportação a tag é usada como aproximação.
  const csvClientes = lerCSVClientes_();
  const canceladoCliente = {};
  if (csvClientes) {
    todos.forEach(c => {
      const x = csvClientes[c.id];
      if (x) { if (['cancelled', 'in_cancellation'].indexOf(x.status) >= 0) canceladoCliente[c.id] = true; }
      else if (!ativo_(c)) canceladoCliente[c.id] = true;   // sem CSV para este id, cai na tag
    });
  } else {
    todos.forEach(c => { if (!ativo_(c)) canceladoCliente[c.id] = true; });
  }
  const fonteCancelamento = csvClientes ? 'status do sistema' : 'tag do card';
  // Card de teste não é cliente: fora de toda contagem, contado à parte.
  const testeCliente = {};
  const parceriaCliente = {};
  todos.forEach(c => {
    if (tem_(c, RX_TESTE)) testeCliente[c.id] = true;
    if (tem_(c, /parceria/)) parceriaCliente[c.id] = true;
  });
  const foraCliente = Object.assign({}, testeCliente, parceriaCliente);
  const atuais = todos.filter(c => !canceladoCliente[c.id] && !foraCliente[c.id]);
  const excluidos = todos.length - atuais.length;
  const soUmPipe = todos.filter(c => canceladoCliente[c.id] && ativo_(c))
    .map(c => ({ id: c.id, cliente: c.cliente, pipe: c.pipe }));

  // Se o cliente está aguardando contrato em QUALQUER pipe, vale para todos os cards dele.
  const contratoPorCliente = {};
  atuais.forEach(c => { if (aguardandoContrato_(c)) contratoPorCliente[c.id] = true; });
  const semContrato = c => !!contratoPorCliente[c.id];

  const M = modelo_(atuais.filter(c => c.pipe === 'Concierge'),
                    atuais.filter(c => c.pipe === 'Gestor'),
                    canceladoCliente, semContrato);

  const conc = atuais.filter(c => c.pipe === 'Concierge');
  const gest = atuais.filter(c => c.pipe === 'Gestor');
  const ctr  = todos.filter(c => c.pipe === 'Contratos');

  // ---- ADM: contratos ----
  const porEtapaCT = e => ctr.filter(c => c.etapa === e);
  const pendentes = ctr.filter(c => /Aguardando\s*assinatura/i.test(c.etapa))
    .sort((a, b) => (b.dias || 0) - (a.dias || 0));
  const assinados = ctr.filter(c => /Contrato\s*Assinado/i.test(c.etapa));
  const idsConc = {}; conc.forEach(c => idsConc[c.id] = c);
  const assinadosSemConcierge = assinados.filter(c => !idsConc[c.id] || !idsConc[c.id].resp);
  const adm = {
    total: ctr.length,
    conferencia: porEtapaCT('Conferência').length,
    vencidos: pendentes.filter(c => Number(c.dias) > 0).length,
    pendentes: pendentes.length,
    assinados: assinados.length,
    esperaMedia: pendentes.length
      ? Math.round(pendentes.reduce((a, c) => a + (Number(c.dias) || 0), 0) / pendentes.length) : null,
    semConcierge: assinadosSemConcierge.length,
    listaPendentes: pendentes.map(c => ({ id: c.id, cliente: c.cliente, dias: c.dias, tags: c.tags })),
    listaSemConcierge: assinadosSemConcierge.map(c => {
      const cc = idsConc[c.id];
      return { id: c.id, cliente: c.cliente, dias: c.dias, tags: c.tags,
               etapa: cc ? cc.etapa : 'Sem card na Concierge',
               dupla: cc && cc.dupla ? cc.dupla : 'Sem dupla' };
    })
  };

  // ---- Motivos de espera ----
  const estag = {};
  (analisarHistorico_(snaps).estagnados || []).forEach(e => estag[e.pipe + '#' + e.id] = true);
  const motivos = {};
  const motivoLista = {};
  M.onboarding.forEach(c => {
    const m = motivoEspera_(c, !!estag['Concierge#' + c.id], semContrato(c));
    motivos[m] = (motivos[m] || 0) + 1;
    (motivoLista[m] = motivoLista[m] || []).push(
      { id: c.id, cliente: c.cliente, etapa: c.etapa, dupla: c.dupla, dias: c.dias,
        tipo: tipoIA_(c), tags: String(c.tags || '') });
  });

  // ---- Progresso do onboarding ----
  const iEt = e => CFG.ETAPAS_C.indexOf(e);
  const prog = {
    total: M.nOnb,
    preOnboarding: M.nEntrada, fezOnboarding: M.nConstrucao + M.nProntos,
    emConstrucao: M.nConstrucao, agenteCriado: M.nProntos,
    emValidacao: M.nValidacao, ativos: M.nOngoing,
    cancelamento: 0, retencao: M.onboarding.filter(c => tem_(c, /cliente de retencao|retencao|retido/)).length
  };

  // ---- Tempo na carteira ----
  const tnc = tempoNaCarteira_(snaps, hoje);
  const temposC = conc.map(c => tnc['Concierge#' + c.id]).filter(Boolean);
  const janela = datas.length > 1
    ? Math.round((new Date(hoje).getTime() - new Date(datas[0]).getTime()) / 864e5) : 0;
  const parciais = temposC.filter(x => x.desdeInicio).length;
  const carteiraTempo = {
    media: temposC.length
      ? Math.round(temposC.reduce((a, x) => a + x.dias, 0) / temposC.length) : null,
    parcial: parciais, total: temposC.length, janela: janela,
    // Confiável só quando a maior parte da carteira entrou depois do 1º snapshot
    confiavel: temposC.length > 0 && parciais / temposC.length < 0.5
  };

  // ---- Faixas de idade pedidas pela diretoria ----
  const faixasDir = {
    faixas: CFG.FAIXAS.map(f => f[0]),
    linhas: M.duplas.map(d => ({
      dupla: d,
      valores: CFG.FAIXAS.map(f => M.onboarding.filter(c => c.dupla === d &&
        Number(c.dias) >= f[1] && Number(c.dias) <= f[2]).length)
    })),
    total: CFG.FAIXAS.map(f => M.onboarding.filter(c =>
      Number(c.dias) >= f[1] && Number(c.dias) <= f[2]).length)
  };

  // Carteira por dupla e etapa — os dois pipes, porque nem todo mundo aparece nos dois
  const montar = (cards, etapas) => {
    const ds = [...new Set(cards.map(c => c.dupla))].sort();
    return ds.map(d => ({
      dupla: d,
      total: cards.filter(c => c.dupla === d).length,
      etapas: etapas.map(e => cards.filter(c => c.dupla === d && c.etapa === e).length)
    }));
  };
  const carteira = montar(conc, CFG.ETAPAS_C);
  const carteiraG = montar(gest, CFG.ETAPAS_G);

  // Quentes: possibilidade de ativar nesta semana (os dois pipes)
  // Quem não assinou contrato não é candidato a ativar nesta semana.
  const quentes = atuais.filter(c => CFG.ETAPAS_QUENTES.indexOf(c.etapa) >= 0 && !semContrato(c))
    .sort((a, b) => (b.dias || 0) - (a.dias || 0));

  // Problema na BM
  const bm = atuais.filter(c => tem_(c, /problema[s]? na bm|problema[s]? de bm|sincroniza|meta/));

  // Cruzamento entre os dois pipes: quem existe num e não no outro
  const idsC = {}, idsG = {};
  conc.forEach(c => idsC[c.id] = c);
  gest.forEach(c => idsG[c.id] = c);
  const soGestor = gest.filter(c => !idsC[c.id] && !semContrato(c))
    .sort((a, b) => (b.dias || 0) - (a.dias || 0));
  const soConcierge = conc.filter(c => !idsG[c.id])
    .sort((a, b) => (b.dias || 0) - (a.dias || 0));
  const uniao = Object.assign({}, idsC, idsG);
  const distintos = Object.keys(uniao).length;
  // Em onboarding = ainda NÃO chegou em Ativo em nenhum dos dois pipes
  const emAtivo = {};
  conc.concat(gest).forEach(c => { if (CFG.MARCO_ATIVO.indexOf(c.etapa) >= 0) emAtivo[c.id] = true; });
  const emOnboarding = Object.keys(uniao).filter(id => !emAtivo[id]).length;
  const concluidos = distintos - emOnboarding;

  // Série semanal
  const serie = sem.map(r => ({
    semana: dataStr_(r[0]), dupla: nomeDupla_(r[2]),
    onb: Number(r[3]) || 0, valid: Number(r[4]) || 0, ativo: Number(r[5]) || 0,
    ativacoes: Number(r[6]) || 0, avancos: Number(r[7]) || 0, parados: Number(r[8]) || 0,
    quentes: Number(r[9]) || 0, cartIni: Number(r[10]) || 0, entradas: Number(r[11]) || 0,
    saidas: Number(r[12]) || 0, cartFim: Number(r[13]) || 0
  }));
  const ultimaSemana = serie.length
    ? serie.filter(x => x.semana === [...new Set(serie.map(y => y.semana))].sort().pop())
    : [];

  // Previsibilidade: últimas 5 semanas de ativações
  const semanas = [...new Set(serie.map(s => s.semana))].sort().slice(-5);
  const prev = {};
  [...new Set(serie.map(s => s.dupla))].forEach(d => {
    const v = semanas.map(w => serie
      .filter(s => s.semana === w && s.dupla === d)
      .reduce((a, s) => a + s.ativacoes, 0));
    prev[d] = estat_(v);
  });
  const prevGeral = estat_(semanas.map(w => serie
    .filter(s => s.semana === w).reduce((a, s) => a + s.ativacoes, 0)));

  const aMes = ativacoesMes_(snaps, todos.filter(c => !foraCliente[c.id]));

  const R = {
    data: hoje, datasDisponiveis: datas, diagSnap: diagSnap,
    idadeSnapshot: hoje ? Math.round((new Date().getTime() - new Date(hoje + 'T12:00:00').getTime()) / 864e5) : null, excluidos: excluidos,
    intervalo: intervalo,
    totais: {
      concierge: conc.length, gestor: gest.length,
      quentes: distintosDe_(quentes), bm: distintosDe_(bm), distintos: distintos,
      quentesCards: quentes.length, bmCards: bm.length,
      emOnboarding: M.nOnb, concluidos: M.nAtivados,
      naoResponde: distintosDe_(atuais.filter(c => tem_(c, /cliente nao responde|nao responde|sem retorno|silencio/))),
      aguardandoCliente: distintosDe_(atuais.filter(c => tem_(c, /aguardando cliente|aguardando retorno|pendente ativar/))),
      congelados: distintosDe_(atuais.filter(c => tem_(c, /projeto congelado|congelad|pausad/))),
      bloqueados: M.nAdm,
      semDono: distintosDe_(atuais.filter(c => !c.resp && !semContrato(c))),
      semDonoContrato: distintosDe_(atuais.filter(c => !c.resp && semContrato(c))),
      cancelados: Object.keys(canceladoCliente).length,
      canceladosCards: excluidos,
      teste: Object.keys(testeCliente).length,
      parceria: Object.keys(parceriaCliente).length,
      risco: distintosDe_(atuais.filter(c => tem_(c, RX_RISCO) && !jaEntregue_(c))),
      riscoAtivo: distintosDe_(atuais.filter(c => tem_(c, RX_RISCO) && jaEntregue_(c))),
      // ATENÇÃO: "Migração ClickUp" marca card importado do ClickUp na troca de CRM (jul/2026),
      // NÃO cliente vindo de plataforma antiga. Só "Cliente na plataforma legada" indica migração de cliente.
      migracaoCard: distintosDe_(conc.concat(gest).filter(c => tem_(c, /migracao/))),
      migracao: distintosDe_(conc.concat(gest).filter(c => tem_(c, /plataforma legada/)))
    },
    ativacoesMes: aMes,
    metas: metas_(snaps, [...new Set(conc.concat(gest).map(c => c.dupla))], aMes, foraCliente),
    porDupla: (function () {
      const base = resumoDuplas_(conc, gest, ultimaSemana, intervalo)
        .filter(p => duplaVisivel_(p.dupla));
      const rk = ranking_(conc);
      // estagSet precisa existir ANTES de calcular a média, senão motivoEspera_ nunca
      // devolve "fila interna" e a média sai zero.
      const estagSet = {};
      (analisarHistorico_(snaps).estagnados || []).forEach(e => estagSet[e.pipe + '#' + e.id] = 1);
      // média de "fila interna" entre as duplas, para o insight comparar em vez de repetir
      const duplasReais = M.duplas.filter(x => x !== 'Sem dupla' && x !== 'QA');
      const pcts = duplasReais.map(dd => {
        const cs = M.onboarding.filter(x => x.dupla === dd);
        if (!cs.length) return null;
        const f = cs.filter(x => motivoEspera_(x, !!estagSet['Concierge#' + x.id], semContrato(x)) ===
          'Fila interna — sem impedimento externo').length;
        return Math.round(f / cs.length * 100);
      }).filter(x => x != null);
      const mediaFila = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
      const prevLocal = {};
      const semanasL = [...new Set(serie.map(s => s.semana))].sort().slice(-5);
      [...new Set(serie.map(s => s.dupla))].forEach(dd => {
        prevLocal[dd] = estat_(semanasL.map(w => serie
          .filter(s => s.semana === w && s.dupla === dd)
          .reduce((a, s) => a + s.ativacoes, 0)));
      });
      return base.map(p => {
        // média das OUTRAS duplas em cada etapa, para comparar
        const refs = {};
        CFG.ETAPAS_C.forEach(e => {
          const v = conc.filter(x => x.dupla !== p.dupla && x.etapa === e)
            .map(x => Number(x.dias)).filter(x => !isNaN(x));
          if (v.length >= 3) refs[e] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
        });
        refs.__rank = rk;
        refs.__onb = M.onboarding;
        refs.__mediaFila = mediaFila;
        refs.__semContrato = semContrato;
        p.insights = insightsDupla_(p.dupla, conc, gest, estagSet, prevLocal[p.dupla],
                                    intervalo, p, refs);
        return p;
      });
    })(),
    modelo: { invariantes: M.invariantes, consistente: M.consistente },
    jornada: {
      niveis: M.NIVEIS, total: M.nBase,
      aguardandoContrato: M.nAdm,
      listaContrato: M.adm.map(c => ({ id: c.id, cliente: c.cliente, dupla: c.dupla,
        dias: c.dias, etapa: c.etapa })),
      emOnboarding: M.nOnb, naoFizeramOnb: M.nEntrada, construcao: M.nConstrucao,
      prontos: M.nProntos, validacao: M.nValidacao, ativos: M.nOngoing,
      ativoValidacao: M.nValidacao, ativoOngoing: M.nOngoing, ativados: M.nAtivados,
      soGestor: M.base.filter(c => c.fonte === 'Gestor').length,
      porNivel: M.NIVEIS.map((r, i) => ({ rot: r,
        aqui: M.base.filter(c => !c.contrato && c.nivel === i).length,
        chegaram: M.base.filter(c => !c.contrato && c.nivel >= i).length }))
    },
    conferencia: conferir_(jornada_(conc, gest, semContrato), todos, csvClientes),
    fonteCancelamento: fonteCancelamento,
    funil: funil_(conc),
    eventos: lerEventos_(),
    ritual: lerRitual_(),
    plano: planoAtivacao_(conc, gest, (lerRitual_() || {}).media),
    previsao: previsaoSemana_(snaps),
    janela5: janela_(snaps, CFG.JANELA_DIAS, CFG.JANELA_MIN),
    curvaAtiv: leituraCurva_(serie, semanas, 'ativacoes', 'A entrega'),
    curvaOnb: leituraCurva_(serie, semanas, 'onb', 'A entrada de onboardings'),
    sustentavel: sustentavel_(serie, semanas),
    ranking: ranking_(conc),
    hist: analisarHistorico_(snaps),
    adm: adm, motivos: motivos, motivoLista: motivoLista, prog: prog,
    carteiraTempo: carteiraTempo, faixasDir: faixasDir,
    retrocessos: retrocessos_(snaps),
    mensal: agruparMes_(serie),
    movimento: movimentoDetalhado_(snaps),
    producao: producaoSemana_(snaps),
    listaCancelados: (function () {
      // Onde o cancelamento aconteceu muda de quem é o problema:
      // antes da call de onboarding é ADM/venda; depois é implantação; depois da
      // entrega é produto ou expectativa.
      const ANTES_CALL = ['Entrada do Cliente', 'Pré-kickoff', 'Pré-call - BM', 'Form'];
      const POS_ENTREGA = ['Validação 7d', 'Validação 7 dias', 'Ativo'];
      const m = {};
      todos.forEach(c => {
        if (!canceladoCliente[c.id]) return;
        const x = csvClientes ? csvClientes[c.id] : null;
        const cur = m[c.id];
        // o Concierge manda; só usa o Gestor se não houver card lá
        if (cur && cur.pipe === 'Concierge') return;
        let fase;
        if (tem_(c, /aguardando assinatura/) ||
            ANTES_CALL.indexOf(c.etapa) >= 0) fase = 'ADM';
        else if (POS_ENTREGA.indexOf(c.etapa) >= 0) fase = 'Pós-entrega';
        else fase = 'Onboarding';
        m[c.id] = { id: c.id, cliente: c.cliente, etapa: c.etapa, dupla: c.dupla,
                    pipe: c.pipe, fase: fase,
                    status: x ? x.status : 'tag no card', fonte: x ? 'sistema' : 'tag' };
      });
      const L = Object.keys(m).map(k => m[k]);
      return { lista: L,
        adm: L.filter(c => c.fase === 'ADM'),
        onboarding: L.filter(c => c.fase === 'Onboarding'),
        pos: L.filter(c => c.fase === 'Pós-entrega') };
    })(),
    risco: (function () {
      const m = {};
      atuais.forEach(c => {
        if (!tem_(c, RX_RISCO)) return;
        // Entregue (tag Cliente Ativo ou etapa Ativo/Validação): saiu do pipe de
        // onboarding. O risco existe, mas não é assunto da dupla de implantação.
        if (jaEntregue_(c)) return;
        const t = txtTags_(c);
        const rot = /reclame aqui/.test(t) ? 'Reclame Aqui'
                  : /cliente em risco|cliente de retencao|risco/.test(t) ? 'Cliente em risco'
                  : 'Retido';
        if (!m[c.id] || m[c.id].pipe !== 'Concierge')
          m[c.id] = { id: c.id, cliente: c.cliente, dupla: c.dupla, pipe: c.pipe,
                      etapa: c.etapa, dias: c.dias, sinal: rot };
      });
      return Object.keys(m).map(k => m[k])
        .sort((a, b) => (b.dias || 0) - (a.dias || 0));
    })(),
    tagInconsistente: soUmPipe,
    semResponsavel: atuais.filter(c => !c.resp && !semContrato(c))
      .sort((a, b) => (b.dias || 0) - (a.dias || 0))
      .map(c => ({ id: c.id, cliente: c.cliente, pipe: c.pipe, etapa: c.etapa,
                   dias: c.dias, tags: c.tags })),
    semDupla: atuais.filter(c => c.dupla === 'Sem dupla')
      .map(c => ({ id: c.id, cliente: c.cliente, pipe: c.pipe, etapa: c.etapa,
                   resp: c.resp, contrato: semContrato(c) })),
    aguardandoContrato: atuais.filter(semContrato)
      .map(c => ({ id: c.id, cliente: c.cliente, pipe: c.pipe, etapa: c.etapa, resp: c.resp })),
    tempoC: tempoPorEtapa_(conc, CFG.ETAPAS_C),
    tempoG: tempoPorEtapa_(gest, CFG.ETAPAS_G),
    idade: idadeCarteira_(conc),
    ultimaSemana: ultimaSemana,
    etapasC: CFG.ETAPAS_C, carteira: carteira,
    etapasG: CFG.ETAPAS_G, carteiraG: carteiraG,
    quentes: quentes.slice(0, 40), bm: bm,
    soGestor: soGestor, soConcierge: soConcierge, distintos: distintos,
    serie: serie, semanas: semanas, prev: prev, prevGeral: prevGeral
  };
  R.resumo = resumoExec_(R, M);
  R.foco = focoSemana_(R, M);
  return R;
}

/** Um bloco por dupla: carteira, quentes, onboarding e cobertura. */
function resumoDuplas_(conc, gest, ultima, intervalo) {
  const duplas = [...new Set(conc.map(c => c.dupla).concat(gest.map(c => c.dupla)))].sort();
  return duplas.map(d => {
    const c = conc.filter(x => x.dupla === d);
    const g = gest.filter(x => x.dupla === d);
    const sem = ultima.filter(x => x.dupla === d)[0] || {};
    const quentes = distintosDe_(c.concat(g).filter(x =>
      CFG.ETAPAS_QUENTES.indexOf(x.etapa) >= 0 && !tem_(x, /aguardando assinatura/)));
    // Mesma definição do modelo: em onboarding = ainda não chegou em Validação nem Ativo
    const emOnb = c.filter(x => CFG.MARCO_ATIVO.indexOf(x.etapa) < 0 &&
                                CFG.MARCO_VALIDACAO.indexOf(x.etapa) < 0).length;
    const ativ = Number(sem.ativacoes) || 0;
    return {
      dupla: d,
      carteiraC: c.length, carteiraG: g.length,
      emOnboarding: emOnb,
      ativos: c.length - emOnb,
      quentes: quentes,
      onbSemana: Number(sem.onb) || 0,
      ativacoes: ativ,
      entradas: Number(sem.entradas) || 0,
      saidas: Number(sem.saidas) || 0,
      cartIni: Number(sem.cartIni) || 0,
      cartFim: Number(sem.cartFim) || 0,
      parados: Number(sem.parados) || 0,
      cobertura: (ativ && intervalo)
        ? Math.round(quentes / (ativ * 7 / intervalo) * 10) / 10 : null
    };
  });
}

/** Distribuição da carteira por tempo parado na etapa. */
function idadeCarteira_(cards) {
  const faixas = [
    { rot: 'até 7 dias', min: 0, max: 7 },
    { rot: '8 a 30', min: 8, max: 30 },
    { rot: '31 a 90', min: 31, max: 90 },
    { rot: 'mais de 90', min: 91, max: 99999 }
  ];
  const duplas = [...new Set(cards.map(c => c.dupla))].sort();
  return {
    faixas: faixas.map(f => f.rot),
    linhas: duplas.map(d => ({
      dupla: d,
      valores: faixas.map(f => cards.filter(c =>
        c.dupla === d && c.dias !== '' && c.dias !== null &&
        Number(c.dias) >= f.min && Number(c.dias) <= f.max).length)
    })),
    total: faixas.map(f => cards.filter(c =>
      c.dias !== '' && c.dias !== null &&
      Number(c.dias) >= f.min && Number(c.dias) <= f.max).length)
  };
}

/** Percorre TODOS os snapshots: transições por etapa e estagnação por card. */
function analisarHistorico_(snaps) {
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  const porData = {};
  datas.forEach(d => porData[d] = indexar_(snaps.filter(r => dataStr_(r[0]) === d)));

  const entrou = {}, saiu = {}, dur = {};
  const ch = c => c.pipe + ' · ' + c.etapa;
  for (let i = 1; i < datas.length; i++) {
    const A = porData[datas[i - 1]], B = porData[datas[i]];
    Object.keys(B).forEach(k => {
      const b = B[k], a = A[k];
      if (!conta_(b)) return;
      if (!a) { entrou[ch(b)] = (entrou[ch(b)] || 0) + 1; return; }
      if (a.etapa !== b.etapa) {
        entrou[ch(b)] = (entrou[ch(b)] || 0) + 1;
        saiu[ch(a)] = (saiu[ch(a)] || 0) + 1;
        const dias = Number(a.dias);
        if (!isNaN(dias)) { (dur[ch(a)] = dur[ch(a)] || []).push(dias); }
      }
    });
    Object.keys(A).forEach(k => {
      if (!B[k] && conta_(A[k])) saiu[ch(A[k])] = (saiu[ch(A[k])] || 0) + 1;
    });
  }

  // Há quantos snapshots seguidos o card está na mesma etapa
  const ult = porData[datas[datas.length - 1]] || {};
  const estagnados = [];
  Object.keys(ult).forEach(k => {
    const c = ult[k];
    if (!conta_(c)) return;
    let n = 0;
    for (let i = datas.length - 1; i > 0; i--) {
      const b = porData[datas[i]][k], a = porData[datas[i - 1]][k];
      if (!b || !a || a.etapa !== b.etapa) break;
      n++;
    }
    if (n >= (CFG.CICLOS_ESTAGNADO || 2)) estagnados.push({ pipe: c.pipe, id: c.id, cliente: c.cliente, etapa: c.etapa,
                                  dupla: c.dupla, dias: c.dias, tags: c.tags, ciclos: n });
  });
  estagnados.sort((a, b) => b.ciclos - a.ciclos || (b.dias || 0) - (a.dias || 0));

  const medias = {};
  Object.keys(dur).forEach(e => {
    const v = dur[e];
    medias[e] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  });

  const clientesEstag = {};
  estagnados.forEach(e => clientesEstag[e.id] = 1);
  return { entrou: entrou, saiu: saiu, mediaSaida: medias,
           estagnados: estagnados, estagnadosClientes: Object.keys(clientesEstag).length,
           comparacoes: datas.length - 1 };
}

/** Tempo médio parado, por etapa e por dupla (foto atual). */
function tempoPorEtapa_(cards, etapas) {
  const duplas = [...new Set(cards.map(c => c.dupla))].sort();
  const med = (arr) => {
    const v = arr.map(c => Number(c.dias)).filter(x => !isNaN(x));
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  return {
    etapas: etapas,
    linhas: duplas.map(d => ({
      dupla: d,
      valores: etapas.map(e => med(cards.filter(c => c.dupla === d && c.etapa === e)))
    })),
    total: etapas.map(e => med(cards.filter(c => c.etapa === e)))
  };
}

/** Nomes de quem entrou e saiu da carteira, por dupla, na última comparação. */
function movimentoDetalhado_(snaps) {
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  if (datas.length < 2) return {};
  const atual = datas[datas.length - 1];
  const ant = datas[datas.length - 2];
  const A = indexar_(snaps.filter(r => dataStr_(r[0]) === ant));
  const B = indexar_(snaps.filter(r => dataStr_(r[0]) === atual));
  const m = {};
  const D = d => m[d] = m[d] || { entraram: [], sairam: [], mudaramDupla: [] };

  Object.keys(B).forEach(k => {
    const b = B[k], a = A[k];
    if (!conta_(b)) return;
    const dp = b.dupla || 'Sem dupla';
    if (!a) { D(dp).entraram.push({ id: b.id, cliente: b.cliente, pipe: b.pipe, etapa: b.etapa }); return; }
    const da = a.dupla || 'Sem dupla';
    if (da !== dp) {
      D(dp).entraram.push({ id: b.id, cliente: b.cliente, pipe: b.pipe, etapa: b.etapa, de: da });
      D(da).sairam.push({ id: b.id, cliente: b.cliente, pipe: b.pipe, etapa: b.etapa, para: dp });
      D(dp).mudaramDupla.push({ id: b.id, cliente: b.cliente, de: da });
    }
  });
  Object.keys(A).forEach(k => {
    const a = A[k];
    if (!B[k] && conta_(a)) {
      D(a.dupla || 'Sem dupla').sairam.push(
        { id: a.id, cliente: a.cliente, pipe: a.pipe, etapa: a.etapa, motivo: 'saiu do pipe' });
    }
  });
  return m;
}

/** Produção da semana com dados reais de etapa e de tarefas concluídas. */
function producaoSemana_(snaps) {
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  if (datas.length < 2) return null;
  const atual = datas[datas.length - 1], ant = datas[datas.length - 2];
  const A = indexar_(snaps.filter(r => dataStr_(r[0]) === ant));
  const B = indexar_(snaps.filter(r => dataStr_(r[0]) === atual));

  const P = {};
  const D = d => P[d] = P[d] || { bm: 0, construcao: 0, ativacoes: 0, avancos: 0, tarefas: 0, parados: 0 };
  const BM = ['BM e Raio-X', 'Call Onboarding BM', 'Pré-call - BM'];
  Object.keys(B).forEach(k => {
    const b = B[k], a = A[k];
    if (!conta_(b) || !a) return;
    const d = b.dupla || 'Sem dupla';
    const tf = Number(b.tFeitas), ta = Number(a.tFeitas);
    if (!isNaN(tf) && !isNaN(ta) && tf > ta) D(d).tarefas += (tf - ta);
    if (a.etapa === b.etapa) { D(d).parados++; return; }
    D(d).avancos++;
    if (BM.indexOf(b.etapa) >= 0) D(d).bm++;
    if (CFG.MARCO_ONBOARDING.indexOf(b.etapa) >= 0) D(d).construcao++;
    if (CFG.MARCO_VALIDACAO.indexOf(b.etapa) >= 0 || CFG.MARCO_ATIVO.indexOf(b.etapa) >= 0) D(d).ativacoes++;
  });
  return { de: ant, ate: atual, duplas: P };
}

/**
 * Por que este cliente está parado? Prioridade do impedimento mais forte ao mais fraco.
 * A tag manda: quem tem tag de impedimento NUNCA cai em "fila interna" nem em
 * "aguardando formulário" — era esse o erro que jogava cliente no grupo errado.
 */
function motivoEspera_(c, estagnado, contrato) {
  const sit = situacao_(c);
  if (sit) return sit;
  if (contrato || aguardandoContrato_(c)) return 'Contrato não assinado';
  const semTarefa = Number(c.tFeitas) === 0 || c.tFeitas === '' || c.tFeitas === null;
  const inicial = ['Entrada do Cliente', 'Form', 'Pré-kickoff', 'Pré-call - BM'].indexOf(c.etapa) >= 0;
  if (inicial && semTarefa)  return 'Aguardando formulário ou dados';
  if (estagnado)             return 'Fila interna — sem impedimento externo';
  return 'Em andamento normal';
}

/** Motivos que dependem de terceiros — não se cobra esforço do time neles. */
function externo_(motivo) {
  return /Cancelamento|Contrato|BM|não responde|Aguardando retorno|Aguardando configura|Aguardando tráfego|congelado|migração/i
    .test(motivo || '');
}

/** Retrocesso de etapa = correção, reprovação ou volta atrás. */
function retrocessos_(snaps) {
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  const lista = [];
  for (let i = 1; i < datas.length; i++) {
    const A = indexar_(snaps.filter(r => dataStr_(r[0]) === datas[i - 1]));
    const B = indexar_(snaps.filter(r => dataStr_(r[0]) === datas[i]));
    Object.keys(B).forEach(k => {
      const b = B[k], a = A[k];
      if (!a || !conta_(b)) return;
      const et = b.pipe === 'Concierge' ? CFG.ETAPAS_C : CFG.ETAPAS_G;
      const ia = et.indexOf(a.etapa), ib = et.indexOf(b.etapa);
      if (ia >= 0 && ib >= 0 && ib < ia) {
        lista.push({ semana: datas[i], id: b.id, cliente: b.cliente, pipe: b.pipe,
                     dupla: b.dupla || 'Sem dupla', de: a.etapa, para: b.etapa,
                     validacao: CFG.MARCO_VALIDACAO.indexOf(a.etapa) >= 0 });
      }
    });
  }
  return lista.reverse();
}

/** Há quantos dias o cliente está na carteira (desde o primeiro snapshot em que apareceu). */
function tempoNaCarteira_(snaps, hoje) {
  const primeiro = {};
  snaps.forEach(r => {
    const k = r[1] + '#' + r[2], d = dataStr_(r[0]);
    if (!primeiro[k] || d < primeiro[k]) primeiro[k] = d;
  });
  const base = new Date(hoje).getTime();
  const inicioSerie = [...new Set(snaps.map(r => dataStr_(r[0])))].sort()[0];
  const res = {};
  Object.keys(primeiro).forEach(k => {
    res[k] = { dias: Math.round((base - new Date(primeiro[k]).getTime()) / 864e5),
               desdeInicio: primeiro[k] === inicioSerie };
  });
  return res;
}

/** Agrega a série semanal por mês. */
function agruparMes_(serie) {
  const m = {};
  serie.forEach(s => {
    const mes = String(s.semana).slice(0, 7);
    const k = mes + '|' + s.dupla;
    if (!m[k]) m[k] = { mes: mes, dupla: s.dupla, onb: 0, ativacoes: 0, entradas: 0, saidas: 0, avancos: 0 };
    m[k].onb += s.onb; m[k].ativacoes += s.ativacoes;
    m[k].entradas += s.entradas; m[k].saidas += s.saidas; m[k].avancos += s.avancos;
  });
  return Object.keys(m).sort().map(k => m[k]);
}

/** Conta CLIENTES distintos, não cards: o mesmo cliente existe nos dois pipes. */
function distintosDe_(cards) {
  const m = {};
  cards.forEach(c => m[c.id] = 1);
  return Object.keys(m).length;
}

/**
 * Leituras automáticas por dupla. Cada uma cita o número que a sustenta —
 * sem isso vira frase genérica e o time para de ler.
 */
function insightsDupla_(dupla, conc, gest, estagSet, prev, intervalo, resumo, refs) {
  // Base única: a carteira de onboarding do modelo. O pipe Concierge tem cards a mais
  // (ativados, contrato) e usar ele gera dois números para a mesma dupla.
  const c = (refs.__onb || conc).filter(x => x.dupla === dupla);
  const g = gest.filter(x => x.dupla === dupla);
  if (!c.length && !g.length) return [];
  const semContrato = refs.__semContrato || (() => false);
  const out = [];
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const iE = e => CFG.ETAPAS_C.indexOf(e);

  // ---- 1. O que está travando ----
  const mc = {};
  c.forEach(x => {
    const m = motivoEspera_(x, !!estagSet['Concierge#' + x.id], semContrato(x));
    if (m !== 'Em andamento normal') mc[m] = (mc[m] || 0) + 1;
  });
  const topM = Object.keys(mc).sort((a, b) => mc[b] - mc[a])[0];
  if (topM) {
    const n = mc[topM], p = pct(n, c.length);
    const externo = externo_(topM);
    // Se o motivo é o mesmo em todas as duplas, compara em vez de repetir a mesma frase
    const med = refs.__mediaFila;
    let comp = '';
    if (!externo && med != null) {
      const dif = p - med;
      comp = dif >= 8 ? ' É <b>' + dif + ' pontos acima</b> da média do time (' + med + '%) — a maior concentração.'
           : dif <= -8 ? ' É <b>' + Math.abs(dif) + ' pontos abaixo</b> da média do time (' + med + '%) — a menor do time.'
           : ' Está na média do time (' + med + '%), então é um problema da operação, não desta dupla.';
    }
    out.push({ t: externo ? 'trava' : 'gargalo', tit: 'O que está travando a carteira',
      txt: '<b>' + n + ' de ' + c.length + ' clientes (' + p + '%)</b> por <b>' + topM.toLowerCase() + '</b>.' +
        (externo ? ' Trava externa: precisa de cadência de cobrança, não de esforço.' : comp) });
  }

  // ---- 2. Gargalo de etapa ----
  let pior = null;
  CFG.ETAPAS_C.forEach(e => {
    if (CFG.MARCO_ATIVO.indexOf(e) >= 0) return;
    const q = c.filter(x => x.etapa === e);
    if (q.length < 3) return;
    const v = q.map(x => Number(x.dias)).filter(x => !isNaN(x));
    const med = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
    const score = q.length * Math.max(med, 1);
    if (!pior || score > pior.score) pior = { etapa: e, n: q.length, med: Math.round(med), score: score };
  });
  if (pior) {
    const ref = refs[pior.etapa];
    const comp = (ref != null && pior.med > ref * 1.4)
      ? ' A média das outras duplas nessa etapa é <b>' + ref + ' dias</b> — aqui está ' +
        Math.round(pior.med / ref * 10) / 10 + '× maior.'
      : '';
    out.push({ t: 'gargalo', tit: 'Onde a carteira entala',
      txt: '<b>' + pior.etapa + '</b> concentra ' + pior.n + ' clientes com média de <b>' +
        pior.med + ' dias</b> parados.' + comp +
        ' Destravar essa etapa move mais gente de uma vez do que qualquer outra ação.' });
  }

  // ---- 3. Envelhecimento ----
  const velhos = c.filter(x => Number(x.dias) > 90).length;
  if (velhos && pct(velhos, c.length) >= 20) {
    out.push({ t: 'trava', tit: 'Carteira envelhecida',
      txt: '<b>' + velhos + ' clientes (' + pct(velhos, c.length) + '%)</b> estão há mais de 90 dias na mesma etapa. ' +
        'Nessa faixa follow-up não funciona mais — precisa de retomada ativa ou decisão de encerrar.' });
  }

  // ---- 4. Conversão travada: muito quente, pouca ativação ----
  const q = resumo.quentes, at = resumo.ativacoes;
  if (q >= 10 && intervalo) {
    const ritmo = at * 7 / intervalo;
    if (ritmo < q / 8) {
      out.push({ t: 'gargalo', tit: 'Estoque quente sem escoar',
        txt: '<b>' + q + ' clientes prontos para ativar</b> e ritmo de ' +
          (Math.round(ritmo * 10) / 10) + ' ativação por semana. ' +
          'No passo atual leva mais de 8 semanas para escoar o que já está pronto.' });
    }
  }

  // ---- 5. Objetivo da próxima semana ----
  const alvo = (prev && prev.confiavel)
    ? prev.piso + ' a ' + prev.teto
    : (q ? Math.max(3, Math.round(q / 8)) + '' : null);
  const meta = [];
  if (alvo) meta.push('ativar <b>' + alvo + ' clientes</b>');
  if (mc['Fila interna — sem impedimento externo'])
    meta.push('mover os <b>' + mc['Fila interna — sem impedimento externo'] + '</b> parados sem impedimento externo');
  if (mc['Aguardando formulário ou dados'])
    meta.push('cobrar formulário de <b>' + mc['Aguardando formulário ou dados'] + '</b>');
  if (mc['Aguardando retorno do cliente'])
    meta.push('cobrar retorno de <b>' + mc['Aguardando retorno do cliente'] + '</b>');
  if (mc['Problema na BM'])
    meta.push('escalar <b>' + mc['Problema na BM'] + '</b> com problema de BM');
  if (meta.length) {
    out.push({ t: 'meta', tit: 'Objetivo da próxima semana',
      txt: meta.slice(0, 3).join(' · ').replace(/·([^·]*)$/, 'e$1') + '.' });
  }

  // ---- 6. Ponto forte: só se lidera de fato, com margem ----
  const rk = refs.__rank;
  if (rk) {
    const cand = [];
    if (rk.maisNova && rk.maisNova.dupla === dupla)
      cand.push('<b>' + rk.maisNova.valor + '% da carteira com menos de 15 dias</b> na etapa atual — ' +
        'a maior proporção entre as duplas (a segunda tem ' + rk.maisNova.segundo + '%).');
    if (rk.menosVelha && rk.menosVelha.dupla === dupla)
      cand.push('<b>apenas ' + rk.menosVelha.valor + '% da carteira acima de 90 dias</b> — ' +
        'a menor herança parada entre as duplas (a segunda tem ' + rk.menosVelha.segundo + '%).');
    if (rk.maisRapida && rk.maisRapida.dupla === dupla)
      cand.push('<b>média de ' + rk.maisRapida.valor + ' dias por etapa</b>, a mais baixa da operação ' +
        '(a segunda está em ' + rk.maisRapida.segundo + ' dias).');
    if (cand.length) out.push({ t: 'ok', tit: 'Ponto forte', txt: cand[0] });
    else {
      // Sem liderança com margem: destaca o melhor número da própria dupla
      const nova = pct(c.filter(x => Number(x.dias) <= 15).length, c.length);
      const velha = pct(c.filter(x => Number(x.dias) > 90).length, c.length);
      const ativ = resumo.ativacoes || 0;
      if (ativ >= 3)
        out.push({ t: 'ok', tit: 'Ponto forte',
          txt: '<b>' + ativ + ' ativações</b> no período — entrega acontecendo.' });
      else if (nova >= 30)
        out.push({ t: 'ok', tit: 'Ponto forte',
          txt: '<b>' + nova + '% da carteira</b> entrou na etapa atual nos últimos 15 dias — carteira em movimento.' });
      else if (velha <= 15)
        out.push({ t: 'ok', tit: 'Ponto forte',
          txt: 'Só <b>' + velha + '% da carteira</b> acima de 90 dias — pouca herança parada.' });
    }
  }
  return out;
}

/**
 * Funil cumulativo: quantos clientes JÁ CHEGARAM em cada nível.
 * Diferente da matriz, que mostra onde cada um está parado agora.
 */
function funil_(conc) {
  const NIVEIS = [
    { rot: 'Entrada do cliente',    etapas: ['Entrada do Cliente'] },
    { rot: 'Onboarding',            etapas: ['Pré-kickoff', 'Kickoff', 'BM e Raio-X', 'Imersão', 'Pré-call - BM', 'Call Onboarding BM', 'Call Secretária'] },
    { rot: 'Criação da IA',         etapas: ['Em criação da IA'] },
    { rot: 'Ativação da IA',        etapas: ['Pré-Ativação'] },
    { rot: 'Validação 7d',          etapas: ['Validação 7d'] },
    { rot: 'Onboarding finalizado', etapas: ['Ativo'] }
  ];
  const idx = e => CFG.ETAPAS_C.indexOf(e);
  const minIdx = n => Math.min.apply(null, n.etapas.map(idx).filter(x => x >= 0));

  const montar = cards => {
    const linhas = NIVEIS.map(n => {
      const piso = minIdx(n);
      return {
        rot: n.rot,
        chegaram: cards.filter(c => idx(c.etapa) >= piso).length,
        aqui: cards.filter(c => n.etapas.indexOf(c.etapa) >= 0).length
      };
    });
    const base = linhas[0].chegaram || 1;
    linhas.forEach((l, i) => {
      l.pctBase = Math.round(l.chegaram / base * 100);
      l.conv = i === 0 ? null
        : (linhas[i - 1].chegaram ? Math.round(l.chegaram / linhas[i - 1].chegaram * 100) : 0);
      l.perdeu = i === 0 ? 0 : linhas[i - 1].chegaram - l.chegaram;
    });
    return linhas;
  };

  const duplas = [...new Set(conc.map(c => c.dupla))].sort();
  const out = { global: montar(conc), porDupla: {} };
  duplas.forEach(d => out.porDupla[d] = montar(conc.filter(c => c.dupla === d)));

  // ---- Leituras automáticas ----
  const pior = L => {
    let p = null;
    for (let i = 1; i < L.length; i++) {
      if (!L[i - 1].chegaram) continue;
      if (!p || L[i].conv < p.conv)
        p = { conv: L[i].conv, perdeu: L[i].perdeu, de: L[i - 1].rot, para: L[i].rot,
              chegaram: L[i].chegaram, antes: L[i - 1].chegaram };
    }
    return p;
  };
  out.pior = { global: pior(out.global) };
  duplas.forEach(d => { if (conc.filter(c => c.dupla === d).length >= 8) out.pior[d] = pior(out.porDupla[d]); });

  // Duplas que travam na mesma passagem
  const reais = duplas.filter(d => out.pior[d] && d !== 'Sem dupla' && d !== 'QA');
  const grupos = {};
  reais.forEach(d => {
    const k = out.pior[d].de + ' → ' + out.pior[d].para;
    (grupos[k] = grupos[k] || []).push({ dupla: d, conv: out.pior[d].conv });
  });
  out.comparativo = Object.keys(grupos)
    .map(k => ({ passagem: k, duplas: grupos[k].sort((a, b) => a.conv - b.conv) }))
    .sort((a, b) => b.duplas.length - a.duplas.length);
  out.mesmoGargalo = out.comparativo.length && out.comparativo[0].duplas.length > 1;
  return out;
}

/**
 * Janela fixa (padrão 5 dias): compara o snapshot atual com o mais próximo de N dias atrás
 * e devolve os CLIENTES que ativaram e que fizeram onboarding, com nome — para conferência.
 */
function janela_(snaps, dias, minDias) {
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  if (datas.length < 2) return null;
  const alvoDias = dias || CFG.JANELA_DIAS;
  const min = (minDias == null) ? CFG.JANELA_MIN : minDias;
  const atual = datas[datas.length - 1];
  const idade = d => Math.round((new Date(atual).getTime() - new Date(d).getTime()) / 864e5);

  // 1ª escolha: entre os snapshots com idade mínima, o mais perto do alvo.
  let ref = null, melhor = Infinity;
  datas.forEach(d => {
    if (d === atual || idade(d) < min) return;
    const x = Math.abs(idade(d) - alvoDias);
    if (x < melhor) { melhor = x; ref = d; }
  });
  // 2ª escolha: nenhum snapshot velho o bastante — usa o mais antigo que existe.
  if (!ref) ref = datas[0] === atual ? null : datas[0];
  if (!ref) return null;

  const A = indexar_(snaps.filter(r => dataStr_(r[0]) === ref));
  const B = indexar_(snaps.filter(r => dataStr_(r[0]) === atual));
  const P = {};
  // Dois eventos distintos: entrar em Validação (a IA foi ao ar) e entrar em Ativo
  // (concluiu a validação e passou para Ongoing). Somar os dois esconde o que aconteceu.
  const D = d => P[d] = P[d] || { validacao: {}, ongoing: {}, onboardings: {} };

  Object.keys(B).forEach(k => {
    const b = B[k], a = A[k];
    if (!conta_(b) || !a || a.etapa === b.etapa) return;
    const d = b.dupla || 'Sem dupla';
    const reg = { id: b.id, cliente: b.cliente, pipe: b.pipe, de: a.etapa, para: b.etapa };
    if (CFG.MARCO_VALIDACAO.indexOf(b.etapa) >= 0) D(d).validacao[b.id] = reg;
    if (CFG.MARCO_ATIVO.indexOf(b.etapa) >= 0)     D(d).ongoing[b.id] = reg;
    if (CFG.MARCO_ONBOARDING.indexOf(b.etapa) >= 0) D(d).onboardings[b.id] = reg;
  });

  const out = { de: ref, ate: atual, duplas: {},
    diasReais: Math.round((new Date(atual).getTime() - new Date(ref).getTime()) / 864e5),
    todasAtivacoes: [], todosOnboardings: [], todasValidacoes: [], todosOngoing: [] };
  Object.keys(P).forEach(d => {
    const v = Object.keys(P[d].validacao).map(k => P[d].validacao[k]);
    const g = Object.keys(P[d].ongoing).map(k => P[d].ongoing[k]);
    const o = Object.keys(P[d].onboardings).map(k => P[d].onboardings[k]);
    out.duplas[d] = { validacao: v, ongoing: g, onboardings: o,
                      nValid: v.length, nOngoing: g.length,
                      nAtiv: v.length + g.length, nOnb: o.length,
                      ativacoes: v.concat(g) };
    v.concat(g).forEach(x => out.todasAtivacoes.push(Object.assign({ dupla: d }, x)));
    v.forEach(x => out.todasValidacoes.push(Object.assign({ dupla: d }, x)));
    g.forEach(x => out.todosOngoing.push(Object.assign({ dupla: d }, x)));
    o.forEach(x => out.todosOnboardings.push(Object.assign({ dupla: d }, x)));
  });
  return out;
}

/** Rankeia as duplas para que "ponto forte" só apareça quando houver liderança real. */
function ranking_(conc) {
  const duplas = [...new Set(conc.map(c => c.dupla))]
    .filter(d => d !== 'Sem dupla' && d !== 'QA' && conc.filter(c => c.dupla === d).length >= 8);
  const m = {};
  duplas.forEach(d => {
    const c = conc.filter(x => x.dupla === d);
    const nova = c.filter(x => Number(x.dias) <= 15).length / c.length * 100;
    const velha = c.filter(x => Number(x.dias) > 90).length / c.length * 100;
    const v = c.map(x => Number(x.dias)).filter(x => !isNaN(x));
    m[d] = { nova: Math.round(nova), velha: Math.round(velha),
             mediaDias: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null,
             carteira: c.length };
  });
  const lider = (campo, maior) => {
    const ord = duplas.slice().sort((a, b) => maior ? m[b][campo] - m[a][campo] : m[a][campo] - m[b][campo]);
    if (ord.length < 2) return null;
    const dif = Math.abs(m[ord[0]][campo] - m[ord[1]][campo]);
    return dif >= 8 ? { dupla: ord[0], valor: m[ord[0]][campo], segundo: m[ord[1]][campo], dif: dif } : null;
  };
  return { m: m, duplas: duplas,
           maisNova: lider('nova', true), menosVelha: lider('velha', false),
           maisRapida: lider('mediaDias', false) };
}

/** Leitura da curva: está subindo, caindo ou estável — e o que fazer. */
function leituraCurva_(serie, semanas, campo, rotulo) {
  if (semanas.length < 2) return null;
  const v = semanas.map(w => serie.filter(s => s.semana === w).reduce((a, s) => a + s[campo], 0));
  const ult = v[v.length - 1], ant = v[v.length - 2];
  const base = v.slice(0, -1);
  const media = base.reduce((a, b) => a + b, 0) / base.length;
  const varPct = media ? Math.round((ult - media) / media * 100) : 0;
  let dir, cor, txt;
  if (v.length < 3) {
    dir = 'inicial'; cor = 'meta';
    txt = 'Só há ' + v.length + ' leituras. A curva ainda não tem forma — a partir da terceira dá para dizer se sobe ou cai.';
  } else if (varPct >= 15) {
    dir = 'subindo'; cor = 'ok';
    txt = '<b>' + rotulo + ' subiu ' + varPct + '%</b> acima da média das semanas anteriores (' +
      ult + ' contra média de ' + Math.round(media) + '). Vale registrar o que mudou nesta semana — ' +
      'é o que se tenta repetir.';
  } else if (varPct <= -15) {
    dir = 'caindo'; cor = 'trava';
    txt = '<b>' + rotulo + ' caiu ' + Math.abs(varPct) + '%</b> em relação à média (' +
      ult + ' contra ' + Math.round(media) + '). Antes de cobrar volume, verifique se houve feriado, ' +
      'ausência ou trava externa concentrada no período.';
  } else {
    dir = 'estavel'; cor = 'meta';
    txt = '<b>' + rotulo + ' estável</b> em torno de ' + Math.round(media) + ' por leitura (última: ' + ult + '). ' +
      'Ritmo previsível é bom para promessa de prazo — para crescer, precisa de mudança de processo, não de esforço.';
  }
  return { dir: dir, cor: cor, txt: txt, ult: ult, media: Math.round(media), serie: v };
}

/** A esteira se sustenta? Compara o que entra com o que sai. */
function sustentavel_(serie, semanas) {
  if (semanas.length < 2) return null;
  const som = (w, c) => serie.filter(s => s.semana === w).reduce((a, s) => a + s[c], 0);
  const ent = semanas.reduce((a, w) => a + som(w, 'entradas'), 0);
  const sai = semanas.reduce((a, w) => a + som(w, 'ativacoes'), 0);
  const onb = semanas.reduce((a, w) => a + som(w, 'onb'), 0);
  let cor, txt;
  if (sai > ent * 1.2) {
    cor = 'trava';
    txt = 'No período, <b>saíram ' + sai + ' e entraram ' + ent + '</b>. A esteira está <b>consumindo estoque</b>: ' +
      'entrega mais do que recebe. É saudável enquanto houver carteira acumulada, mas tem prazo — ' +
      'quando o estoque acabar, a vazão cai para o ritmo de entrada.';
  } else if (ent > sai * 1.2) {
    cor = 'gargalo';
    txt = 'No período, <b>entraram ' + ent + ' e saíram ' + sai + '</b>. A carteira está <b>crescendo</b>: ' +
      'chega mais gente do que a esteira consegue entregar. Se persistir, o tempo de espera de cada cliente aumenta.';
  } else {
    cor = 'ok';
    txt = 'No período, <b>entraram ' + ent + ' e saíram ' + sai + '</b> — a esteira está <b>equilibrada</b>. ' +
      'Entrega no mesmo ritmo em que recebe, e a carteira não cresce nem encolhe.';
  }
  return { cor: cor, txt: txt, entradas: ent, saidas: sai, onboardings: onb };
}

/**
 * Resumo executivo. Deriva SÓ do modelo canônico e da janela de 5 dias.
 * Nenhum número aqui é recalculado — se aparecer divergência, é bug do modelo.
 */
function resumoExec_(d, M) {
  const L = [];
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  L.push({ tit: 'Onde estamos',
    txt: '<b>' + M.nOnb + ' clientes em onboarding</b>, <b>' + M.nAtivados + ' já ativados</b> ' +
      '(' + M.nValidacao + ' em validação e ' + M.nOngoing + ' em Ongoing) e <b>' + M.nAdm +
      '</b> aguardando contrato. Base de ' + M.nBase + ' clientes.' });

  if (d.janela5) {
    const na = d.janela5.todasAtivacoes.length, no = d.janela5.todosOnboardings.length;
    const dd = d.janela5.diasReais;
    L.push({ tit: 'Os últimos ' + dd + ' dias',
      txt: '<b>' + na + ' ativações</b> e <b>' + no + ' onboardings</b>. ' +
        (na > no ? 'Saiu mais gente da esteira do que entrou em construção.'
         : na < no ? 'Entrou mais em construção do que saiu ativado — a carteira cresceu.'
         : 'Entrada e saída no mesmo ritmo.') });
  }

  if (d.funil && d.funil.pior && d.funil.pior.global) {
    const p = d.funil.pior.global;
    L.push({ tit: 'Onde está o gargalo', cor: 'trava',
      txt: 'A pior passagem é <b>' + p.de + ' → ' + p.para + '</b>, com <b>' + p.conv +
        '% de conversão</b> e ' + p.perdeu + ' clientes retidos.' });
  }

  const mm = Object.keys(d.motivos || {}).sort((a, b) => d.motivos[b] - d.motivos[a])[0];
  if (mm) {
    const n = d.motivos[mm];
    const interno = /Fila interna|Sem motivo/i.test(mm);
    L.push({ tit: 'Por que estão parados', cor: interno ? 'trava' : 'gargalo',
      txt: '<b>' + n + ' dos ' + M.nOnb + ' em onboarding (' + pct(n, M.nOnb) + '%)</b> por <b>' +
        mm.toLowerCase() + '</b>. ' +
        (interno ? 'Sem impedimento externo registrado — depende de nós ou de registrar o motivo.'
                 : 'Depende de terceiros: exige cadência de cobrança.') });
  }

  // Sustentabilidade na MESMA janela do bloco acima, para não se contradizer
  if (d.janela5) {
    const na = d.janela5.todasAtivacoes.length, no = d.janela5.todosOnboardings.length;
    let cor, txt;
    if (na > no * 1.2) { cor = 'ok';
      txt = 'Nos últimos ' + d.janela5.diasReais + ' dias saíram <b>' + na + '</b> e entraram em construção <b>' + no +
        '</b>. A esteira está <b>escoando estoque</b> — sustentável enquanto houver carteira acumulada.'; }
    else if (no > na * 1.2) { cor = 'gargalo';
      txt = 'Nos últimos ' + d.janela5.diasReais + ' dias entraram <b>' + no + '</b> e saíram <b>' + na +
        '</b>. A carteira está <b>crescendo</b>: se persistir, o tempo de espera aumenta.'; }
    else { cor = 'ok';
      txt = 'Nos últimos ' + d.janela5.diasReais + ' dias entraram <b>' + no + '</b> e saíram <b>' + na +
        '</b> — a esteira está <b>equilibrada</b>.'; }
    L.push({ tit: 'A esteira se sustenta?', cor: cor, txt: txt });
  }

  const dd = M.porDupla.filter(p => p.dupla !== 'Sem dupla' && p.dupla !== 'QA' &&
                                    p.base > 10 && duplaVisivel_(p.dupla));
  if (dd.length) {
    L.push({ tit: 'Como está cada dupla', cor: 'meta',
      txt: dd.map(p => '<b>' + p.dupla + '</b>: ' + p.onboarding + ' em onboarding, ' +
        p.prontos + ' prontos, ' + p.ativados + ' ativados').join(' · ') + '.' });
  }

  const acoes = [];
  if (d.totais.semDono) acoes.push('atribuir os <b>' + d.totais.semDono + ' sem responsável</b>');
  if (d.totais.bm) acoes.push('escalar os <b>' + d.totais.bm + ' com problema de BM</b>');
  if (d.funil && d.funil.pior && d.funil.pior.global)
    acoes.push('atacar a passagem <b>' + d.funil.pior.global.de + ' → ' + d.funil.pior.global.para + '</b>');
  const velhos = d.faixasDir ? d.faixasDir.total[d.faixasDir.total.length - 1] : 0;
  if (velhos) acoes.push('decidir o destino dos <b>' + velhos + ' acima de 90 dias</b>');
  if (acoes.length) L.push({ tit: 'As três prioridades', cor: 'meta',
    txt: acoes.slice(0, 3).join(' · ') + '.' });
  return L;
}

/* ═══════════════ FUNÇÕES RESTAURADAS ═══════════════ */

/**
 * MODELO CANÔNICO — fonte única de todos os números do dashboard.
 * Populações mutuamente exclusivas: adm + onboarding + ativados = base.
 */
function modelo_(conc, gest, canceladoCliente, semContrato) {
  const MAPA_C = { 'Entrada do Cliente': 0, 'Pré-kickoff': 1, 'Kickoff': 1, 'BM e Raio-X': 1,
                   'Imersão': 1, 'Pré-call - BM': 1, 'Call Onboarding BM': 1,
                   'Call Secretária': 1, 'Em criação da IA': 2, 'Pré-Ativação': 3,
                   'Validação 7d': 4, 'Ativo': 5 };
  // Ativação no pipe do Gestor = IA no ar. Por isso entra no mesmo nível da
  // Validação 7 dias (entregue), e não em "pronto para ativar".
  const MAPA_G = { 'Entrada do Cliente': 0, 'Form': 1, 'Criação da IA': 2,
                   'Validação de QA': 2, 'QA': 2,
                   'Ativação': 4, 'Validação 7 dias': 4, 'Ativo': 5 };
  const NIVEIS = ['Entrada', 'Onboarding', 'Construção', 'Pronto para ativar',
                  'Ativo · IA no ar (Ativação e Validação 7 dias)', 'Ativo · Cliente em Ongoing'];

  const R = {};
  const por = (cards, mapa, fonte) => cards.forEach(c => {
    if (canceladoCliente[c.id]) return;
    const ex = R[c.id];
    if (ex && ex.fonte === 'Concierge' && fonte !== 'Concierge') {
      ex.tags += ' | ' + String(c.tags || '');
      ex.tagsRaw += ' | ' + String(c.tagsRaw || '');
      ex.etapaG = c.etapa;
      return;
    }
    R[c.id] = {
      id: c.id, cliente: c.cliente, dupla: c.dupla || 'Sem dupla',
      dias: (c.dias === '' || c.dias == null) ? null : Number(c.dias),
      tags: (ex ? ex.tags + ' | ' : '') + String(c.tags || ''),
      tagsRaw: (ex ? ex.tagsRaw + ' | ' : '') + String(c.tagsRaw || ''),
      nivel: mapa[c.etapa], etapa: c.etapa, fonte: fonte,
      etapaG: fonte === 'Gestor' ? c.etapa : (ex ? ex.etapaG : null),
      tFeitas: Number(c.tFeitas), tTotal: Number(c.tTotal), status: c.status
    };
  });
  por(conc, MAPA_C, 'Concierge');
  por(gest, MAPA_G, 'Gestor');

  const base = Object.keys(R).map(k => R[k]).filter(c => c.nivel != null);
  base.forEach(c => {
    c.contrato = !!semContrato(c);
    c.grupo = c.contrato ? 'adm' : (c.nivel >= 4 ? 'ativado' : 'onboarding');
  });

  const adm = base.filter(c => c.grupo === 'adm');
  const onb = base.filter(c => c.grupo === 'onboarding');
  const atv = base.filter(c => c.grupo === 'ativado');
  const emNivel = (arr, n) => arr.filter(c => c.nivel === n);
  const duplas = [...new Set(base.map(c => c.dupla))].sort();

  const M = {
    NIVEIS: NIVEIS, base: base, adm: adm, onboarding: onb, ativados: atv, duplas: duplas,
    nBase: base.length, nAdm: adm.length, nOnb: onb.length, nAtivados: atv.length,
    nEntrada: emNivel(onb, 0).length + emNivel(onb, 1).length,
    nConstrucao: emNivel(onb, 2).length,
    nProntos: emNivel(onb, 3).length,
    nValidacao: emNivel(atv, 4).length,
    nOngoing: emNivel(atv, 5).length,
    porDupla: duplas.map(d => ({
      dupla: d,
      base: base.filter(c => c.dupla === d).length,
      adm: adm.filter(c => c.dupla === d).length,
      onboarding: onb.filter(c => c.dupla === d).length,
      prontos: emNivel(onb, 3).filter(c => c.dupla === d).length,
      validacao: emNivel(atv, 4).filter(c => c.dupla === d).length,
      ongoing: emNivel(atv, 5).filter(c => c.dupla === d).length,
      ativados: atv.filter(c => c.dupla === d).length
    }))
  };

  M.invariantes = [
    { nome: 'adm + onboarding + ativados = base',
      ok: M.nAdm + M.nOnb + M.nAtivados === M.nBase,
      det: M.nAdm + ' + ' + M.nOnb + ' + ' + M.nAtivados + ' = ' +
           (M.nAdm + M.nOnb + M.nAtivados) + ' (base ' + M.nBase + ')' },
    { nome: 'níveis do onboarding somam a carteira',
      ok: M.nEntrada + M.nConstrucao + M.nProntos === M.nOnb,
      det: M.nEntrada + ' + ' + M.nConstrucao + ' + ' + M.nProntos + ' = ' +
           (M.nEntrada + M.nConstrucao + M.nProntos) + ' (onboarding ' + M.nOnb + ')' },
    { nome: 'validação + ongoing = ativados',
      ok: M.nValidacao + M.nOngoing === M.nAtivados,
      det: M.nValidacao + ' + ' + M.nOngoing + ' = ' + (M.nValidacao + M.nOngoing) +
           ' (ativados ' + M.nAtivados + ')' },
    { nome: 'soma das duplas = base',
      ok: M.porDupla.reduce((a, p) => a + p.base, 0) === M.nBase,
      det: M.porDupla.reduce((a, p) => a + p.base, 0) + ' vs ' + M.nBase },
    { nome: 'prontos por dupla = prontos no total',
      ok: M.porDupla.reduce((a, p) => a + p.prontos, 0) === M.nProntos,
      det: M.porDupla.reduce((a, p) => a + p.prontos, 0) + ' vs ' + M.nProntos }
  ];
  M.consistente = M.invariantes.every(i => i.ok);
  return M;
}

/** Camada de conferência: lê a exportação de clientes colada na aba. */
function lerCSVClientes_() {
  const fs = lerTodas_(CFG.COLAR_CSV).filter(f => f.valores.length >= 2);
  if (!fs.length) return null;
  if (fs.length > 1) {
    // Mais de uma planilha com exportação: junta tudo num mapa só.
    const tudo = {};
    fs.forEach(f => {
      const m = lerCSVBloco_(f.valores);
      if (m) Object.keys(m).forEach(k => { if (!tudo[k]) tudo[k] = m[k]; });
    });
    return Object.keys(tudo).length ? tudo : null;
  }
  return lerCSVBloco_(fs[0].valores);
}

function lerCSVBloco_(v) {
  if (v.length < 2) return null;
  const cab = v[0].map(x => String(x || '').trim().toLowerCase());
  const col = n => cab.indexOf(n);
  const cId = col('id_interno'), cNome = col('nome'), cSt = col('status_entrega'),
        cPipes = col('pipelines'), cEt = col('etapas_atuais'), cResp = col('responsaveis_pipelines'),
        cVenda = col('data_venda'), cCanc = col('cancelado_em');
  if (cId < 0 || cSt < 0) return null;

  const out = {};
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    const id = String(r[cId] || '').trim();
    if (!id) continue;
    const pipes = String(r[cPipes] || '').split('|').map(x => x.trim());
    const etapas = String(r[cEt] || '').split('|').map(x => x.trim());
    const resps = String(r[cResp] || '').split('|').map(x => x.trim());
    const m = {};
    pipes.forEach((p, k) => { if (p) m[p] = { etapa: etapas[k] || '', resp: resps[k] || '' }; });
    out[id] = { id: id, nome: String(r[cNome] || '').trim(), status: String(r[cSt] || '').trim(),
                pipes: m, venda: cVenda >= 0 ? String(r[cVenda] || '').slice(0, 10) : '',
                cancelado: cCanc >= 0 ? String(r[cCanc] || '').trim() : '' };
  }
  return out;
}

/** Compara o pipe com a exportação. Só reporta divergência. */
function conferir_(jornada, todosCards, csv) {
  if (!csv) return null;
  const idsPipe = {}; (jornada.lista || []).forEach(c => idsPipe[c.id] = c);
  const idsCsv = {};
  Object.keys(csv).forEach(k => {
    const c = csv[k];
    if (c.pipes['Concierge'] || c.pipes['Gestor IA']) idsCsv[k] = c;
  });
  const vivosCsv = Object.keys(idsCsv).filter(k =>
    ['cancelled', 'in_cancellation'].indexOf(idsCsv[k].status) < 0);

  const soPipe = [], soCsv = [], cancDiverg = [], etapaDiverg = [];
  Object.keys(idsPipe).forEach(id => {
    const c = idsCsv[id];
    if (!c) { soPipe.push({ id: id, cliente: idsPipe[id].cliente }); return; }
    if (['cancelled', 'in_cancellation'].indexOf(c.status) >= 0)
      cancDiverg.push({ id: id, cliente: c.nome || idsPipe[id].cliente,
        tipo: 'Cancelado no sistema, ativo no pipe', status: c.status });
    const eC = (c.pipes['Concierge'] || {}).etapa;
    const eP = idsPipe[id].etapa;
    if (eC && eP && eC !== eP && idsPipe[id].fonte === 'Concierge')
      etapaDiverg.push({ id: id, cliente: c.nome, pipe: eP, csv: eC });
  });
  vivosCsv.forEach(id => {
    if (!idsPipe[id]) {
      const c = idsCsv[id];
      soCsv.push({ id: id, cliente: c.nome, status: c.status,
        etapa: (c.pipes['Concierge'] || c.pipes['Gestor IA'] || {}).etapa || '—' });
    }
  });
  const semDup = {};
  todosCards.forEach(c => {
    if (!tem_(c, RX_CANCELADO)) return;
    const x = idsCsv[c.id];
    if (x && ['cancelled', 'in_cancellation'].indexOf(x.status) < 0)
      semDup[c.id] = { id: c.id, cliente: c.cliente, status: x.status };
  });

  return {
    totalPipe: (jornada.lista || []).length, totalCsv: vivosCsv.length,
    soPipe: soPipe, soCsv: soCsv, cancDiverg: cancDiverg, etapaDiverg: etapaDiverg,
    tagSemStatus: Object.keys(semDup).map(k => semDup[k]),
    bate: soPipe.length === 0 && soCsv.length === 0 && cancDiverg.length === 0
  };
}

/** Dez semanas do Ritual de Produto. Fonte manual, separada dos snapshots. */
const RITUAL_SEED = [
  ['2026-06-08','Ana + Bruno',7,5], ['2026-06-08','Gabi + Hugo',6,2], ['2026-06-08','Elisa + Fábio',1,5],
  ['2026-06-15','Ana + Bruno',6,2], ['2026-06-15','Gabi + Hugo',4,4], ['2026-06-15','Elisa + Fábio',1,2],
  ['2026-06-22','Ana + Bruno',3,2], ['2026-06-22','Gabi + Hugo',7,5], ['2026-06-22','Elisa + Fábio',2,8],
  ['2026-06-29','Ana + Bruno',3,3], ['2026-06-29','Gabi + Hugo',1,2], ['2026-06-29','Elisa + Fábio',2,0],
  ['2026-07-06','Ana + Bruno',5,3], ['2026-07-06','Gabi + Hugo',0,10],['2026-07-06','Elisa + Fábio',3,5],
  ['2026-07-13','Ana + Bruno',1,5], ['2026-07-13','Gabi + Hugo',0,9], ['2026-07-13','Elisa + Fábio',5,4],
  ['2026-07-20','Ana + Bruno',1,7], ['2026-07-20','Gabi + Hugo',0,10],['2026-07-20','Elisa + Fábio',4,6],
  ['2026-07-27','Ana + Bruno',5,4], ['2026-07-27','Gabi + Hugo',0,7], ['2026-07-27','Elisa + Fábio',7,6],
  ['2026-08-03','Ana + Bruno',2,2], ['2026-08-03','Gabi + Hugo',0,6], ['2026-08-03','Elisa + Fábio',3,4],
  ['2026-08-10','Ana + Bruno',4,5], ['2026-08-10','Gabi + Hugo',0,7], ['2026-08-10','Elisa + Fábio',3,4]
];

function lerRitual_() {
  let linhas = [];
  const vistos = {};
  lerTodas_(CFG.RITUAL).forEach(f => {
    f.valores.slice(1).filter(r => r[0]).forEach(r => {
      const l = { semana: dataStr_(r[0]), dupla: nomeDupla_(r[1]),
                  onb: Number(r[2]) || 0, ativ: Number(r[3]) || 0 };
      const k = l.semana + '|' + l.dupla;
      if (vistos[k]) return;          // mesma semana em duas planilhas: vale a primeira
      vistos[k] = 1;
      linhas.push(l);
    });
  });
  if (!linhas.length) return null;

  const semanas = [...new Set(linhas.map(l => l.semana))].sort();
  const duplas = [...new Set(linhas.map(l => l.dupla))].sort();
  const som = (w, d, c) => linhas
    .filter(l => l.semana === w && (!d || l.dupla === d))
    .reduce((a, l) => a + l[c], 0);

  const totAtiv = semanas.map(w => som(w, null, 'ativ'));
  const totOnb  = semanas.map(w => som(w, null, 'onb'));
  const media = totAtiv.reduce((a, b) => a + b, 0) / totAtiv.length;
  const dp = Math.sqrt(totAtiv.reduce((a, b) => a + (b - media) * (b - media), 0) / totAtiv.length);
  const metade = Math.floor(semanas.length / 2);
  const p1 = totAtiv.slice(0, metade).reduce((a, b) => a + b, 0) / metade;
  const p2 = totAtiv.slice(metade).reduce((a, b) => a + b, 0) / (totAtiv.length - metade);
  const varPct = p1 ? Math.round((p2 - p1) / p1 * 100) : 0;

  return {
    semanas: semanas, duplas: duplas, ativ: totAtiv, onb: totOnb,
    porDupla: duplas.map(d => ({ dupla: d,
      ativ: semanas.map(w => som(w, d, 'ativ')),
      onb: semanas.map(w => som(w, d, 'onb')),
      totalAtiv: semanas.reduce((a, w) => a + som(w, d, 'ativ'), 0),
      totalOnb: semanas.reduce((a, w) => a + som(w, d, 'onb'), 0) })),
    totalAtiv: totAtiv.reduce((a, b) => a + b, 0),
    totalOnb: totOnb.reduce((a, b) => a + b, 0),
    media: Math.round(media * 10) / 10,
    piso: Math.max(0, Math.round(media - dp)), teto: Math.round(media + dp),
    cv: media ? Math.round(dp / media * 100) : 0,
    min: Math.min.apply(null, totAtiv), max: Math.max.apply(null, totAtiv),
    mensal: Math.round(media * 4.33), varPct: varPct,
    p1: Math.round(p1 * 10) / 10, p2: Math.round(p2 * 10) / 10
  };
}

/** Plano de ativação: separa quem está pronto de quem está encalhado. */
function planoAtivacao_(conc, gest, ritmo) {
  const cards = conc.concat(gest).filter(c => CFG.ETAPAS_QUENTES.indexOf(c.etapa) >= 0);
  const porCliente = {};
  cards.forEach(c => {
    const cur = porCliente[c.id];
    const dias = Number(c.dias);
    if (!cur || (!isNaN(dias) && dias < cur.dias)) {
      porCliente[c.id] = { id: c.id, cliente: c.cliente, dupla: c.dupla, etapa: c.etapa,
                           pipe: c.pipe, dias: isNaN(dias) ? 9999 : dias,
                           tags: String(c.tags || ''), tagsRaw: String(c.tagsRaw || ''),
                           tFeitas: Number(c.tFeitas), tTotal: Number(c.tTotal) };
    }
  });
  cards.forEach(c => {
    if (porCliente[c.id]) {
      porCliente[c.id].tags += ' | ' + String(c.tags || '');
      porCliente[c.id].tagsRaw += ' | ' + String(c.tagsRaw || '');
    }
  });

  const lista = Object.keys(porCliente).map(k => porCliente[k]);

  const prontos = [], travados = [], encalhados = [];
  lista.forEach(c => {
    c.impedimento = situacao_(c);
    c.pct = (!isNaN(c.tTotal) && c.tTotal) ? Math.round(c.tFeitas / c.tTotal * 100) : null;
    if (c.impedimento) travados.push(c);
    else if (c.dias > 60) encalhados.push(c);
    else prontos.push(c);
  });
  prontos.sort((a, b) => (b.pct || 0) - (a.pct || 0) || b.dias - a.dias);
  travados.sort((a, b) => b.dias - a.dias);
  encalhados.sort((a, b) => b.dias - a.dias);

  const meta = Math.max(1, Math.round(ritmo || 14));
  const sel = prontos.slice(0, meta);
  const porDupla = {};
  sel.forEach(c => porDupla[c.dupla] = (porDupla[c.dupla] || 0) + 1);

  return { universo: lista.length, prontos: prontos, travados: travados, encalhados: encalhados,
           meta: meta, selecionados: sel, porDupla: porDupla, cobertura: prontos.length >= meta };
}

/** Previsto × realizado da semana, pelas tags de marcação. */
function previsaoSemana_(snaps) {
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  if (!datas.length) return null;
  const atual = datas[datas.length - 1];
  const dt = new Date(atual + 'T12:00:00');
  const seg = new Date(dt.getTime() - ((dt.getDay() + 6) % 7) * 864e5);
  const segStr = Utilities.formatDate(seg, 'America/Sao_Paulo', 'yyyy-MM-dd');
  const inicio = datas.filter(d => d >= segStr)[0];

  // Reconhece a tag em qualquer grafia: com/sem acento, maiúscula, ordem invertida.
  // "Ativação prevista próxima semana" contém "ativação prevista": antes de testar a
  // previsão desta semana, a frase da próxima é apagada do texto, senão o cliente
  // marcado para a semana que vem entraria na meta desta.
  const RX_PROX = /ativacao prevista[^a-z0-9]*(?:para a |pra |p )?proxima semana/g;
  const temProx = t => { RX_PROX.lastIndex = 0; return RX_PROX.test(norm_(t)); };
  const temPrev = t => { const n = norm_(t).replace(RX_PROX, ' ');
    return /go-live|go live|golive/.test(n) || n.indexOf('ativacao prevista') >= 0 || n.indexOf('previsto ativar') >= 0 ||
           n.indexOf('prevista ativar') >= 0 || n.indexOf('previsao de ativa') >= 0; };
  const temAtivo = t => RX_ATIVO.test(norm_(t));
  const temPend  = t => /pendente ativar|silencio/.test(norm_(t));
  const PREV = { test: temPrev }, ATV = { test: temAtivo }, PEND = { test: temPend };
  const porCliente = (idx) => {
    const m = {};
    Object.keys(idx).forEach(k => {
      const c = idx[k];
      if (foraDaConta_(c)) return;
      if (!m[c.id]) m[c.id] = { id: c.id, cliente: c.cliente, dupla: c.dupla, etapa: c.etapa, tags: '' };
      m[c.id].tags += ' | ' + String(c.tags || '') + ' | ' + String(c.tagsRaw || '');
      if (CFG.MARCO_ATIVO.indexOf(c.etapa) >= 0 ||
          CFG.MARCO_VALIDACAO.indexOf(c.etapa) >= 0) m[c.id].ativo = true;
    });
    return m;
  };
  const fimIdx = porCliente(indexar_(snaps.filter(r => dataStr_(r[0]) === atual)));

  // contador direto no snapshot atual
  const noSnapshot = { prevista: 0, ativo: 0, pendente: 0, porDupla: {} };
  Object.keys(fimIdx).forEach(id => {
    const c = fimIdx[id], t = String(c.tags || ''), d = c.dupla || 'Sem dupla';
    const P = noSnapshot.porDupla[d] = noSnapshot.porDupla[d] || { prevista: 0, ativo: 0, pendente: 0 };
    if (PREV.test(t)) { noSnapshot.prevista++; P.prevista++; }
    if (ATV.test(t))  { noSnapshot.ativo++;    P.ativo++; }
    if (PEND.test(t)) { noSnapshot.pendente++; P.pendente++; }
  });

  // SEMPRE monta a lista de quem está marcado no snapshot mais recente.
  // Isso não depende de comparação: é a foto de hoje.
  const marcadosHoje = Object.keys(fimIdx)
    .filter(id => temPrev(fimIdx[id].tags))
    .map(id => ({ id: id, cliente: fimIdx[id].cliente, dupla: fimIdx[id].dupla || 'Sem dupla',
                  etapa: fimIdx[id].etapa, tipo: tipoIA_({ tags: fimIdx[id].tags }),
                  jaAtivo: temAtivo(fimIdx[id].tags) || !!fimIdx[id].ativo,
                  pendente: temPend(fimIdx[id].tags),
                  tags: String(fimIdx[id].tags || '').split('|')
                          .map(t => t.trim()).filter(t => t && t !== '—')
                          .filter((t, i, a) => a.indexOf(t) === i).join(' · ') }))
    .sort((a, b) => (a.dupla + a.cliente).localeCompare(b.dupla + b.cliente));

  const porDuplaHoje = {};
  marcadosHoje.forEach(c => {
    const x = porDuplaHoje[c.dupla] = porDuplaHoje[c.dupla] || { dupla: c.dupla, total: 0, ativos: 0, pend: 0 };
    x.total++; if (c.jaAtivo) x.ativos++; if (c.pendente) x.pend++;
  });
  // Planejamento da semana que vem: quem já está marcado com a tag da próxima semana.
  const proxima = Object.keys(fimIdx)
    .filter(id => temProx(fimIdx[id].tags) && !temPrev(fimIdx[id].tags))
    .map(id => ({ id: id, cliente: fimIdx[id].cliente, dupla: fimIdx[id].dupla || 'Sem dupla',
                  etapa: fimIdx[id].etapa, tipo: tipoIA_({ tags: fimIdx[id].tags }),
                  jaAtivo: !!fimIdx[id].ativo }))
    .sort((a, b) => (a.dupla + a.cliente).localeCompare(b.dupla + b.cliente));
  const porDuplaProx = {};
  proxima.forEach(c => porDuplaProx[c.dupla] = (porDuplaProx[c.dupla] || 0) + 1);

  const hoje = { data: atual, lista: marcadosHoje, total: marcadosHoje.length,
                 porDupla: Object.keys(porDuplaHoje).sort().map(k => porDuplaHoje[k]),
                 proxima: proxima, totalProxima: proxima.length,
                 porDuplaProxima: Object.keys(porDuplaProx).sort()
                   .map(k => ({ dupla: k, total: porDuplaProx[k] })) };

  if (!inicio || inicio === atual) {
    return { semanaDe: segStr, semanaAte: atual, semBase: true, noSnapshot: noSnapshot,
             hoje: hoje, tagsVistas: {}, snapsSemana: datas.filter(d => d >= segStr).length,
             previstos: 0, cumpridos: [], abertos: [], travados: [], perdidos: [],
             surpresas: [], listaDuplas: [] };
  }

  const ini = porCliente(indexar_(snaps.filter(r => dataStr_(r[0]) === inicio)));
  const fim = fimIdx;

  const dasSemana = datas.filter(d => d >= segStr);
  const marcados = {};
  dasSemana.forEach(dd => {
    const idx = indexar_(snaps.filter(r => dataStr_(r[0]) === dd));
    Object.keys(idx).forEach(k => {
      if (PREV.test(String(idx[k].tags || '') + ' ' + String(idx[k].tagsRaw || '')))
        marcados[idx[k].id] = true;
    });
  });
  Object.keys(marcados).forEach(id => { if (!ini[id] && fim[id]) ini[id] = fim[id]; });
  const previstos = Object.keys(marcados).filter(id => ini[id] || fim[id]);

  const cumpridos = [], abertos = [], travados = [], perdidos = [];
  previstos.forEach(id => {
    const f = fim[id];
    const reg = { id: id, cliente: (ini[id] || f).cliente, dupla: (ini[id] || f).dupla,
                  etapa: f ? f.etapa : '—' };
    if (!f) { perdidos.push(Object.assign({ motivo: 'saiu da carteira' }, reg)); return; }
    if (ATV.test(f.tags) || f.ativo) { cumpridos.push(reg); return; }
    if (PEND.test(f.tags)) { travados.push(reg); return; }
    if (PREV.test(f.tags)) { abertos.push(reg); return; }
    perdidos.push(Object.assign({ motivo: 'tag removida sem ativar' }, reg));
  });

  const surpresas = Object.keys(fim).filter(id =>
    (ATV.test(fim[id].tags) || fim[id].ativo) &&
    !(ini[id] && (ATV.test(ini[id].tags) || ini[id].ativo)) &&
    previstos.indexOf(id) < 0
  ).map(id => ({ id: id, cliente: fim[id].cliente, dupla: fim[id].dupla, etapa: fim[id].etapa }));

  const acerto = previstos.length ? Math.round(cumpridos.length / previstos.length * 100) : null;
  const porDupla = {};
  const D = d => porDupla[d] = porDupla[d] || { dupla: d, prev: 0, ok: 0,
    abertos: [], travados: [], perdidos: [], surpresas: [], cumpridos: [] };
  previstos.forEach(id => D((ini[id] || fim[id]).dupla || 'Sem dupla').prev++);
  cumpridos.forEach(c => { const x = D(c.dupla || 'Sem dupla'); x.ok++; x.cumpridos.push(c); });
  abertos.forEach(c => D(c.dupla || 'Sem dupla').abertos.push(c));
  travados.forEach(c => D(c.dupla || 'Sem dupla').travados.push(c));
  perdidos.forEach(c => D(c.dupla || 'Sem dupla').perdidos.push(c));
  surpresas.forEach(c => D(c.dupla || 'Sem dupla').surpresas.push(c));
  Object.keys(porDupla).forEach(k => {
    const x = porDupla[k];
    x.acerto = x.prev ? Math.round(x.ok / x.prev * 100) : null;
    x.entregou = x.ok + x.surpresas.length;
  });

  const amostraTags = {};
  Object.keys(fim).forEach(id => {
    String(fim[id].tags || '').split('|').forEach(t => {
      t = t.trim();
      if (t && /prevista|cliente ativo|pendente/i.test(t)) amostraTags[t] = (amostraTags[t] || 0) + 1;
    });
  });

  return { semanaDe: inicio, semanaAte: atual, semBase: false, hoje: hoje,
           tagsVistas: amostraTags, snapsSemana: dasSemana.length, noSnapshot: noSnapshot,
           previstos: previstos.length, cumpridos: cumpridos, abertos: abertos,
           travados: travados, perdidos: perdidos, surpresas: surpresas,
           acerto: acerto, porDupla: porDupla,
           listaDuplas: Object.keys(porDupla).sort().map(k => porDupla[k]) };
}

/** Mantido por compatibilidade: o objeto jornada é montado em getDados a partir do modelo. */
function jornada_(conc, gest, semContrato) {
  return { lista: [], total: 0 };
}


/**
 * FOCO DA SEMANA — o que cada dupla precisa fazer e o que a liderança acompanha.
 * Tudo derivado dos dados desta leitura; nenhuma meta é arbitrada.
 */
function focoSemana_(d, M) {
  const prev = (d.previsao && d.previsao.hoje) ? d.previsao.hoje : { lista: [], total: 0, porDupla: [] };
  const ritmo = (d.ritual && d.ritual.media) ? d.ritual.media : null;
  const ml = d.motivoLista || {};
  const porDupla = (dp, chave) => (ml[chave] || []).filter(c => c.dupla === dp);
  const plano = d.plano || { travados: [], encalhados: [] };

  // ---- Foco geral do time ----
  const geral = [];
  if (prev.total && ritmo) {
    const dif = prev.total - Math.round(ritmo);
    geral.push({
      tit: 'A meta da semana',
      txt: 'O time marcou <b>' + prev.total + ' clientes</b> para ativar. O ritmo histórico é de <b>' +
        ritmo + ' por semana</b>. ' +
        (dif > 3 ? 'Acima do ritmo.' : dif < -3 ? 'Abaixo do ritmo — faltou marcação ou a carteira esfriou.'
         : 'Meta realista.')
    });
  } else if (!prev.total) {
    geral.push({ tit: 'Sem previsão marcada', cor: 'trava',
      txt: 'Nenhum cliente com <b>Go-live</b>. Sem marcação não há meta nem medição.' });
  }

  if (d.funil && d.funil.pior && d.funil.pior.global) {
    const p = d.funil.pior.global;
    geral.push({ tit: 'Onde atacar primeiro', cor: 'gargalo',
      txt: '<b>' + p.de + ' → ' + p.para + '</b> converte <b>' + p.conv + '%</b> e retém ' +
        p.perdeu + ' clientes. Maior alavanca da semana.' });
  }

  const semDono = d.totais.semDono || 0;
  const bmN = d.totais.bm || 0;
  if (semDono || bmN) {
    const it = [];
    if (semDono) it.push('<b>' + semDono + '</b> sem responsável');
    if (bmN) it.push('<b>' + bmN + '</b> com problema de BM');
    geral.push({ tit: 'O que não pode ficar para a próxima', cor: 'trava',
      txt: it.join(' e ') + '. Dependem de decisão, não de esforço.' });
  }

  // ---- Por dupla ----
  const duplas = M.porDupla
    .filter(p => p.dupla !== 'Sem dupla' && p.dupla !== 'QA' && p.base > 10 &&
                 duplaVisivel_(p.dupla))
    .map(p => {
      const dp = p.dupla;
      const meus = prev.lista.filter(c => c.dupla === dp);
      const form = porDupla(dp, 'Aguardando formulário ou dados');
      const fila = porDupla(dp, 'Fila interna — sem impedimento externo');
      const aguard = porDupla(dp, 'Aguardando retorno do cliente');
      const trav = plano.travados.filter(c => c.dupla === dp);
      const enc = plano.encalhados.filter(c => c.dupla === dp);

      const acoes = [];
      if (meus.length)
        acoes.push({ tipo: 'meta', txt: 'Ativar <b>' + meus.length + '</b>: ' +
          meus.slice(0, 3).map(c => c.cliente).join(', ') +
          (meus.length > 3 ? ' +' + (meus.length - 3) : '') });
      else
        acoes.push({ tipo: 'trava', txt: 'Marcar a previsão da semana — nenhum cliente com a tag.' });

      if (form.length)
        acoes.push({ tipo: 'gargalo', txt: 'Cobrar formulário de <b>' + form.length + '</b>: ' +
          form.slice(0, 3).map(c => c.cliente).join(', ') +
          (form.length > 3 ? ' +' + (form.length - 3) : '') });

      if (aguard.length)
        acoes.push({ tipo: 'gargalo', txt: 'Cobrar retorno de <b>' + aguard.length + '</b>: ' +
          aguard.slice(0, 3).map(c => c.cliente).join(', ') +
          (aguard.length > 3 ? ' +' + (aguard.length - 3) : '') });

      if (trav.length) {
        const porImp = {};
        trav.forEach(c => porImp[c.impedimento] = (porImp[c.impedimento] || 0) + 1);
        acoes.push({ tipo: 'trava', txt: 'Escalar <b>' + trav.length + '</b>: ' +
          Object.keys(porImp).map(k => k.toLowerCase() + ' (' + porImp[k] + ')').join(', ') });
      }

      if (enc.length)
        acoes.push({ tipo: 'gargalo', txt: 'Decidir sobre <b>' + enc.length + '</b> encalhados há +60 dias.' });
      if (fila.length >= 10)
        acoes.push({ tipo: 'trava', txt: 'Registrar o motivo de <b>' + fila.length + '</b> parados.' });

      const risco = (ritmo && meus.length && meus.length > Math.round(ritmo))
        ? 'Marcou mais do que o time inteiro entrega por semana.'
        : (p.prontos >= 15 && meus.length <= 2)
        ? p.prontos + ' prontos na etapa e só ' + meus.length + ' marcados.'
        : null;

      return { dupla: dp, acoes: acoes.slice(0, 3), marcados: meus.length, prontos: p.prontos,
               onboarding: p.onboarding, risco: risco };
    });

  // ---- O que a liderança acompanha ----
  const acompanhar = [];
  acompanhar.push({ ind: 'Previstos que ativaram',
    hoje: (d.previsao && d.previsao.acerto != null) ? d.previsao.acerto + '%' : '—', alvo: '> 70%' });
  acompanhar.push({ ind: 'Sem responsável', hoje: String(semDono), alvo: 'zero' });
  if (d.funil && d.funil.pior && d.funil.pior.global)
    acompanhar.push({ ind: 'Conversão ' + d.funil.pior.global.de + ' → ' + d.funil.pior.global.para,
      hoje: d.funil.pior.global.conv + '%', alvo: 'subir' });

  return { geral: geral.slice(0, 2), duplas: duplas, acompanhar: acompanhar,
           totalMarcado: prev.total, ritmo: ritmo };
}

/** A dupla ainda existe? Usado para não mostrar bloco de quem saiu da empresa. */
function duplaVisivel_(d) {
  return (CFG.DUPLAS_OCULTAS || []).indexOf(String(d || '').trim()) < 0;
}

/**
 * Data de ativação de cada cliente: o PRIMEIRO snapshot em que ele aparece em
 * Validação 7 dias, em qualquer pipe. Se pulou direto para Ativo entre duas
 * leituras, vale a primeira vez em Ativo, porque ele passou pela validação no meio.
 * Quem já estava em Validação ou Ativo na primeira leitura do histórico não tem
 * data conhecida — fica de fora e é contado à parte.
 */
function datasAtivacao_(snaps) {
  const marcos = CFG.MARCO_VALIDACAO.concat(CFG.MARCO_ATIVO);
  const prim = {};
  snaps.forEach(r => {
    if (marcos.indexOf(r[4]) < 0) return;
    let d = dataStr_(r[0]);
    const id = r[2];
    // O snapshot só vê o cliente no dia da leitura. Em Validação, os dias na etapa
    // dizem quando ele entrou de fato: leitura do dia 13 com 6 dias na etapa = dia 7.
    const dias = Number(r[7]);
    if (CFG.MARCO_VALIDACAO.indexOf(r[4]) >= 0 && r[7] !== '' && r[7] != null &&
        !isNaN(dias) && dias > 0 && dias < 60) {
      const t = new Date(d + 'T12:00:00').getTime() - dias * 864e5;
      d = Utilities.formatDate(new Date(t), 'America/Sao_Paulo', 'yyyy-MM-dd');
    }
    if (!prim[id] || d < prim[id].data)
      prim[id] = { id: id, cliente: r[3], dupla: nomeDupla_(r[6]) || 'Sem dupla',
                   data: d, mes: d.slice(0, 7) };
  });
  return prim;
}

/**
 * Ativações do mês: cliente que ENTROU em Validação 7 dias dentro do mês e está
 * com a tag Cliente Ativo. Passar de Validação para Ativo é ida para Ongoing,
 * não ativação, e não conta aqui.
 */
function ativacoesMes_(snaps, cardsHoje) {
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  if (!datas.length) return null;
  const hoje = datas[datas.length - 1];
  const mes = hoje.slice(0, 7);
  const prim = datasAtivacao_(snaps);
  const marcos = CFG.MARCO_VALIDACAO.concat(CFG.MARCO_ATIVO);

  // Estado de hoje, por cliente: tag em qualquer card, etapa entregue em algum card.
  const hojeCli = {};
  cardsHoje.forEach(c => {
    const x = hojeCli[c.id] = hojeCli[c.id] ||
      { id: c.id, cliente: c.cliente, dupla: c.dupla, pipe: c.pipe, tag: false, entregue: false };
    if (tem_(c, RX_ATIVO)) x.tag = true;
    if (marcos.indexOf(c.etapa) >= 0) x.entregue = true;
    if (c.pipe === 'Concierge') { x.dupla = c.dupla; x.pipe = c.pipe; x.cliente = c.cliente; }
  });

  const lista = [];
  let semHistorico = 0, semTag = 0;
  Object.keys(hojeCli).forEach(id => {
    const h = hojeCli[id], p = prim[id];
    if (!p || !h.entregue) return;
    if (p.mes !== mes) return;
    if (p.data === datas[0]) { semHistorico++; return; }
    if (!h.tag) { semTag++; return; }
    lista.push({ id: id, cliente: h.cliente, dupla: h.dupla || 'Sem dupla',
                 pipe: h.pipe, data: p.data });
  });
  lista.sort((a, b) => a.data.localeCompare(b.data) || a.cliente.localeCompare(b.cliente));

  const porDupla = {};
  lista.forEach(c => porDupla[c.dupla] = (porDupla[c.dupla] || 0) + 1);
  const ocultas = Object.keys(porDupla).filter(k => !duplaVisivel_(k));
  const nOcultas = ocultas.reduce((a, k) => a + porDupla[k], 0);
  const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho',
                 'agosto','setembro','outubro','novembro','dezembro'];
  return { mes: mes, rotulo: MESES[Number(mes.slice(5, 7)) - 1] + ' de ' + mes.slice(0, 4),
           total: lista.length, lista: lista,
           porDupla: Object.keys(porDupla).filter(duplaVisivel_).sort()
             .map(k => ({ dupla: k, n: porDupla[k] })),
           ocultas: nOcultas, nomesOcultos: ocultas,
           semHistorico: semHistorico, semTag: semTag, desde: datas[0] };
}

/* ─────────────────────────── METAS DO PILOTO ─────────────────────────── */

/**
 * Cohort de ativação: em que mês cada cliente entrou em Ativo, e de quem ele era.
 * É a base das três metas — sem saber quem ativou no mês, não dá para medir
 * taxa de resposta do CSAT nem ajuste pós-ativação.
 */
function cohortes_(snaps) {
  const prim = datasAtivacao_(snaps);
  const porMes = {};
  Object.keys(prim).forEach(id => {
    const c = prim[id];
    (porMes[c.mes] = porMes[c.mes] || []).push(c);
  });
  return { porCliente: prim, porMes: porMes };
}

/**
 * Traduz o cabeçalho escrito à mão para os campos que o cálculo usa.
 * Assim "Nome do cliente", "cliente" e "clinica" chegam todos como cliente.
 */
function campoMeta_(c) {
  const n = norm_(c);
  // "Submitted At" é o nome que o formulário de aceite usa para a data da resposta.
  if (/^(data|dia|quando)|carimbo|timestamp|submitted|enviad|respondid|data\/hora|data e hora/.test(n))
    return 'data';
  if (/^(id|id do card|card|codigo|cod|numero|n do card)\b/.test(n)) return 'id';
  // Nota antes de cliente: pergunta de formulário como "Como você avalia a clínica"
  // tem a palavra clínica e não pode virar nome de cliente.
  if (/(nota|csat|avalia|satisf|score|estrela|de 1 a 5|1 a 5)/.test(n)) return 'nota';
  if (/(status|situacao|convers)/.test(n)) return 'status';
  if (/(tipo|motivo|categoria|assunto)/.test(n)) return 'tipo';
  if (/(indicad|lead|prospect)/.test(n)) return 'indicado';
  if (/(dupla|responsavel|concierge|gestor)/.test(n)) return 'dupla';
  if (/json|^respostas/.test(n)) return 'json';
  if (/(e-mail|email)/.test(n)) return 'email';
  if (/(telefone|celular|whatsapp|phone)/.test(n)) return 'telefone';
  if (/(cliente|clinica|medico|doutor|nome)/.test(n)) return 'cliente';
  if (/(descri|detalhe|o que|pedido)/.test(n)) return 'descricao';
  return n;
}

/**
 * Lê uma aba de meta como lista de objetos. Aceita vários nomes de aba e
 * cabeçalho escrito de qualquer jeito — ver campoMeta_.
 */
function lerMeta_(nomes) {
  const lista = [].concat(nomes);
  for (let k = 0; k < lista.length; k++) {
    const v = ler_(SpreadsheetApp.getActive(), lista[k]);
    if (v.length < 2) continue;
    const cab = v[0].map(campoMeta_);
    const original = v[0].map(x => norm_(x));
    let iData = cab.indexOf('data');
    // Sem cabeçalho de data reconhecido: usa a primeira coluna que tem cara de data.
    if (iData < 0 && v.length > 1) {
      iData = v[1].findIndex(c => c instanceof Date ||
        /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}/.test(String(c || '').trim()));
    }
    return v.slice(1).filter(r => r.some(c => String(c || '').trim())).map(r => {
      const o = { aba: lista[k] };
      cab.forEach((c, i) => { if (c && o[c] === undefined) o[c] = r[i]; });
      original.forEach((c, i) => { if (c) o['_' + c] = r[i]; });
      o.data = dataStr_(r[iData >= 0 ? iData : 0]);
      o.mes = String(o.data || '').slice(0, 7);
      // Coluna de id escrita como "#1234" ou "ID 5081" vira só o número, senão
      // não casa com o id do snapshot.
      if (String(o.id || '').trim()) {
        // "442e7516-dba1-..." é o id da RESPOSTA do formulário, não do card do
        // cliente. Só vale como id de card se for só o número, com # ou "ID" antes.
        const mm = String(o.id).trim().match(/^(?:#|id\s*)?\s*(\d{3,6})$/i);
        o.id = mm ? mm[1] : '';
      }
      // Formulário novo: as respostas vêm numa coluna só, em JSON.
      // implementation_rating é a nota de 1 a 5 da ativação; phone vira telefone.
      if (o.json && /^\s*\{/.test(String(o.json))) {
        try {
          const j = JSON.parse(String(o.json));
          o.respostas = j;
          // Duas versões do formulário convivem na mesma aba: a nova (versão 1) dá a
          // nota em implementation_rating, a antiga (versão 0) em satisfaction_rating.
          if (o.nota === undefined || o.nota === '' || o.nota === null) {
            o.nota = (j.implementation_rating != null) ? j.implementation_rating
                   : (j.satisfaction_rating != null) ? j.satisfaction_rating : '';
          }
          if (!o.telefone && j.phone) o.telefone = j.phone;
        } catch (e) { o.jsonInvalido = true; }
      }
      // Ticket copiado do Cockpit traz o id dentro do título, não numa coluna própria.
      // Sem id não dá para saber de quem é nem se foi pedido depois da ativação.
      if (!String(o.id || '').trim()) {
        for (let i = 0; i < r.length && !o.id; i++) {
          if (i === iData || r[i] instanceof Date) continue;
          const t = String(r[i] || '');
          const m = t.match(/#\s?(\d{3,6})\b/) || t.match(/^\s*(\d{3,6})\s*[-–—|:]/);
          if (m) o.id = m[1];
        }
      }
      return o;
    });
  }
  return [];
}

/**
 * As três metas do piloto, por dupla, no mês da leitura.
 * CSAT e ajustes são medidos contra o COHORT do mês: quem ativou naquele mês.
 * Indicação é contada pela data do registro, não pela ativação.
 */
function metas_(snaps, duplasAtivas, ativMes, fora) {
  fora = fora || {};
  const conta = x => !fora[String(x.id || '').trim()];
  const datas = [...new Set(snaps.map(r => dataStr_(r[0])))].sort();
  if (!datas.length) return null;
  const mes = datas[datas.length - 1].slice(0, 7);
  const coh = cohortes_(snaps);
  // O denominador é o MESMO número que a carteira mostra em "Ativações do mês":
  // entrou em Ativo no mês e está com a tag Cliente Ativo. Usar outra régua aqui
  // fazia a aba Metas divergir do painel.
  const doMes = (ativMes && ativMes.lista) ? ativMes.lista : (coh.porMes[mes] || []);

  // Resposta de formulário raramente traz o id do card. Sem id, procura o cliente
  // pelo nome entre os ativados: igual, ou um nome contendo o outro, desde que só
  // um cliente case — se dois casarem, fica sem dono, para não atribuir errado.
  const nomesAtiv = Object.keys(coh.porCliente).map(id =>
    ({ id: id, n: chaveAjuste_(coh.porCliente[id].cliente) })).filter(x => x.n.length >= 4);
  const LIGA = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, dr: 1, dra: 1 };
  const palavras = t => chaveAjuste_(t).split(' ').filter(w => w.length > 1 && !LIGA[w]);
  const idPorNome = nome => {
    const n = chaveAjuste_(nome);
    if (n.length < 4) return '';
    const igual = nomesAtiv.filter(x => x.n === n);
    if (igual.length === 1) return igual[0].id;
    const contem = nomesAtiv.filter(x => x.n.indexOf(n) >= 0 || n.indexOf(x.n) >= 0);
    if (contem.length === 1) return contem[0].id;
    // Todas as palavras do nome curto aparecem no nome longo, com pelo menos duas
    // palavras: "Júlio Oliveira" casa com "Júlio de Oliveira Santos".
    const pn = palavras(nome);
    if (pn.length < 2) return '';
    const porPalavra = nomesAtiv.filter(x => {
      const px = palavras(x.n);
      const [curto, longo] = pn.length <= px.length ? [pn, px] : [px, pn];
      return curto.length >= 2 && curto.every(w => longo.indexOf(w) >= 0);
    });
    return porPalavra.length === 1 ? porPalavra[0].id : '';
  };
  const csatLido = lerMeta_(CFG.META_CSAT);
  const csatSemData = csatLido.filter(x => !/^\d{4}-\d{2}$/.test(x.mes)).length;
  // A aba recebe mais de um formulário. CSAT é o do aceite da ativação: linha com
  // "Tipo de formulário" preenchido e diferente disso fica de fora.
  const ehAceite = x => !String(x.tipo || '').trim() ||
    /aceite|ativa|activation|acceptance/i.test(String(x.tipo));
  const csatBruto = csatLido.filter(x => x.mes === mes && ehAceite(x));
  // Quem respondeu: primeiro pelo e-mail, depois pelo telefone, cruzando com a
  // exportação de clientes; só no fim pelo nome, que é o mais frágil.
  const contatos = { email: {}, tel: {} };
  (function () {
    const v = ler_(SpreadsheetApp.getActive(), CFG.COLAR_CSV);
    if (v.length < 2) return;
    const cab = v[0].map(x => norm_(x));
    const cI = cab.indexOf('id_interno'), cE = cab.indexOf('email'), cT = cab.indexOf('telefone');
    v.slice(1).forEach(r => {
      const id = String(r[cI] || '').trim();
      if (!id) return;
      if (cE >= 0 && r[cE]) contatos.email[norm_(r[cE])] = id;
      if (cT >= 0 && r[cT]) {
        const dg = String(r[cT]).replace(/\D/g, '');
        if (dg.length >= 8) contatos.tel[dg.slice(-8)] = id;
      }
    });
  })();
  const idPorContato = x => {
    const e = norm_(x.email);
    if (e && contatos.email[e]) return contatos.email[e];
    const dg = String(x.telefone || '').replace(/\D/g, '');
    if (dg.length >= 8 && contatos.tel[dg.slice(-8)]) return contatos.tel[dg.slice(-8)];
    return '';
  };
  csatBruto.forEach(x => {
    if (String(x.id || '').trim()) return;
    x.id = idPorContato(x) || idPorNome(x.cliente);
  });
  const csat = csatBruto.filter(conta);
  const ind  = lerMeta_(CFG.META_IND).filter(x => x.mes === mes);
  const ajuTodos = lerMeta_(CFG.META_AJU).filter(conta);
  const aju  = ajuTodos.filter(x => x.mes === mes);

  // De onde sai a dupla de um registro, nesta ordem: o nome da dupla escrito na linha;
  // o nome de UMA pessoa, traduzido pela aba Config; e, se nada disso, o id do card,
  // que encontra o dono pelo cohort de ativação.
  // Dono de HOJE, pela última leitura, com o card da Concierge mandando. Cliente
  // que trocou de dupla depois de ativar conta para quem cuida dele agora.
  const ult = datas[datas.length - 1];
  const donoHoje = {};
  snaps.forEach(r => {
    if (dataStr_(r[0]) !== ult) return;
    const id = String(r[2]).trim(), dp = nomeDupla_(r[6]) || 'Sem dupla';
    const cur = donoHoje[id];
    if (!cur || (r[1] === 'Concierge' && dp !== 'Sem dupla') ||
        (cur.dupla === 'Sem dupla' && dp !== 'Sem dupla'))
      donoHoje[id] = { dupla: dp, pipe: r[1] };
  });
  const idsCohort = {};
  doMes.forEach(c => idsCohort[String(c.id).trim()] = 1);
  const mapa = mapaDuplas_();
  const dupla = x => {
    const bruto = String(x.dupla || '').trim();
    const porNome = nomeDupla_(bruto);
    if (porNome && mapa[bruto]) return nomeDupla_(mapa[bruto]);
    if (porNome && /\+/.test(porNome) && (CFG.DUPLAS_PILOTO || []).indexOf(porNome) >= 0)
      return porNome;
    const idx = String(x.id || '').trim();
    const hoje = donoHoje[idx] && donoHoje[idx].dupla !== 'Sem dupla' ? donoHoje[idx].dupla : '';
    if (hoje) return hoje;
    const porId = (coh.porCliente[idx] || {}).dupla;
    if (porId) return porId;
    return porNome || 'Sem dupla';
  };
  const colNota = CFG.CSAT_NOTA ? '_' + norm_(CFG.CSAT_NOTA) : null;
  const nota = x => Number(String((colNota ? x[colNota] : x.nota) || '').replace(',', '.'));
  const convertida = x => /convertid|ganho|fechad/i.test(String(x.status || ''));

  // Lista fechada, definida em CFG.DUPLAS_PILOTO. Nome de pessoa solta ou dupla
  // desfeita não vira linha — aparece no diagnóstico de órfãos, lá embaixo.
  const nomes = (CFG.DUPLAS_PILOTO || []).filter(duplaVisivel_);

  const linhas = nomes.map(d => {
    const ativados = doMes.filter(c => c.dupla === d);
    const ids = {}; ativados.forEach(c => ids[String(c.id).trim()] = 1);
    // Respondeu = mandou o formulário, mesmo sem marcar a nota. A nota média e os
    // detratores usam só quem deu nota.
    const respTodas = csat.filter(x => dupla(x) === d);
    const resp = respTodas.filter(x => String(x.nota == null ? '' : x.nota).trim() !== '' &&
                                       !isNaN(nota(x)));
    const notas = resp.map(nota);
    const det = notas.filter(n => n <= 3).length;
    const indD = ind.filter(x => dupla(x) === d);
    const conv = indD.filter(convertida).length;
    // Ajuste conta para a dupla dona do cliente. Se o registro não disser de quem é
    // e o id não bater com nenhum cohort, ele fica fora — melhor faltar do que mentir.
    // Só ajuste PÓS-ativação: a data do ajuste precisa ser igual ou posterior ao dia
    // em que o cliente entrou em Ativo. Pedido antes disso é construção, não retrabalho.
    const posAtivacao = x => {
      const a = coh.porCliente[String(x.id || '').trim()];
      return !!a && String(x.data || '') >= a.data;
    };
    // Cruzamento com o cohort: só clientes que ATIVARAM NESTE MÊS por esta dupla, e
    // só o que pediram DEPOIS da ativação. Cliente de mês anterior não entra aqui —
    // senão a conta mistura a qualidade de entregas antigas com a de agora.
    const ajuD = ajuTodos.filter(x => ids[String(x.id || '').trim()] && posAtivacao(x));
    const porCli = {};
    ajuD.forEach(x => { const k = String(x.id || x.cliente || '').trim();
                        if (k) porCli[k] = (porCli[k] || 0) + 1; });

    return {
      dupla: d,
      ativados: ativados.length,
      respostas: respTodas.length,
      comNota: resp.length,
      taxa: ativados.length ? Math.round(respTodas.length / ativados.length * 100) : null,
      nota: notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length * 100) / 100 : null,
      detratores: notas.length ? Math.round(det / notas.length * 100) : null,
      nDetratores: det,
      indicacoes: indD.length,
      convertidas: conv,
      comissao: conv * CFG.METAS.comissao,
      ajustes: ajuD.length,
      clientesComAjuste: Object.keys(porCli).length,
      // Quem é cada ativado, para abrir na seta: se respondeu o CSAT e quantos
      // ajustes pós-ativação pediu no mês.
      listaAtivados: ativados.map(c => {
        const id = String(c.id || '').trim();
        const r = respTodas.filter(x => String(x.id || '').trim() === id ||
          (!x.id && norm_(x.cliente) && norm_(x.cliente) === norm_(c.cliente)))[0];
        return { id: id, cliente: c.cliente, data: c.data,
                 nota: r ? (isNaN(nota(r)) || String(r.nota).trim() === '' ? 'sem nota' : nota(r)) : null,
                 ajustes: ajuD.filter(x => String(x.id || '').trim() === id).length };
      }).sort((a, b) => String(a.data).localeCompare(String(b.data))),
      ajustePorAtivado: ativados.length ? Math.round(ajuD.length / ativados.length * 10) / 10 : null
    };
  });

  const som = c => linhas.reduce((a, l) => a + (l[c] || 0), 0);
  const todasNotas = csat.map(nota).filter(n => !isNaN(n));
  return {
    mes: mes, metas: CFG.METAS, linhas: linhas,
    semRegistro: { csat: !csat.length, ind: !ind.length, aju: !aju.length },
    // Diagnóstico: linhas que existem na aba mas não entraram em nenhuma dupla.
    orfaos: {
      aju: ajuTodos.filter(x => {
          const id = String(x.id || '').trim();
          if (!id) return x.mes === mes;                 // sem id: não dá para cruzar
          if (!idsCohort[id]) return false;               // outro mês: não é órfão
          const a = coh.porCliente[id];
          return !(a && String(x.data || '') >= a.data);  // do cohort, mas antes de ativar
        })
        .map(x => {
          const a = coh.porCliente[String(x.id || '').trim()];
          return { data: x.data, cliente: x.cliente || '', id: x.id || '',
                   dupla: String(x.dupla || ''),
                   motivo: !String(x.id || '').trim() ? 'sem id do card, não dá para cruzar'
                         : !a ? 'cliente sem data de ativação'
                         : 'pedido antes da ativação (' + a.data + ')' };
        }).slice(0, 15),
      ajuTotal: aju.length,
      ajuOutrosMeses: aju.filter(x => {
        const id = String(x.id || '').trim();
        return id && !idsCohort[id];
      }).length,
      ajuLidas: ajuTodos.length,
      ajuSemId: ajuTodos.filter(x => !String(x.id || '').trim()).length,
      ajuMeses: [...new Set(ajuTodos.map(x => x.mes))].filter(Boolean).sort().slice(-4),
      csat: csat.filter(x => nomes.indexOf(dupla(x)) < 0).length,
      csatLista: csat.filter(x => nomes.indexOf(dupla(x)) < 0)
        .map(x => ({ data: x.data, cliente: String(x.cliente || ''), id: String(x.id || ''),
                     nota: String(x.nota == null ? '' : x.nota) || 'sem nota',
                     motivo: !String(x.id || '').trim()
                       ? 'e-mail, telefone e nome não batem com um único cliente'
                       : 'cliente fora das três duplas' })).slice(0, 20),
      csatTotal: csat.length,
      csatSemData: csatSemData,
      csatLidas: csatLido.length,
      ind: ind.filter(x => nomes.indexOf(dupla(x)) < 0).length
    },
    total: {
      ativados: som('ativados'), respostas: som('respostas'),
      taxa: som('ativados') ? Math.round(som('respostas') / som('ativados') * 100) : null,
      nota: todasNotas.length
        ? Math.round(todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length * 100) / 100 : null,
      detratores: todasNotas.length
        ? Math.round(todasNotas.filter(n => n <= 3).length / todasNotas.length * 100) : null,
      indicacoes: som('indicacoes'), convertidas: som('convertidas'),
      comissao: som('comissao'), ajustes: som('ajustes')
    },
    placar: linhas.slice().sort((a, b) =>
      b.convertidas - a.convertidas || b.indicacoes - a.indicacoes)
  };
}

/** Texto sem acento, caixa e pontuação — usado para casar nome de cliente. */
function chaveAjuste_(t) {
  return norm_(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
/** Costura nomes antigos de dupla aos atuais, para a série não quebrar na troca de pessoa. */
function nomeDupla_(n) {
  const x = String(n || '').trim();
  return (CFG.RENOMEAR && CFG.RENOMEAR[x]) ? CFG.RENOMEAR[x] : x;
}

/** Eventos de equipe: ausência, saída, redistribuição. Contexto para ler os números. */
function lerEventos_() {
  let L = [];
  lerTodas_(CFG.EVENTOS).forEach(f => {
    L = L.concat(f.valores.slice(1).filter(r => r[0]).map(r => ({
      data: dataStr_(r[0]), tipo: String(r[1] || '').trim(),
      quem: String(r[2] || '').trim(), descricao: String(r[3] || '').trim()
    })));
  });
  const vistos = {};
  return L.filter(e => {
    const k = e.data + '|' + e.tipo + '|' + e.quem;
    if (vistos[k]) return false;
    vistos[k] = 1; return true;
  }).sort((a, b) => b.data.localeCompare(a.data));
}

function estat_(v) {
  if (!v.length) return { media: 0, min: 0, max: 0, cv: 0, serie: [], confiavel: false };
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const dp = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length);
  return {
    media: Math.round(m * 10) / 10, min: Math.min(...v), max: Math.max(...v),
    piso: Math.max(0, Math.round(m - dp)), teto: Math.round(m + dp),
    cv: m ? Math.round(dp / m * 100) : 0, serie: v,
    confiavel: v.length >= 3
  };
}

/* ─────────────────────────── SETUP ─────────────────────────── */

function criarAbas() {
  const ss = SpreadsheetApp.getActive();
  const criar = (nome, cab) => {
    let a = ss.getSheetByName(nome);
    if (!a) a = ss.insertSheet(nome);
    if (cab && a.getLastRow() === 0) {
      a.getRange(1, 1, 1, cab.length).setValues([cab])
        .setFontWeight('bold').setBackground('#0D1117').setFontColor('#00CFFF');
      a.setFrozenRows(1);
    }
    return a;
  };

  criar(CFG.COLAR_C);
  criar(CFG.COLAR_G);
  criar(CFG.COLAR_CT);
  criar(CFG.COLAR_CSV);
  const ev = criar(CFG.EVENTOS, ['data','tipo','quem','descricao']);
  if (ev.getLastRow() === 1) {
    ev.getRange(2, 1, 5, 4).setValues([
      ['2026-08-31','Desligamento','Hugo Alves','Carteira transferida para Igor Mendes'],
      ['2026-08-31','Mudança de função','Igor Mendes','Saiu do QA e virou Gestor de IA, dupla com Gabi'],
      ['2026-08-31','Ausência','Fábio Prado','Afastamento pessoal; demandas divididas com o time'],
      ['2026-10-01','Desligamento','Gabi Torres','Carteira transferida para Carla'],
      ['2026-10-01','Entrada','Carla','Assumiu a carteira da Gabi, dupla com Igor Mendes']
    ]);
    ev.getRange(2, 1, 5, 1).setNumberFormat('@');
  }
  const existeAba = nomes => [].concat(nomes).some(n => ss.getSheetByName(n));
  const primeiro = nomes => [].concat(nomes)[0];
  if (!existeAba(CFG.META_AJU)) {
    const ma0 = criar(primeiro(CFG.META_AJU), ['data','id','cliente','dupla','tipo','descricao']);
    ma0.getRange(2, 1, 1, 1).setNumberFormat('@');
  }
  const mc = existeAba(CFG.META_CSAT) ? ss.getSheetByName([].concat(CFG.META_CSAT)
      .filter(n => ss.getSheetByName(n))[0])
    : criar(primeiro(CFG.META_CSAT), ['data','id','cliente','dupla','nota','comentario']);
  if (mc.getLastRow() === 1) {
    mc.getRange(2, 1, 1, 6).setValues([
      ['2026-10-10','5097','Dra. Helena Silva de Oliveira','Carla + Davi',5,'exemplo — apague esta linha']]);
    mc.getRange(2, 1, 1, 1).setNumberFormat('@');
  }
  const mi = existeAba(CFG.META_IND) ? ss.getSheetByName([].concat(CFG.META_IND)
      .filter(n => ss.getSheetByName(n))[0])
    : criar(primeiro(CFG.META_IND), ['data','dupla','indicado','especialidade','canal',
                                     'cliente_origem','status','data_conversao']);
  if (mi.getLastRow() === 1) {
    mi.getRange(2, 1, 1, 8).setValues([
      ['2026-10-10','Carla + Davi','Dr. Exemplo','Dermatologia','QR Code',
       'Dra. Helena Silva de Oliveira','registrada','']]);
    mi.getRange(2, 1, 1, 1).setNumberFormat('@');
  }
  criar(CFG.SNAP, CAB_SNAP);
  migrarSnapshots_();
  criar(CFG.SEMANAL, CAB_SEMANAL);
  migrarSemanal_();

  const cfg = criar(CFG.CONFIG, ['Concierge','Gestor de IA','Nome da dupla']);
  if (cfg.getLastRow() === 1) {
    cfg.getRange(2, 1, 3, 3).setValues([
      ['Elisa Rocha','Fábio Prado','Elisa + Fábio'],
      ['Ana Souza','Bruno Lima','Ana + Bruno'],
      ['Carla','Igor Mendes','Carla + Igor']
    ]);
  }
  SpreadsheetApp.getUi().alert('Abas criadas. Cole as pipelines em ' + CFG.COLAR_C + ' e ' + CFG.COLAR_G + '.');
}

/**
 * Opcional: roda o snapshot sozinho toda sexta às 8h.
 * Uma leitura por semana basta — a comparação vira sexta contra sexta, 7 dias cheios.
 * Para voltar a duas leituras, acrescente ScriptApp.WeekDay.TUESDAY na lista.
 */
function instalarGatilhos() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'rotinaAutomatica') ScriptApp.deleteTrigger(t);
  });
  [ScriptApp.WeekDay.FRIDAY].forEach(d => {
    ScriptApp.newTrigger('rotinaAutomatica').timeBased().onWeekDay(d).atHour(8).create();
  });
  SpreadsheetApp.getUi().alert('Gatilho criado: sexta às 8h.\n\n' +
    'Atenção: o snapshot só captura o que estiver colado nas abas. ' +
    'A colagem continua sendo manual.');
}

function rotinaAutomatica() {
  tirarSnapshot();
  calcularSemana();
}
