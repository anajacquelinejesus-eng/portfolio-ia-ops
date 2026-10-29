# Regras de negócio

Cada regra aqui responde a um caso real em que o número estava errado.

## Ativação

Um cliente **ativou** quando entrou em **Validação 7 dias** e está com a tag **Ativo**.

- **Data:** o primeiro snapshot em que o cliente aparece em Validação, em qualquer pipe, menos os dias na etapa. Uma leitura no dia 13 com 6 dias na etapa significa que ele entrou no dia 7.
- **O que não é ativação:** passar de Validação para Ativo, a ida para Ongoing. Isso fica numa coluna própria.
- **Quem já estava ativado na primeira leitura** não tem data conhecida. Ele fica fora e é contado à parte.

## Cliente, não card

Toda contagem é por cliente. Quando os dois cards de um cliente discordam, o da Concierge manda. A dupla é a do **dono de hoje**: cliente que trocou de mãos conta para quem cuida dele agora.

## Motivo de espera

Cada cliente em onboarding recebe **um** motivo, pela primeira regra que casar:

| Ordem | Motivo | Tipo |
|---|---|---|
| 1 | Cancelamento em andamento | externo |
| 2 | Contrato não assinado | externo |
| 3 | Problema na BM | externo |
| 4 | Cliente não responde | externo |
| 5 | Aguardando configuração da agenda | externo |
| 6 | Aguardando tráfego | externo |
| 7 | Aguardando retorno do cliente | externo |
| 8 | Projeto congelado | externo |
| 9 | Pendente de ajuste interno | interno |
| 10 | Pendência de migração | externo |
| 11 | Aguardando formulário ou dados | etapa inicial sem tarefa feita |
| 12 | Fila interna, sem impedimento externo | interno |
| 13 | Em andamento normal | — |

**Fila interna** é o único motivo que depende só do time. É o número a cobrar. Os externos pedem cadência de cobrança, não esforço.

## Tags

A classificação é feita por **palavra-chave sobre o texto bruto da tag**, sem acento e sem diferença de maiúscula. Isso aceita variação de grafia e o padrão antigo e o novo ao mesmo tempo.

- **Fora de tudo:** Teste e Parceria. Não entram em nenhuma conta.
- **Cancelamento:** Cancelado, Distrato, Encerrado e Estorno. Saem da carteira, a não ser que o status do sistema, na exportação, diga o contrário. A divergência aparece na auditoria.
- **Risco de saída:** Risco, Retido e Reclame Aqui. Ficam num bloco próprio. Saem da lista da dupla quando o cliente já foi entregue.
- **Previsão:** Go-live é a previsão de ativação da semana.

O texto da tag é lido **só da coluna de tags**. A coluna Status do CRM tem o valor "Ativo", e juntar as duas criava a tag "Cliente Ativo" em cards que não tinham.

## Período

A semana operacional vai de sexta a sexta, entre os snapshots. O fechamento para reunião usa de segunda a sexta. Os dois aparecem com rótulo, porque dão números diferentes de propósito.

## Metas do piloto

**CSAT.** O denominador é quem ativou no mês, a mesma régua das ativações. A resposta do formulário é ligada ao cliente primeiro pelo e-mail, depois pelo telefone e só por último pelo nome, por palavras e sem ambiguidade. A nota é a avaliação de 1 a 5 da ativação, e detrator é nota até 3.

**Ajustes.** São os tickets dos clientes que ativaram no mês, pedidos **depois** da data de ativação. Pedido antes disso é construção, não retrabalho.

**Indicações.** Vêm do formulário de aceite ou da aba de registro. Cada conversão vale a comissão da dupla.
