# Eleições Goiás 2026

Painel público de candidaturas a deputado estadual de Goiás, primeiro turno de 2026.

Site: https://pabloguilherme1121.github.io/eleicoes-goias-2026/

## Recursos

- 595 registros de candidatura: 41 eleitos, 429 suplentes, 92 não eleitos e 33 sem resultado informado.
- Votação disponível para 556 registros; ausência de registro não é tratada como zero.
- Busca por nome de urna, nome completo e número; filtros por partido e resultado; paginação.
- Perfil: idade na eleição, ocupação, escolaridade, partido, federação, votos e cinco municípios com maior votação.
- Comparação de até três perfis, ranking geral e exportação CSV do recorte inteiro, além da página visível.

## Origem e método

Cadastro: https://dadosabertos.tse.jus.br/dataset/candidatos-2026
Resultados: https://dadosabertos.tse.jus.br/dataset/resultados-2026

Os CSVs são filtrados por UF GO, cargo 7 e turno 1. O cruzamento usa SQ_CANDIDATO; números de urna podem aparecer em registros diferentes. A votação é somada entre municípios e zonas, preservando a diferença entre votos computados e válidos. O percentual exibido divide os votos nominais computados pela soma nominal do recorte estadual completo; não inclui votos de legenda. A situação vem do cadastro (CD_SIT_TOT_TURNO). Idade calculada em 04/10/2026. Campos ausentes permanecem não informados. Datas de geração e fontes estão em data/candidatos.json. Os hashes dos CSVs de origem estão em data/proveniencia.json.

Não publicamos os CSVs integrais de cadastro: o gerador seleciona somente os campos usados no painel. CPF, título eleitoral, email e data de nascimento não entram na base publicada.

Dados TSE sob licença Creative Commons Atribuição. A base é estática, sem atualização automática. Resultados podem mudar em extrações posteriores. Visualização independente, sem vínculo institucional com a Justiça Eleitoral.

## Atualizar a base

Baixe e extraia os arquivos oficiais consulta_cand_2026.zip e votacao_candidato_munzona_2026.zip. Execute com Python 3:

```powershell
python scripts/import_tse.py caminho/consulta_cand_2026_GO.csv caminho/votacao_candidato_munzona_2026_GO.csv
```

## Executar

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Abra http://127.0.0.1:8765/. O painel carrega JSON via fetch, portanto precisa de um servidor HTTP. Não há dependências de frontend nem build.

## Publicação

GitHub Pages: branch main, pasta raiz /. JavaScript, CSS e dados usam caminhos relativos compatíveis com o Pages.
