# Histórico do projeto

Como o painel evoluiu, na ordem em que os problemas apareceram.

## 1. Da foto ao histórico
O ponto de partida era uma colagem do CRM, que só mostra estoque. Com os snapshots datados e a comparação entre eles, passou a existir semana: quem andou, quem ativou, quem ficou parado.

## 2. Material de reunião
Entraram o PDF de planejamento por dupla e o PNG de slide, os dois gerados por botão e salvos no Drive. O PDF usa tema claro e tabelas porque o conversor do Apps Script não entende flexbox. O PNG é desenhado pelo navegador, porque o servidor não rasteriza HTML.

## 3. As tags derrubavam a classificação
A lista de tags era uma lista fechada de frases exatas. Tag escrita de outro jeito sumia, e o cliente caía em "fila interna". A troca foi para classificação por palavra-chave sobre o texto bruto, guardado numa coluna nova do snapshot.

## 4. Card contra cliente
A conta de carteira não fechava quando só um dos dois cards de um cliente mudava de dupla. Entradas e saídas passaram a ser calculadas pela lista de clientes do início e do fim.

## 5. O que é ativação
"Ativação" somava a entrada em Validação e a ida para Ongoing, e uma dupla chegou a mostrar 26 ativações numa semana de arrumação de carteira. A regra virou só a entrada em Validação com a tag Ativo, e um item de menu refaz o histórico com a regra nova.

## 6. A data certa
A ativação era datada pelo dia do snapshot, o que fazia ajustes pós-ativação parecerem anteriores. Descontar os dias na etapa deu a data real de entrada.

## 7. Metas do piloto
Entrou a aba de metas: CSAT, ajustes e indicações. Ela lê o formulário de aceite, que chega com as respostas em JSON, e os tickets de ajuste colados do CRM, com o id do cliente dentro do título.

## 8. Reorganização das tags
O CRM passou para 30 tags com nome único. O painel aceita os dois padrões, e uma falha antiga apareceu: a coluna Status, com o valor "Ativo", era lida junto com as tags e criava 45 ativações falsas.

## 9. Fechamento semanal
Os slides de fechamento da operação e de reconhecimento passaram a ser gerados na identidade visual da empresa, de segunda a sexta, com a divisão por dupla.

## Lições
- Todo número precisa de uma régua escrita antes da primeira conta.
- Quando dois números não batem, quase sempre medem coisas diferentes, não estão errados.
- Diagnóstico visível, como "o que ficou de fora e por quê", economiza mais tempo do que qualquer correção.
