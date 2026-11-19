# EcoFix — Simulador independente

## Arquivos
- `simulador.html`: interface da simulação.
- `simulador.js`: leitura somente leitura do estado compartilhado, cálculos, indicadores e exportação CSV.
- `proposta.js`: simulador anterior da proposta-base, mantido sem alteração.

## Acesso
Depois da publicação do GitHub Pages, acesse:
`https://isabelybomfim.github.io/meu-Primeiro-Projeto/ecofix/simulador.html`

## Segurança e preservação de dados
- O simulador consulta `public.ecofix_state` usando a chave publicável já utilizada pelo front-end.
- Não executa INSERT, UPDATE ou DELETE no Supabase.
- As alterações dos campos ficam apenas no armazenamento local deste navegador, na chave `ecofix_simulador_params_v1`.
- A chave `ecofix_dados_v1`, os cadastros e a gestão de usuários não são alterados.
- A exportação CSV contém as premissas e os resultados da simulação.

## Premissas e fórmulas
- Consumo anual = fitas por caminhão × caminhões/dia × dias/mês × meses/ano.
- Custo anual descartável = consumo anual × preço unitário Tyton.
- Estoque inicial = fitas por caminhão × caminhões/dia.
- Investimento inicial = estoque inicial × preço unitário reutilizável.
- Custo reutilizável amortizado anual = consumo anual × (preço reutilizável ÷ ciclos estimados).
- Economia potencial no primeiro ano = custo anual descartável − investimento inicial.
- Economia operacional estimada anual = custo anual descartável − custo reutilizável amortizado anual.
- Unidades potencialmente evitadas pressupõem recuperação e reutilização efetivas durante todo o período.

Os ciclos, economias e indicadores ambientais são estimativas, não resultados realizados. Custos de limpeza, inspeção, perdas, danos, logística e reposição não estão incluídos.
