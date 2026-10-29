/**
 * PDF de planejamento semanal por dupla.
 * Usa os mesmos dados do dashboard (getDados) e salva no Drive.
 * Layout em tabelas e tema claro: o conversor de PDF do Apps Script
 * não entende flexbox nem renderiza bem fundo escuro.
 */

const PDF_PASTA = 'Planejamento semanal de onboarding';

/** Motivos que dependem de terceiros — viram a lista de cobrança do PDF. */
const PDF_EXTERNOS = ['Cliente não responde', 'Aguardando retorno do cliente',
  'Aguardando configuração da agenda', 'Aguardando tráfego', 'Problema na BM', 'Projeto congelado',
  'Pendência de migração', 'Contrato não assinado', 'Cancelamento em andamento'];

/** Depende de nós, não do cliente — entra junto com a fila interna. */
const PDF_INTERNOS = ['Pendente de ajuste interno'];

/** Rodar uma vez pelo editor para autorizar o acesso ao Drive. */
function autorizarDrive() {
  DriveApp.getRootFolder();
}

function gerarPdfDupla(dupla) {
  const d = getDados();
  if (!d.data) throw new Error('Nenhum snapshot ainda. Rode o passo 1 primeiro.');
  return salvarPdf_(paginaPdf_(d, [blocoDuplaPdf_(d, dupla)]),
    'Planejamento — ' + dupla + ' — ' + d.data);
}

function gerarPdfTodas() {
  const d = getDados();
  if (!d.data) throw new Error('Nenhum snapshot ainda. Rode o passo 1 primeiro.');
  const duplas = d.porDupla.map(p => p.dupla).filter(x => x !== 'Sem dupla' && x !== 'QA');
  return salvarPdf_(paginaPdf_(d, duplas.map(x => blocoDuplaPdf_(d, x))),
    'Planejamento — todas as duplas — ' + d.data);
}

/** Salva na pasta do Drive. Gerar de novo no mesmo dia substitui o arquivo, sem duplicar. */
function salvarPdf_(html, nome) {
  const it = DriveApp.getFoldersByName(PDF_PASTA);
  const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(PDF_PASTA);
  const antigos = pasta.getFilesByName(nome + '.pdf');
  while (antigos.hasNext()) antigos.next().setTrashed(true);
  const blob = Utilities.newBlob(html, 'text/html', nome + '.html')
    .getAs('application/pdf').setName(nome + '.pdf');
  const f = pasta.createFile(blob);
  return { url: f.getUrl(), nome: f.getName() };
}

function esc_(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function paginaPdf_(d, blocos) {
  const css =
    'body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#1B2430;margin:0}' +
    '.quebra{page-break-before:always}' +
    '.topo{border-bottom:3px solid #109CC8;padding-bottom:8px;margin-bottom:12px}' +
    '.topo h1{font-size:18pt;margin:0;color:#0D1117}' +
    '.topo .sub{font-size:9.5pt;color:#5B6B7A;margin-top:3px}' +
    'table{width:100%;border-collapse:collapse}' +
    '.nums td{border:1px solid #D6DEE6;text-align:center;padding:8px 4px}' +
    '.nums b{display:block;font-size:17pt;color:#109CC8}' +
    '.nums span{font-size:8pt;color:#5B6B7A}' +
    'h2{font-size:11.5pt;color:#0D1117;margin:16px 0 6px;padding-bottom:3px;border-bottom:1px solid #D6DEE6}' +
    '.lista th,.lista td{border-bottom:1px solid #E4EAF0;padding:5px 6px;text-align:left;font-size:9.5pt}' +
    '.lista th{font-size:7.5pt;color:#5B6B7A;text-transform:uppercase;background:#F3F6F9}' +
    '.n{text-align:right}' +
    '.chk{width:14px}.box{width:10px;height:10px;border:1px solid #7A8A99}' +
    '.mut{color:#7A8A99}' +
    '.ins{margin-bottom:6px}' +
    '.ins td{padding:7px 10px;font-size:9.8pt;background:#F5F8FA}' +
    '.ins .t{font-size:7.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px}' +
    '.aviso{background:#FFF4E0;border-left:4px solid #F2A93B;padding:6px 10px;font-size:9pt;margin:0 0 10px}' +
    '.vazio{color:#7A8A99;font-style:italic;font-size:9.5pt;margin:4px 0}' +
    '.rodape{margin-top:18px;font-size:8pt;color:#9AA7B3}';
  const aviso = d.idadeSnapshot >= 1
    ? '<p class="aviso">Leitura de ' + d.idadeSnapshot + ' dia(s) atrás (foto de ' + d.data +
      '). O que mudou no Cockpit depois disso não aparece aqui.</p>' : '';
  const agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  return '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' +
    blocos.map((b, i) => '<div' + (i ? ' class="quebra"' : '') + '>' + aviso + b +
      '<p class="rodape">Gerado em ' + agora + ' a partir do dashboard de onboarding.</p></div>').join('') +
    '</body></html>';
}

function blocoDuplaPdf_(d, dupla) {
  const p = d.porDupla.filter(x => x.dupla === dupla)[0] || {};
  const dias = d.janela5 ? d.janela5.diasReais : 0;
  const j = (d.janela5 && d.janela5.duplas[dupla]) || { validacao: [], ongoing: [], onboardings: [] };
  const prev = ((d.previsao && d.previsao.hoje) ? d.previsao.hoje.lista : [])
    .filter(c => c.dupla === dupla);

  const ml = d.motivoLista || {};
  const porMotivo = m => (ml[m] || []).filter(c => c.dupla === dupla)
    .sort((a, b) => (Number(b.dias) || 0) - (Number(a.dias) || 0));
  const form = porMotivo('Aguardando formulário ou dados');
  const listados = {};
  prev.forEach(c => listados[c.id] = 1);
  form.forEach(c => listados[c.id] = 1);
  const fila = PDF_INTERNOS.concat('Fila interna — sem impedimento externo')
    .reduce((a, m) => a.concat(porMotivo(m)), [])
    .filter(c => !listados[c.id])
    .sort((a, b) => (Number(b.dias) || 0) - (Number(a.dias) || 0));
  const risco = (d.risco || []).filter(c => c.dupla === dupla);
  const externos = PDF_EXTERNOS.reduce(
    (a, m) => a.concat(porMotivo(m).map(c => Object.assign({ motivo: m }, c))), []);

  const foco = ((d.foco || {}).duplas || []).filter(x => x.dupla === dupla)[0];
  const ordem = { meta: 0, trava: 1, gargalo: 2, ok: 3 };
  const cor = { meta: '#109CC8', trava: '#D64545', gargalo: '#D9892A', ok: '#2FA36B' };
  const ins = (p.insights || []).slice().sort((a, b) => ordem[a.t] - ordem[b.t]);

  const cli = c => esc_(c.cliente) + ' <span class="mut">#' + c.id +
    (c.tipo ? ' · ' + c.tipo : '') + '</span>';
  const dd = c => (c.dias === '' || c.dias == null) ? '—' : c.dias + 'd';
  const tab = (tit, arr, cols, vazio, semChk) => '<h2>' + tit + ' (' + arr.length + ')</h2>' +
    (arr.length
      ? '<table class="lista"><tr>' + (semChk ? '' : '<th class="chk"></th>') +
        cols.map(c => '<th' + (c[2] ? ' class="n"' : '') + '>' + c[0] + '</th>').join('') + '</tr>' +
        arr.map(r => '<tr>' + (semChk ? '' : '<td class="chk"><div class="box"></div></td>') +
          cols.map(c => '<td' + (c[2] ? ' class="n"' : '') + '>' + c[1](r) + '</td>').join('') +
          '</tr>').join('') + '</table>'
      : '<p class="vazio">' + vazio + '</p>');

  let h = '<div class="topo"><h1>Planejamento semanal — ' + esc_(dupla) + '</h1>' +
    '<div class="sub">Foto do Cockpit de ' + d.data +
    (dias ? ' · entregas comparadas com ' + dias + ' dias atrás' : '') + '</div></div>';

  h += '<table class="nums"><tr>' + [
    [p.emOnboarding, 'em onboarding'],
    [p.quentes, 'prontos para ativar'],
    [prev.length, 'previstos p/ ativar'],
    [j.onboardings.length, 'onboardings em ' + dias + 'd'],
    [j.validacao.length, 'foram p/ Validação'],
    [j.ongoing.length, 'concluíram p/ Ongoing']
  ].map(x => '<td><b>' + (x[0] || 0) + '</b><span>' + x[1] + '</span></td>').join('') + '</tr></table>';

  if (ins.length) {
    h += '<h2>Leitura da semana</h2>' + ins.map(i =>
      '<table class="ins"><tr><td style="border-left:4px solid ' + cor[i.t] + '">' +
      '<div class="t" style="color:' + cor[i.t] + '">' + i.tit + '</div>' + i.txt +
      '</td></tr></table>').join('');
  }
  if (foco && foco.risco) h += '<p class="aviso">Atenção: ' + foco.risco + '</p>';

  h += tab('Ativar esta semana', prev, [
    ['Cliente', cli], ['Etapa', c => esc_(c.etapa)],
    ['Situação', c => c.jaAtivo ? 'já ativou' : c.pendente ? 'travado pelo cliente' : 'a ativar']
  ], 'Nenhum cliente com a tag Go-live. Marcar a previsão no Cockpit.');

  const prox = ((d.previsao && d.previsao.hoje && d.previsao.hoje.proxima) || [])
    .filter(c => c.dupla === dupla);
  h += tab('Previstos para a próxima semana', prox, [
    ['Cliente', cli], ['Etapa hoje', c => esc_(c.etapa)]
  ], 'Ninguém marcado com Ativação prevista próxima semana.');

  h += tab('Cobrar formulário ou dados', form, [
    ['Cliente', cli], ['Etapa', c => esc_(c.etapa)], ['Dias na etapa', dd, 1]
  ], 'Nenhum cliente aguardando formulário.');

  h += tab('Destravar — parados sem impedimento externo', fila, [
    ['Cliente', cli], ['Etapa', c => esc_(c.etapa)], ['Dias na etapa', dd, 1]
  ], 'Nenhum cliente parado sem motivo externo.');

  h += tab('Impedimentos externos — cadência de cobrança', externos, [
    ['Cliente', cli], ['Motivo', c => c.motivo], ['Etapa', c => esc_(c.etapa)], ['Dias', dd, 1]
  ], 'Nenhum impedimento externo registrado.');

  h += tab('Risco de saída — olhar antes de qualquer outra coisa', risco, [
    ['Cliente', cli], ['Sinal', c => c.sinal], ['Etapa', c => esc_(c.etapa)], ['Dias', dd, 1]
  ], 'Nenhum cliente marcado como retido, em retenção ou com Reclame Aqui.');

  const entregas = []
    .concat(j.validacao.map(c => Object.assign({ tipo: 'Foi para Validação' }, c)))
    .concat(j.ongoing.map(c => Object.assign({ tipo: 'Concluiu para Ongoing' }, c)))
    .concat(j.onboardings.map(c => Object.assign({ tipo: 'Fez onboarding' }, c)));
  h += tab('Entregas dos últimos ' + dias + ' dias', entregas, [
    ['Cliente', cli], ['Entrega', c => c.tipo], ['Movimento', c => esc_(c.de) + ' → ' + esc_(c.para)]
  ], 'Nenhuma movimentação de marco no período.', true);

  return h;
}
