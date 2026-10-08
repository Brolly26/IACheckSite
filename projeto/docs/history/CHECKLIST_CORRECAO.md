# ✅ Checklist de Correção - IACheckSite

**Data:** 19 de Janeiro de 2026  
**Status do Projeto:** ⚠️ REQUER CORREÇÃO

Use este checklist para acompanhar o progresso das correções necessárias.

---

## 🔴 PRIORIDADE CRÍTICA - Correção Imediata Necessária

### 1. Configurar Puppeteer para Produção

#### Opção A: chrome-aws-lambda (RECOMENDADO) ⭐
- [ ] Desinstalar puppeteer: `cd backend && npm uninstall puppeteer`
- [ ] Instalar puppeteer-core e chrome-aws-lambda: `npm install puppeteer-core chrome-aws-lambda`
- [ ] Atualizar imports em `backend/src/services/analyzer.ts`:
  ```typescript
  import puppeteer from 'puppeteer-core';
  import chromium from 'chrome-aws-lambda';
  ```
- [ ] Atualizar browser launch em `analyzer.ts`:
  ```typescript
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });
  ```
- [ ] Rebuild: `npm run build`
- [ ] Commit: `git add . && git commit -m "fix: configure puppeteer for production"`
- [ ] Push: `git push`
- [ ] Aguardar deploy automático no Render.com

#### Opção B: Configurar Puppeteer nativo no Render.com
- [ ] Criar arquivo `render.yaml` na raiz do projeto
- [ ] Adicionar configuração de build com puppeteer
- [ ] Configurar variáveis de ambiente no Render.com
- [ ] Atualizar código com executablePath
- [ ] Deploy manual

**Escolha uma opção acima e complete os passos**

---

### 2. Testar Correção em Produção

- [ ] Health check funciona: 
  ```bash
  curl https://iachecksite.onrender.com/health
  ```
  Esperado: `{"status":"ok"}`

- [ ] Análise de site funciona:
  ```bash
  curl -X POST https://iachecksite.onrender.com/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
  ```
  Esperado: JSON com scores de SEO, acessibilidade, etc.

- [ ] Frontend consegue analisar um site
  - Acesse: https://ia-check-site-rvrt.vercel.app/
  - Insira: https://example.com
  - Verifique se retorna resultados

---

## 🟡 PRIORIDADE MÉDIA - Melhorias Importantes

### 3. Validação no PDF Generator

- [ ] Abrir arquivo `backend/src/services/pdfGenerator.ts`
- [ ] Adicionar validação no início da função `generatePdfReport`:
  ```typescript
  if (!result || !result.seo || !result.accessibility || !result.performance) {
    throw new Error('Invalid analysis result structure');
  }
  ```
- [ ] Testar localmente
- [ ] Commit e push

### 4. Configuração de Desenvolvimento Local

- [ ] Criar arquivo `backend/.env`:
  ```env
  OPENAI_API_KEY=sua-chave-aqui
  PORT=3001
  ```
- [ ] Testar backend local: `cd backend && npm run dev`
- [ ] Verificar se inicia sem erros
- [ ] Testar análise local:
  ```bash
  curl -X POST http://localhost:3001/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
  ```

### 5. Melhorar Tratamento de Erros

- [ ] Abrir `backend/src/routes/analyze.ts`
- [ ] Adicionar validação de protocolo HTTP/HTTPS
- [ ] Melhorar mensagens de erro para o usuário
- [ ] Adicionar logging com timestamp
- [ ] Testar diferentes tipos de erro
- [ ] Commit e push

### 6. Variáveis de Ambiente no Frontend

- [ ] Criar arquivo `frontend/.env.local`:
  ```env
  NEXT_PUBLIC_API_URL=https://iachecksite.onrender.com
  ```
- [ ] Atualizar `frontend/src/pages/index.tsx`
- [ ] Substituir URLs hardcoded por variável de ambiente
- [ ] Testar localmente
- [ ] Atualizar variável no Vercel (se necessário)
- [ ] Commit e push

---

## 🟢 PRIORIDADE BAIXA - Otimizações

### 7. Documentação da API

- [ ] Criar arquivo `API_DOCUMENTATION.md`
- [ ] Documentar endpoint `/health`
- [ ] Documentar endpoint `/api/analyze`
- [ ] Documentar endpoint `/api/generate-pdf`
- [ ] Adicionar exemplos de requisições e respostas
- [ ] Adicionar códigos de erro possíveis

### 8. Implementar Cache

- [ ] Pesquisar solução de cache (Redis, Memcached)
- [ ] Implementar cache para análises recentes
- [ ] Adicionar TTL de 1 hora
- [ ] Testar performance
- [ ] Documentar

### 9. Rate Limiting

- [ ] Instalar `express-rate-limit`
- [ ] Configurar limite de requisições
- [ ] Adicionar middleware no Express
- [ ] Testar limites
- [ ] Documentar

### 10. Monitoramento e Logging

- [ ] Configurar serviço de logging (LogRocket, Sentry)
- [ ] Adicionar tracking de erros
- [ ] Configurar alertas
- [ ] Dashboard de métricas
- [ ] Documentar

---

## 🧪 Testes de Validação

### Testes Manuais - Backend

- [ ] **Health Check**
  ```bash
  curl https://iachecksite.onrender.com/health
  ```
  ✅ Retorna: `{"status":"ok"}`

- [ ] **Análise - Site Simples**
  ```bash
  curl -X POST https://iachecksite.onrender.com/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
  ```
  ✅ Retorna: JSON completo com análises

- [ ] **Análise - Site Complexo**
  ```bash
  curl -X POST https://iachecksite.onrender.com/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url": "https://www.google.com"}'
  ```
  ✅ Retorna: JSON completo com análises

- [ ] **Análise - URL Inválida**
  ```bash
  curl -X POST https://iachecksite.onrender.com/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url": "invalid-url"}'
  ```
  ✅ Retorna: Erro 400 com mensagem clara

- [ ] **Análise - URL sem protocolo**
  ```bash
  curl -X POST https://iachecksite.onrender.com/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"url": "example.com"}'
  ```
  ✅ Retorna: Erro 400 com mensagem clara

### Testes Manuais - Frontend

- [ ] Acesse https://ia-check-site-rvrt.vercel.app/
- [ ] Interface carrega corretamente
- [ ] Header e Footer aparecem
- [ ] Campo de URL está visível
- [ ] Botão "Analisar" está funcional
- [ ] Digite uma URL válida (https://example.com)
- [ ] Clique em "Analisar"
- [ ] Aguarde processamento (loading aparece)
- [ ] Resultados aparecem
- [ ] Todos os cards de relatório aparecem:
  - [ ] SEO
  - [ ] Acessibilidade
  - [ ] Performance
  - [ ] Segurança
  - [ ] Headers HTTP
  - [ ] Mobile
  - [ ] SEO Técnico
  - [ ] Analytics
- [ ] Análise por IA aparece
- [ ] Botão "Baixar PDF" funciona
- [ ] PDF é gerado e baixado

### Testes de Erros - Frontend

- [ ] Digite URL inválida → Mensagem de erro aparece
- [ ] Digite URL sem protocolo → Mensagem de erro aparece
- [ ] Digite URL de site offline → Mensagem de erro apropriada
- [ ] Teste timeout (site muito lento) → Mensagem apropriada

---

## 📊 Métricas de Sucesso

### Critérios de Aceitação

- [ ] Health check retorna 200 OK
- [ ] Análise de site retorna 200 OK com dados completos
- [ ] Tempo de resposta < 30 segundos para análise
- [ ] Frontend exibe resultados corretamente
- [ ] Geração de PDF funciona
- [ ] Mensagens de erro são claras e amigáveis
- [ ] Não há erros 500 em condições normais
- [ ] Sistema funciona com pelo menos 5 sites diferentes

### Testes com Múltiplos Sites

Testar com os seguintes sites:

- [ ] https://example.com (simples)
- [ ] https://www.google.com (complexo)
- [ ] https://www.wikipedia.org (médio)
- [ ] https://github.com (técnico)
- [ ] https://www.youtube.com (pesado)

**Taxa de Sucesso Esperada:** 100% (5/5)

---

## 🚀 Deploy Checklist

### Antes do Deploy

- [ ] Código funciona localmente
- [ ] Todos os testes passam
- [ ] Variáveis de ambiente configuradas
- [ ] Dependências atualizadas
- [ ] Build executa sem erros: `npm run build`
- [ ] Commit com mensagem clara
- [ ] Push para repositório

### Durante o Deploy

- [ ] Deploy iniciou no Render.com
- [ ] Build completo sem erros
- [ ] Logs não mostram warnings críticos
- [ ] Deploy concluído com sucesso

### Após o Deploy

- [ ] Aguardar 2-3 minutos para estabilização
- [ ] Testar health check
- [ ] Testar análise de site
- [ ] Verificar logs no Render.com
- [ ] Testar frontend em produção
- [ ] Validar integração completa

---

## 📱 Teste de Integração End-to-End

Fluxo completo que um usuário faria:

1. - [ ] Usuário acessa https://ia-check-site-rvrt.vercel.app/
2. - [ ] Usuário vê interface limpa e profissional
3. - [ ] Usuário digita URL: https://example.com
4. - [ ] Usuário clica em "Analisar"
5. - [ ] Loading aparece ("Analisando seu site...")
6. - [ ] Após 10-30 segundos, resultados aparecem
7. - [ ] Usuário vê scores de SEO, Acessibilidade, Performance
8. - [ ] Usuário vê relatórios detalhados de Segurança, Mobile, etc.
9. - [ ] Usuário lê análise gerada por IA
10. - [ ] Usuário clica em "Baixar Relatório Completo (PDF)"
11. - [ ] PDF é gerado e download inicia
12. - [ ] Usuário abre PDF e vê relatório completo formatado

**Se todos os passos funcionam → Sistema está 100% operacional ✅**

---

## 📝 Notas e Observações

### Problemas Encontrados Durante Correção
*Anote aqui qualquer problema encontrado:*

- 
- 
- 

### Soluções Aplicadas
*Anote as soluções que funcionaram:*

- 
- 
- 

### Tempo Gasto
*Rastreie o tempo para referência futura:*

| Tarefa | Tempo Estimado | Tempo Real | Status |
|--------|----------------|------------|--------|
| Correção Puppeteer | 2-4h | | |
| Validação PDF | 30min | | |
| Config .env | 15min | | |
| Testes | 1h | | |
| **TOTAL** | **4-6h** | | |

---

## ✅ Status Final

**Data de Conclusão:** ___/___/______

**Checklist Completo:** ☐ SIM ☐ NÃO

**Sistema Funcional:** ☐ SIM ☐ NÃO

**Observações Finais:**
_________________________________________
_________________________________________
_________________________________________

---

## 🆘 Problemas Persistentes?

Se após seguir todos os passos o sistema ainda não funcionar:

1. **Verificar Logs do Render.com**
   - Dashboard → Logs → Buscar por erros

2. **Verificar Variáveis de Ambiente**
   - OPENAI_API_KEY está configurada?
   - Todas as variáveis necessárias estão presentes?

3. **Testar Localmente Primeiro**
   - Se funciona local mas não em produção → problema de deploy/config
   - Se não funciona nem localmente → problema no código

4. **Considerar Alternativas**
   - Migrar para Railway.app
   - Migrar para Fly.io
   - Usar Docker para isolar ambiente

5. **Buscar Ajuda**
   - Documentação do Render.com
   - Issues do Puppeteer no GitHub
   - Stack Overflow
   - Comunidade do Discord

---

**Boa sorte com as correções! 🚀**

*Lembre-se: Teste cada mudança localmente antes de fazer deploy!*

