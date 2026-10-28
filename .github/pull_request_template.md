## Objetivo da alteração
<!-- Explique o problema resolvido, não apenas os arquivos alterados. -->

## Tipo
- [ ] Correção de comportamento
- [ ] Dados/metodologia
- [ ] Interface/acessibilidade
- [ ] PWA/offline
- [ ] Documentação ou testes

## Evidências
- Issue relacionada:
- Passos para reproduzir (se houver bug):
- Resultado antes/depois:
- Capturas ou logs relevantes (sem dados pessoais):

## Integridade dos dados eleitorais
- [ ] Não modifiquei a base; **ou**, se modifiquei, indiquei o arquivo de origem do TSE, data, filtros, procedência e regeneração.
- [ ] Preservei a distinção entre **voto zero** e **votação não registrada**; ausência não foi tratada como zero.
- [ ] Não apresentei dados datados como resultados ao vivo ou informações oficialmente verificadas quando são declarações.

## Verificação técnica
- [ ] Executei `npm ci --ignore-scripts` e `npm test` (ou expliquei por que não).
- [ ] Executei `python scripts/check_data.py` e `python scripts/test_ranking.py` (ou não houve alteração de dados e registrei isso).
- [ ] Se mudei recursos de interface/PWA, executei `python scripts/build_pwa.py` e conferi que os arquivos versionados estão sincronizados.
- [ ] Conferi o CI: **Validate dashboard** e **Browser smoke** com `Browser / chromium`, `Browser / firefox` e `Browser / webkit`.
- [ ] Se a PR altera UI, conferi layout e toque em 320/390 px, links, teclado e textos.
- [ ] Diferenciei execução em CI de validação **Android físico**, que permanece aceite separado.

## Segurança da integração
- [ ] Nenhuma credencial, dado pessoal privado ou arquivo de cadastro integral foi incluído.
- [ ] Não alterei ou afrouxei asserções, gates de CI ou controles de publicação para obter sucesso.
- [ ] A integração ocorrerá apenas após revisão e verificações no HEAD final.

> Este checklist orienta revisão; marcar caixas não comprova os testes. Anexe links para runs e evidências reais.
