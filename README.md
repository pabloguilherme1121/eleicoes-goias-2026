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
