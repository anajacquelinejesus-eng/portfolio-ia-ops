# Instalação

1. Crie uma planilha no Google Sheets e abra **Extensões → Apps Script**.
2. Crie os arquivos com os nomes exatos e cole o conteúdo de `src/`:
   - `Codigo.gs`
   - `PdfDuplas.gs`
   - `SlideDuplas.gs`
   - `Dashboard.html`, em **+ → HTML**, sem a extensão no nome
3. Salve e recarregue a planilha. Aparece o menu **Painel Onboarding**.
4. Rode **Criar abas (primeira vez)**.
5. No editor, rode a função `autorizarDrive` uma vez e aceite as permissões. Sem isso, o PDF e o PNG não conseguem salvar no Drive.
6. Preencha a aba `Config` com o nome de cada pessoa **exatamente como aparece no CRM** e o nome da dupla.
7. Toda semana:
   1. Cole os pipes nas abas `Colar_*` e a exportação de clientes em `Colar_Clientes_CSV`.
   2. Rode **1 · Tirar snapshot de hoje**.
   3. Rode **2 · Calcular semana**.
   4. Abra o painel.

## Configuração

Tudo o que muda com a operação fica no objeto `CFG`, no topo do `Codigo.gs`:

| Chave | Para quê |
|---|---|
| `ETAPAS_C`, `ETAPAS_G` | Nomes das etapas de cada pipe |
| `TAGS` e `SIT` | Tags exibidas e regra de classificação |
| `DUPLAS_PILOTO`, `DUPLAS_OCULTAS` | Quem aparece nas metas e quem saiu |
| `RENOMEAR` | Costura o nome antigo de uma dupla no novo, para a série não quebrar |
| `JANELA_DIAS`, `JANELA_MIN` | Janela de entrega |
| `METAS` | Alvos do piloto |

## Publicar como app da web

Para abrir o painel por link, use **Implantar → Nova implantação → App da Web**. A cada mudança no código, gere uma **nova versão** da implantação. O link continua o mesmo.
