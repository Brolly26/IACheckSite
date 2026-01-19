# Soluções Práticas - IACheckSite

## 🚨 Problema Principal: Puppeteer no Render.com

### Solução 1: Usar puppeteer-core com chrome-aws-lambda (RECOMENDADO)

#### Passo 1: Atualizar dependências
```bash
cd backend
npm uninstall puppeteer
npm install puppeteer-core chrome-aws-lambda
```

#### Passo 2: Atualizar backend/src/services/analyzer.ts

Substituir a importação:
```typescript
// ANTES
import * as puppeteer from 'puppeteer';

// DEPOIS
import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';
```

Atualizar a função de inicialização do browser:
```typescript
// ANTES
export async function analyzeSite(url: string): Promise<AnalysisResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

// DEPOIS
export async function analyzeSite(url: string): Promise<AnalysisResult> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });
```

#### Passo 3: Rebuild e redeploy
```bash
npm run build
git add .
git commit -m "fix: configure puppeteer for Render.com"
git push
```

---

### Solução 2: Configurar Puppeteer nativo no Render.com

#### Passo 1: Criar render.yaml na raiz do projeto
```yaml
services:
  - type: web
    name: iachecksite-backend
    env: node
    region: oregon
    buildCommand: |
      cd backend &&
      npm install &&
      npx puppeteer browsers install chrome &&
      npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
        value: false
      - key: PUPPETEER_CACHE_DIR
        value: /opt/render/.cache/puppeteer
```

#### Passo 2: Atualizar backend/src/services/analyzer.ts
```typescript
export async function analyzeSite(url: string): Promise<AnalysisResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  });
  
  // ... resto do código
}
```

#### Passo 3: Configurar variáveis de ambiente no Render.com
1. Acesse o dashboard do Render.com
2. Vá em Environment
3. Adicione:
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false`
   - `PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer`

---

### Solução 3: Migrar para Railway ou Fly.io (Alternativa)

Essas plataformas têm melhor suporte nativo para Puppeteer.

#### Railway
```bash
# Instalar CLI
npm install -g @railway/cli

# Login e deploy
railway login
railway init
railway up
```

#### Fly.io
Criar `fly.toml`:
```toml
app = "iachecksite"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "3001"
  NODE_ENV = "production"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

---

## 🔧 Correção de Problemas Secundários

### 1. Validação no PDF Generator

Adicionar no início de `backend/src/services/pdfGenerator.ts`:

```typescript
export async function generatePdfReport(result: AnalysisResult): Promise<Readable> {
  // Validação de estrutura
  if (!result) {
    throw new Error('Analysis result is required');
  }
  
  const requiredFields = ['seo', 'accessibility', 'performance', 'security', 
                          'mobile', 'analytics', 'technicalSeo', 'httpHeaders', 'aiAnalysis'];
  
  for (const field of requiredFields) {
    if (!result[field as keyof AnalysisResult]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validação de scores
  const scoreFields = ['seo', 'accessibility', 'performance', 'security', 
                       'mobile', 'analytics', 'technicalSeo', 'httpHeaders'];
  
  for (const field of scoreFields) {
    const fieldData = result[field as keyof AnalysisResult] as any;
    if (typeof fieldData.score !== 'number') {
      throw new Error(`Invalid score for ${field}`);
    }
  }
  
  // ... resto do código original
}
```

---

### 2. Criar arquivo .env para desenvolvimento local

```bash
cd backend
cat > .env << 'EOF'
# OpenAI API Key (obtenha em https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-your-key-here

# Server Configuration
PORT=3001

# Puppeteer Configuration (opcional, para desenvolvimento local)
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
EOF
```

---

### 3. Melhorar tratamento de erros

Atualizar `backend/src/routes/analyze.ts`:

```typescript
router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        message: 'Por favor, forneça uma URL válida.'
      });
    }
    
    // Validate URL format
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return res.status(400).json({ 
          error: 'Invalid URL protocol',
          message: 'A URL deve começar com http:// ou https://'
        });
      }
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid URL format',
        message: 'Formato de URL inválido. Use: https://exemplo.com'
      });
    }
    
    console.log(`[${new Date().toISOString()}] Analyzing site: ${url}`);
    const analysisResult = await analyzeSite(url);
    
    console.log(`[${new Date().toISOString()}] Analysis completed for: ${url}`);
    res.json(analysisResult);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error analyzing site:`, error);
    
    // Mensagens de erro mais amigáveis
    let userMessage = 'Ocorreu um erro ao analisar o site. Por favor, tente novamente.';
    
    if (error instanceof Error) {
      if (error.message.includes('Chrome') || error.message.includes('browser')) {
        userMessage = 'Erro de configuração do servidor. Por favor, contate o administrador.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'O site demorou muito para responder. Tente novamente ou verifique se a URL está correta.';
      } else if (error.message.includes('net::ERR')) {
        userMessage = 'Não foi possível acessar o site. Verifique se a URL está correta e se o site está online.';
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to analyze site',
      message: userMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});
```

---

### 4. Configurar variáveis de ambiente no frontend

Criar `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://iachecksite.onrender.com
```

Atualizar `frontend/src/pages/index.tsx`:
```typescript
// ANTES
const response = await axios.post('https://iachecksite.onrender.com/api/analyze', { url })

// DEPOIS
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const response = await axios.post(`${API_URL}/api/analyze`, { url })
```

---

## 🧪 Testes Locais

### 1. Testar Backend Localmente

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Teste
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### 2. Testar Frontend Localmente

```bash
# Terminal 1 - Frontend
cd frontend
npm install
npm run dev

# Acesse: http://localhost:3000
```

### 3. Testar integração completa

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev

# Terminal 3 - Teste end-to-end
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}' | jq
```

---

## 📋 Checklist de Deploy

Antes de fazer deploy:

- [ ] Arquivo .env criado com OPENAI_API_KEY
- [ ] Dependências do Puppeteer configuradas
- [ ] Testes locais funcionando
- [ ] Variáveis de ambiente configuradas no Render.com
- [ ] Build executado sem erros: `npm run build`
- [ ] Git atualizado: `git add . && git commit -m "fix: configure production environment"`
- [ ] Deploy realizado
- [ ] Health check funcionando: `curl https://iachecksite.onrender.com/health`
- [ ] Análise funcionando: testar com URL real
- [ ] Frontend conectado corretamente

---

## 🆘 Troubleshooting

### Erro: "Could not find Chrome"
- **Causa:** Puppeteer não encontra o executável do Chrome
- **Solução:** Implementar Solução 1 (chrome-aws-lambda)

### Erro: "OPENAI_API_KEY is required"
- **Causa:** Variável de ambiente não configurada
- **Solução:** Configurar no Render.com dashboard

### Erro: "timeout of 30000ms exceeded"
- **Causa:** Site demora muito para carregar
- **Solução:** Aumentar timeout em `analyzer.ts`:
  ```typescript
  await page.setDefaultNavigationTimeout(60000); // 60 segundos
  ```

### Erro: "Cannot read properties of undefined"
- **Causa:** Estrutura de dados incompleta
- **Solução:** Implementar validação (ver seção 1 acima)

---

## 📞 Suporte

Se os problemas persistirem:

1. Verifique logs no Render.com: Dashboard > Logs
2. Verifique se todas as variáveis de ambiente estão configuradas
3. Teste localmente primeiro para isolar o problema
4. Considere migrar para Railway ou Fly.io se o problema for específico do Render.com

---

## ✅ Validação Final

Após implementar as soluções:

```bash
# 1. Health check
curl https://iachecksite.onrender.com/health

# 2. Análise de site
curl -X POST https://iachecksite.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' | jq

# 3. Verificar se retornou dados válidos
# Deve retornar JSON com: seo, accessibility, performance, etc.

# 4. Testar frontend
# Acesse: https://ia-check-site-rvrt.vercel.app/
# Insira uma URL e verifique se a análise funciona
```

Se todos os testes passarem, o projeto está funcionando corretamente! ✅

