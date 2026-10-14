# Observatório Eleitoral · Goiás 2026

Dashboard independente para consultar candidaturas a deputado estadual em Goiás. Base do TSE gerada em 13/10/2026; não é apuração ao vivo.

## Recursos

- Consulta por nome, número, partido, situação eleitoral e município.
- 595 registros, 41 eleitos, 246 municípios e distinção entre ausência de votação e zero votos.
- Ranking nominal e distribuição partidária, com recorte municipal.
- Perfis com escolaridade, ocupação, bens e redes declarados.
- Favoritos locais, comparação de até três perfis e compartilhamento de consultas.
- Tema claro, contraste, impressão de perfis e instalação como PWA.

A interface prioriza consulta e análise. Não oferece download de HTML nem exportação CSV. O código está disponível no GitHub; a base pública e sua proveniência ficam em `data/`.

## Executar e validar

```sh
python -m http.server 8000
python scripts/check_data.py
python scripts/build_pwa.py
node scripts/test_pwa.cjs
node scripts/test_regions.cjs
```

Após qualquer alteração de interface ou dados, gere novamente o worker com `build_pwa.py`. O script calcula a versão e a integridade dos recursos necessários ao modo offline. Publique todos os arquivos da mesma versão juntos.

## Dados e metodologia

Fontes oficiais: [cadastro de candidaturas](https://dadosabertos.tse.jus.br/dataset/candidatos-2026) e [resultados](https://dadosabertos.tse.jus.br/dataset/resultados-2026).

O importador filtra UF GO, cargo 7 e turno 1 e cruza os arquivos pelo identificador SQ_CANDIDATO. Soma votos entre zonas e municípios. A situação eleitoral é estadual; o filtro municipal modifica votação, ranking e denominador percentual. Percentuais usam votos nominais, sem votos de legenda. Ausência de registro não significa zero. Bens e redes são declarações ao TSE, não auditoria de patrimônio ou verificação de contas sociais.

```sh
python scripts/import_tse.py cadastro_GO.csv votacao_GO.csv bem_candidato_2026_GO.csv rede_social_candidato_2026_GO.csv
```

Datas de geração e hashes de origem estão em `data/candidatos.json` e `data/proveniencia.json`. Não publicamos CPF, título eleitoral, email, data de nascimento nem os arquivos integrais de cadastro.

## Aplicativo e modo offline

Abra o site por HTTPS e aguarde a confirmação de que a consulta offline está pronta. Consulta, filtros, perfis, favoritos e comparação funcionam com os arquivos salvos. Fontes externas exigem internet. Atualizações dependem de conexão e devem ser aplicadas pelo controle de atualização do site.

A instalação é fornecida pelo navegador. A ajuda do aplicativo explica as alternativas no Android e no iPhone. Testes de cache e navegador não substituem a validação da instalação no aparelho real.

## Leitura territorial

Municípios do TSE são associados a 246 municípios do IBGE, com 22 regiões geográficas imediatas e 6 intermediárias. O retrato oficial de localidades foi consultado em 14/10/2026 e está em `data/territorios-ibge.json`, com URL, data e hash da resposta de origem. As três variações de nomes são tratadas por normalização de acentos/apóstrofos/espaços e pelo alias explícito Bom Jesus → Bom Jesus de Goiás. O importador falha se faltar município ou houver correspondência duplicada.

```sh
python scripts/enrich_regions.py
python scripts/check_data.py
node scripts/test_regions.cjs
python scripts/build_pwa.py
```

O importador eleitoral também aplica esse enriquecimento após gerar os municípios. A base territorial permanece local no aplicativo e não exige consulta ao IBGE durante o uso.

Um município selecionado é o recorte mais específico; sem município, a região escolhida agrega votos de seus municípios. O percentual na consulta usa o total nominal do território. Já os percentuais de cidades/regiões no perfil usam o total estadual de votos da própria candidatura. As três cidades mais votadas medem concentração de votos, sem inferir domicílio, apoio exclusivo ou vínculo pessoal.

A classificação regional é do IBGE, não das regiões de planejamento do Governo de Goiás. A UF de nascimento vem do cadastro eleitoral; município de residência não consta no arquivo usado. As datas de votação permanecem as originais do TSE. A URL compartilha a região, código IBGE do município, busca, ordenação, página e filtro com votos; links antigos com índice municipal ainda são aceitos.

## Navegação e validação da interface

O perfil tem link estável pelo parâmetro `perfil`, navegação anterior/próximo na lista atual, compartilhamento e impressão com todos os municípios. Voltar/Avançar do navegador restaura a consulta e o perfil. Os filtros ativos podem ser removidos individualmente; favoritos continuam pessoais. A comparação mantém até três candidaturas e oferece uma barra de acesso no celular.

Para reproduzir os testes de interação em Node.js 24 ou superior:

```sh
npm ci
npm test
```

As dependências são apenas de desenvolvimento. O site publicado continua estático e sem bibliotecas externas de execução. O teste de interação verifica links diretos, histórico, filtros, comparação e a preparação completa da impressão; não representa uma validação da janela de impressão ou da instalação física no Android.
