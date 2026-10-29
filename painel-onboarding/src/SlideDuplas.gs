/**
 * Slides de apresentação em PNG, um por dupla e um para o ADM.
 *
 * O Apps Script não rasteriza HTML. Quem desenha é o navegador: o Dashboard monta
 * o slide em 1920x1080 fora da tela, o html2canvas vira imagem, e este arquivo só
 * recebe a imagem pronta e grava no Drive. Mesma pasta dos PDFs.
 */

const SLIDE_PASTA = PDF_PASTA; // 'Planejamento semanal de onboarding'

/** Recebe o PNG em base64 do dashboard e grava no Drive. */
function salvarPngSlide(b64, nome) {
  if (!b64) throw new Error('A imagem chegou vazia. Tente gerar novamente.');
  const it = DriveApp.getFoldersByName(SLIDE_PASTA);
  const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(SLIDE_PASTA);
  const arquivo = nome + '.png';
  const antigos = pasta.getFilesByName(arquivo);
  while (antigos.hasNext()) antigos.next().setTrashed(true);
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', arquivo);
  const f = pasta.createFile(blob);
  return { url: f.getUrl(), nome: f.getName(), pasta: pasta.getUrl() };
}

/** Link da pasta, para o botão "todos os slides" abrir de uma vez. */
function pastaSlides() {
  const it = DriveApp.getFoldersByName(SLIDE_PASTA);
  const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(SLIDE_PASTA);
  return { url: pasta.getUrl(), nome: pasta.getName() };
}
