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

## Mobile e arquivos para baixar

A estrutura se inspira no Observatório Público de Águas Lindas (https://github.com/Pabloguilherme01/observatorio): entradas por tarefa, navegação inferior, fonte e período visíveis, leitura explicada e controles de tema e contraste. Implementação própria para o painel eleitoral.

No celular, a consulta usa cartões em vez da tabela. Filtros avançados ficam em um grupo expansível; a comparação mantém até três perfis entre páginas. As preferências são salvas localmente quando o navegador permite. A consulta filtrada pode ser compartilhada por URL, sem incluir dados privados.

Para gerar os arquivos:

```powershell
python scripts/build_downloads.py
```

- `downloads/painel-goias-2026-offline.html`: arquivo único, com estilos, JavaScript e base embutidos. Abra diretamente no navegador, sem servidor. No celular, use um aplicativo/navegador que permita abrir HTML local.
- `downloads/eleicoes-goias-2026.zip`: código, dados, importador, gerador e HTML offline. Extraia e abra o HTML offline para consultar; use o servidor HTTP para desenvolver a versão modular.

Links às fontes oficiais exigem internet. O CSV exporta o recorte inteiro; o JSON exporta a base e a origem dos dados. Os perfis também podem ser baixados individualmente em JSON. Tema, contraste e leitura funcionam na versão offline.

## Aplicativo PWA

Abra o site publicado por HTTPS e aguarde “Consulta offline pronta neste aparelho”. O aplicativo salva a interface, ícones e os 595 registros localmente. Consulta, filtros, perfis, comparação e exportação CSV/JSON gerada localmente funcionam sem conexão. Links às fontes, compartilhamento com outras pessoas e downloads de ZIP/HTML publicados exigem internet.

Android/Chrome e Edge: use o botão Instalar aplicativo quando o navegador o disponibilizar, ou o menu de instalação. iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início. A disponibilidade da instalação depende do navegador. A instalação nunca é disparada automaticamente.

Atualizações: um novo cache é preparado integralmente antes de substituir o anterior. O botão Atualizar aplicativo ativa a versão nova e recarrega os clientes controlados. O cache é isolado sob /eleicoes-goias-2026/ e não modifica outros sites da conta. Versões antigas ficam ativas até a troca, para manter HTML, JavaScript e dados consistentes. O aplicativo é uma fotografia estática dos dados, não um sistema de apuração ao vivo.

Execute `python scripts/build_downloads.py` após alterar interface, PWA ou dados: o comando também versiona o service worker pelo conteúdo. Para testar localmente, use localhost/127.0.0.1 com o servidor HTTP. HTML aberto como arquivo é a entrega offline independente; não instala service worker.
