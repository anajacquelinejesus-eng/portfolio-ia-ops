# Arquitetura

## Abas da planilha

| Aba | Papel | Quem preenche |
|---|---|---|
| `Colar_Concierge`, `Colar_Gestor`, `Colar_Contratos` | Colagem da visão Lista de cada pipe do CRM | Time, toda sexta |
| `Colar_Clientes_CSV` | Exportação de clientes: status no sistema, e-mail, telefone, data de venda | Time, junto com a colagem |
| `Config` | De-para de pessoa para dupla (Concierge, Gestor de IA, nome da dupla) | Coordenação, quando a equipe muda |
| `Eventos` | Mudanças de equipe: saída, entrada, ausência | Coordenação |
| `Snapshots` | Histórico: uma linha por card por leitura | Script |
| `Semanal` | Uma linha por dupla por comparação de snapshots | Script |
| `CSAT`, `Ajustes`, `Metas_Indicacoes` | Registros das metas do piloto | Formulário e time |

## Fluxo

1. **Colagem.** O parser aceita dois formatos: tabela, quando a colagem vira colunas, ou blocos, quando vira uma linha por campo. Ele detecta o cabeçalho e reconhece a etapa pelo prefixo, porque o CRM às vezes cola etapa e tempo na mesma célula.
2. **Snapshot.** `tirarSnapshot()` grava a foto do dia. Se já existir snapshot com a mesma data, ele é substituído. A aba é reescrita de uma vez só, porque apagar linha a linha estoura o limite de chamadas.
3. **Semana.** `calcularSemana()` compara o snapshot mais recente com o mais próximo de 7 dias antes, nunca com menos de 5. `recalcularSemanal()` refaz o histórico inteiro com a regra vigente.
4. **Modelo canônico.** `getDados()` monta um objeto único que alimenta o painel, o PDF e os slides. Nenhum número é recalculado na tela.

## Modelo canônico

Todo cliente cai em exatamente uma população:

- **adm:** contrato não assinado
- **onboarding:** ainda não entrou em Validação
- **ativados:** em Validação 7 dias ou Ativo

O modelo verifica a cada leitura cinco invariantes, como `adm + onboarding + ativados = base` e `soma das duplas = base`. Se algum falha, o painel mostra um alarme em vermelho e pede para não usar os números.

## Painel

O HTML é servido por HtmlService e lê tudo por `google.script.run.getDados()`. Tem três modos:

- **Apresentação:** funil, ADM, duplas e foco do time
- **Completo:** todas as seções e auditorias
- **Metas Onboarding:** CSAT, ajustes, indicações e placar

## Saídas

| Saída | Como é gerada |
|---|---|
| PDF por dupla | HTML em tema claro e só com tabelas, porque o conversor do Apps Script não entende flexbox, convertido com `getAs('application/pdf')` e salvo no Drive |
| PNG do slide | O navegador monta o slide em 1920x1080 fora da tela, o html2canvas rasteriza e o servidor grava o PNG no Drive |

Gerar de novo no mesmo dia substitui o arquivo, para a pasta não acumular versões.
