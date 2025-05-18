# Site Analyzer - Diagnóstico Técnico Completo

Uma plataforma completa para análise técnica de sites, oferecendo diagnósticos detalhados de SEO, performance, acessibilidade, segurança, mobile, analytics e muito mais.

## Visão Geral

O Site Analyzer é uma ferramenta que permite aos usuários obter uma análise técnica completa de qualquer site, fornecendo insights valiosos sobre diversos aspectos técnicos. A plataforma utiliza Puppeteer para coletar dados do site e gera relatórios detalhados com recomendações práticas.

## Funcionalidades

### Relatórios Básicos
- **SEO**: Análise de meta tags, estrutura de headings, robots.txt, sitemap.xml e outros fatores de SEO.
- **Acessibilidade**: Verificação de textos alternativos em imagens, estrutura semântica e outros aspectos de acessibilidade.
- **Performance**: Análise de tempo de carregamento, tamanho total dos arquivos e outros fatores de performance.

### Relatórios Avançados
- **Segurança**: Verificação de HTTPS, headers de segurança (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Content-Security-Policy) e detecção de bibliotecas JavaScript vulneráveis.
- **Mobile e Responsividade**: Análise de viewport meta tag, tamanho de fontes em dispositivos móveis e áreas clicáveis adequadas.
- **Analytics e Rastreamento**: Detecção de ferramentas de analytics (Google Analytics, Meta Pixel, LinkedIn Insight Tag) e verificação do posicionamento correto dos scripts.
- **SEO Técnico**: Verificação de meta tags técnicas, canonical URL, Open Graph, dados estruturados e arquivos de suporte para motores de busca.
- **Headers HTTP e Cache**: Análise de headers de resposta e políticas de cache para performance e SEO.

### Análise por IA
- Geração de relatório detalhado com diagnóstico geral, pontos positivos, áreas de melhoria e recomendações práticas.

## Tecnologias Utilizadas

### Backend
- Node.js com TypeScript
- Express para API REST
- Puppeteer para web scraping e análise de sites
- OpenAI API para geração de análises por IA

### Frontend
- Next.js com React
- TypeScript
- Tailwind CSS para estilização
- Axios para requisições HTTP

## Estrutura do Projeto

```
projeto/
├── backend/
│   ├── src/
│   │   ├── index.ts                # Ponto de entrada da aplicação
│   │   ├── routes/                 # Rotas da API
│   │   │   └── analyze.ts          # Rota de análise de sites
│   │   ├── services/               # Serviços da aplicação
│   │   │   ├── analyzer.ts         # Serviço principal de análise
│   │   │   ├── openai.ts           # Serviço de integração com OpenAI
│   │   │   └── reports/            # Módulos de relatórios específicos
│   │   │       ├── index.ts        # Exportação de todos os relatórios
│   │   │       ├── securityReport.ts
│   │   │       ├── mobileReport.ts
│   │   │       ├── analyticsReport.ts
│   │   │       ├── technicalSeoReport.ts
│   │   │       └── httpHeadersReport.ts
│   │   └── utils/                  # Utilitários
│   │       └── types.ts            # Tipos TypeScript
│   ├── .env                        # Variáveis de ambiente
│   ├── .env.example                # Exemplo de variáveis de ambiente
│   ├── package.json                # Dependências do backend
│   └── tsconfig.json               # Configuração do TypeScript
├── frontend/
│   ├── src/
│   │   ├── components/             # Componentes React
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ReportCard.tsx      # Card de relatório simples
│   │   │   └── DetailedReportCard.tsx # Card de relatório detalhado
│   │   ├── pages/                  # Páginas da aplicação
│   │   │   ├── _app.tsx
│   │   │   └── index.tsx           # Página principal
│   │   └── styles/                 # Estilos
│   │       └── globals.css         # Estilos globais
│   ├── public/                     # Arquivos públicos
│   ├── package.json                # Dependências do frontend
│   └── tailwind.config.js          # Configuração do Tailwind CSS
├── example-response.json           # Exemplo de resposta da API
└── README.md                       # Documentação do projeto
```

## Instalação e Execução

### Pré-requisitos
- Node.js 14+ instalado
- Chave de API da OpenAI

### Backend
1. Navegue até a pasta do backend:
   ```
   cd backend
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Crie um arquivo `.env` baseado no `.env.example` e adicione sua chave de API da OpenAI:
   ```
   OPENAI_API_KEY=sua-chave-aqui
   PORT=3001
   ```

4. Inicie o servidor:
   ```
   npm run dev
   ```

### Frontend
1. Navegue até a pasta do frontend:
   ```
   cd frontend
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```
   npm run dev
   ```

4. Acesse a aplicação em `http://localhost:3000`

## Uso

1. Acesse a aplicação no navegador
2. Insira a URL do site que deseja analisar
3. Clique em "Analisar"
4. Aguarde a análise ser concluída
5. Explore os relatórios detalhados e as recomendações

## Exemplo de Resposta da API

Veja o arquivo `example-response.json` para um exemplo completo da resposta da API.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT.
