# SiteCheck.ai

## Diagnóstico Inteligente de Websites

---

## O Problema

As agências de marketing digital enfrentam desafios diários:

- **Tempo perdido** analisando sites manualmente
- **Falta de padronização** nos relatórios para clientes
- **Dificuldade em demonstrar valor** técnico de forma clara
- **Custo alto** de ferramentas especializadas (SEMrush, Ahrefs, etc.)

---

## A Solução: SiteCheck.ai

Uma ferramenta **B2B** que analisa websites automaticamente e gera relatórios profissionais com IA.

### Como funciona:

1. **Insira a URL** do site do cliente
2. **Aguarde ~10 segundos** para a análise completa
3. **Baixe o PDF** personalizado com sua marca

---

## O Que Analisamos

| Categoria | O que verificamos |
|-----------|-------------------|
| **SEO** | Título, meta description, headings, robots.txt, sitemap |
| **Performance** | Tempo de carregamento, tamanho da página |
| **Segurança** | HTTPS, headers de segurança, bibliotecas vulneráveis |
| **Mobile** | Responsividade, viewport, áreas clicáveis |
| **Analytics** | Google Analytics, Meta Pixel, LinkedIn Insight |
| **SEO Técnico** | Canonical, Open Graph, dados estruturados |
| **Headers HTTP** | Cache-Control, ETag, compressão |

---

## Diferenciais

### 1. Relatório com IA
A inteligência artificial analisa os dados e gera recomendações **em português claro**, não técnico - perfeito para apresentar ao cliente.

### 2. White-Label Completo
- Logo da sua agência no PDF
- Nome da agência como título
- Cores personalizáveis
- Sem menção ao SiteCheck.ai

### 3. Rápido e Confiável
- Análise em ~10 segundos
- Cache inteligente (30 min)
- Rate limiting para estabilidade

---

## Exemplo de Relatório

O PDF inclui:

```
┌─────────────────────────────────────┐
│     [LOGO DA SUA AGÊNCIA]           │
│                                     │
│   Diagnóstico Completo de Website   │
│        www.cliente.com.br           │
│                                     │
├─────────────────────────────────────┤
│  VISÃO GERAL                        │
│                                     │
│  Pontuação Geral: 72/100 ████████░░ │
│                                     │
│  SEO           80  ████████░░       │
│  Acessibilidade 65 ██████░░░░       │
│  Performance   45  ████░░░░░░       │
│  Segurança    100  ██████████       │
│  Mobile        70  ███████░░░       │
├─────────────────────────────────────┤
│  ANÁLISE DETALHADA POR IA           │
│                                     │
│  "O site apresenta boa estrutura    │
│  de SEO, mas precisa melhorar o     │
│  tempo de carregamento..."          │
└─────────────────────────────────────┘
```

---

## Casos de Uso

### Para Prospecção
> "Olá, fiz uma análise gratuita do seu site e encontrei alguns pontos de melhoria. Posso te mostrar?"

### Para Clientes Ativos
> "Aqui está o relatório mensal do seu site. A pontuação subiu de 65 para 78 após nossas otimizações."

### Para Propostas Comerciais
> "Baseado nesta análise, recomendamos os seguintes serviços: [lista de serviços com preços]"

---

## Stack Técnica

| Componente | Tecnologia |
|------------|------------|
| **Backend** | Node.js + TypeScript + Express |
| **Análise** | Puppeteer + Chromium |
| **IA** | OpenAI GPT-4o-mini |
| **PDF** | PDFKit |
| **Frontend** | Next.js + TailwindCSS |
| **Hospedagem** | Render (API) + Vercel (Frontend) |

---

## Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│   Vercel    │────▶│   Render    │
│  (Browser)  │     │  (Frontend) │     │  (Backend)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────┬───────────┼───────────┐
                    ▼             ▼           ▼           ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Puppeteer│ │  OpenAI  │ │  PDFKit  │ │  Cache   │
              │(Análise) │ │   (IA)   │ │  (PDF)   │ │(30 min)  │
              └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## Recursos Implementados

- [x] Análise completa de 8 categorias
- [x] Geração de PDF profissional
- [x] Análise com IA em português
- [x] White-label (logo, nome, cores)
- [x] Cache de 30 minutos
- [x] Rate limiting (10 req/min)
- [x] Barras de score visuais
- [x] Interface responsiva

---

## Próximos Passos (Roadmap)

### Fase 2 - Melhorias
- [ ] Histórico de análises por usuário
- [ ] Comparação antes/depois
- [ ] Agendamento de análises automáticas
- [ ] Dashboard com métricas

### Fase 3 - Monetização
- [ ] Planos: Free (5/mês), Pro (50/mês), Agency (ilimitado)
- [ ] API para integrações
- [ ] Webhooks para automações

---

## Contato

**SiteCheck.ai**

- Website: [sitecheck-ai.vercel.app](https://sitecheck-ai.vercel.app)
- API: [iachecksite.onrender.com](https://iachecksite.onrender.com)

---

*Documento gerado em Janeiro/2026*
