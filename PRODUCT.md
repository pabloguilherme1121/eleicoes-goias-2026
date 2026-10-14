# Observatório Eleitoral de Goiás

## Platform

web

## Produto e contexto confirmados

Dashboard público em português para consultar deputado estadual de Goiás em 2026. O proprietário pediu consulta de eleitos e não eleitos, mais dados oficiais, uso no celular, downloads, PWA e refinamento de código. A referência indicada pelo proprietário é Pabloguilherme01/observatorio. A captura Android enviada evidencia falha do Chrome ao abrir um aplicativo instalado.

## Contratos

Manter nome, dados reais do TSE, origem e datas, situação eleitoral estadual, diferença entre ausência de registro e zero, 246 municípios, favoritos pessoais, comparação, filtros, exportação e consulta offline. Hospedagem estática em GitHub Pages no subcaminho /eleicoes-goias-2026/. Sem backend, identificação de usuários ou atualização automática de apuração.

## Critérios desta revisão

Busca e primeiro resultado acessíveis rapidamente no celular; instalação separada da exportação; salvar arquivos com ação explícita e alternativa de compartilhamento; recuperação de falhas sem apagar favoritos; código organizado e verificações reproduzíveis. A abertura de um WebAPK pelo Android exige validação no aparelho do proprietário e não pode ser prometida a partir de um teste desktop.

Atualização de escopo: o usuário pediu remover download de HTML e exportação CSV. A interface passa a priorizar consulta, análise, perfis e PWA; arquivos de exportação e seus geradores foram retirados.

Leitura territorial autorizada: filtro por regiões imediatas/intermediárias do IBGE, concentração municipal/regional, comparação no recorte e resumos objetivos. Não inferir residência a partir da votação; UF de nascimento e ausência de domicílio devem ser explícitas. Continuar sem downloads HTML e exportações CSV.

Refinamento funcional: perfis compartilháveis por identificador, navegação sequencial e histórico do navegador, filtros removíveis, comparação persistente, impressão municipal completa e validação automática de dados/cache/interações. Dados e denominações territoriais permanecem factuais.

Atalhos de cidade e comparações: guardar a cidade apenas por ação explícita, informar falha de armazenamento, manter preferências locais fora dos links compartilhados, restaurar até três identificadores únicos válidos e explicar a ordenação corrente.
