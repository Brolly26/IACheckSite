import { SiteData } from '../utils/types';
import OpenAI from "openai";

// Inicializa a API do OpenAI apenas se a chave estiver disponível
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.warn('Failed to initialize OpenAI:', error);
  }
}

/**
 * Gera uma análise baseada nos dados coletados (fallback quando OpenAI não está disponível)
 */
function generateFallbackAnalysis(siteData: SiteData): string {
  const pontosPositivos: string[] = [];
  const melhorias: string[] = [];
  const recomendacoes: string[] = [];

  // Analisar SEO
  if (siteData.title && siteData.title.length > 0) {
    pontosPositivos.push(`**Título da página**: "${siteData.title}" está configurado.`);
  } else {
    melhorias.push('**Título da página ausente**: Adicione uma tag `<title>` descritiva.');
    recomendacoes.push('Configure um título único e descritivo para cada página (50-60 caracteres).');
  }

  if (siteData.metaDescription && siteData.metaDescription.length > 0) {
    pontosPositivos.push(`**Meta description**: Configurada (${siteData.metaDescription.length} caracteres).`);
  } else {
    melhorias.push('**Meta description ausente**: Adicione uma meta description atrativa.');
    recomendacoes.push('Crie uma meta description de 120-160 caracteres que resuma o conteúdo da página.');
  }

  if (siteData.h1Count === 1) {
    pontosPositivos.push('**Estrutura de headings**: Uma tag H1 encontrada (recomendado).');
  } else if (siteData.h1Count === 0) {
    melhorias.push('**Nenhuma tag H1 encontrada**: Adicione uma tag H1 principal.');
    recomendacoes.push('Use uma única tag H1 por página com o título principal do conteúdo.');
  } else {
    melhorias.push(`**Múltiplas tags H1 (${siteData.h1Count})**: Use apenas uma tag H1 por página.`);
  }

  // Analisar HTTPS
  if (siteData.isHttps) {
    pontosPositivos.push('**HTTPS**: Conexão segura implementada.');
  } else {
    melhorias.push('**HTTPS ausente**: Configure SSL/TLS para segurança.');
    recomendacoes.push('Implemente certificado SSL para habilitar HTTPS e melhorar segurança e SEO.');
  }

  // Analisar Performance
  if (siteData.loadTime <= 2) {
    pontosPositivos.push(`**Performance**: Tempo de carregamento excelente (${siteData.loadTime.toFixed(2)}s).`);
  } else if (siteData.loadTime <= 3) {
    pontosPositivos.push(`**Performance**: Tempo de carregamento bom (${siteData.loadTime.toFixed(2)}s).`);
  } else {
    melhorias.push(`**Performance**: Tempo de carregamento lento (${siteData.loadTime.toFixed(2)}s).`);
    recomendacoes.push('Otimize imagens, use CDN e minimize recursos para melhorar o tempo de carregamento.');
  }

  if (siteData.totalSizeKB <= 1000) {
    pontosPositivos.push(`**Tamanho da página**: Adequado (${siteData.totalSizeKB} KB).`);
  } else {
    melhorias.push(`**Tamanho da página**: Grande (${siteData.totalSizeKB} KB).`);
    recomendacoes.push('Comprima imagens e minimize arquivos CSS/JS para reduzir o tamanho da página.');
  }

  // Analisar Acessibilidade
  if (siteData.imagesWithoutAlt === 0) {
    pontosPositivos.push('**Acessibilidade**: Todas as imagens possuem texto alternativo.');
  } else {
    melhorias.push(`**Acessibilidade**: ${siteData.imagesWithoutAlt} imagem(ns) sem texto alternativo.`);
    recomendacoes.push('Adicione atributo `alt` descritivo em todas as imagens para melhorar acessibilidade.');
  }

  // Analisar Segurança
  const securityHeadersCount = [
    siteData.securityHeaders.xContentTypeOptions,
    siteData.securityHeaders.xFrameOptions,
    siteData.securityHeaders.strictTransportSecurity,
    siteData.securityHeaders.contentSecurityPolicy
  ].filter(Boolean).length;

  if (securityHeadersCount === 4) {
    pontosPositivos.push('**Segurança**: Todos os headers de segurança configurados.');
  } else {
    melhorias.push(`**Segurança**: Apenas ${securityHeadersCount}/4 headers de segurança configurados.`);
    recomendacoes.push('Configure headers de segurança: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security e Content-Security-Policy.');
  }

  if (siteData.vulnerableLibraries.length > 0) {
    melhorias.push(`**Bibliotecas vulneráveis**: ${siteData.vulnerableLibraries.length} biblioteca(s) com vulnerabilidades conhecidas.`);
    recomendacoes.push(`Atualize as seguintes bibliotecas: ${siteData.vulnerableLibraries.join(', ')}.`);
  }

  // Analisar Mobile
  if (siteData.hasViewportMeta) {
    pontosPositivos.push('**Mobile**: Viewport meta tag configurada.');
  } else {
    melhorias.push('**Mobile**: Viewport meta tag ausente.');
    recomendacoes.push('Adicione `<meta name="viewport" content="width=device-width, initial-scale=1.0">` no `<head>`.');
  }

  // Analisar Analytics
  const hasAnalytics = siteData.analyticsTools.googleAnalytics || 
                       siteData.analyticsTools.metaPixel || 
                       siteData.analyticsTools.linkedInInsightTag;
  
  if (hasAnalytics) {
    pontosPositivos.push('**Analytics**: Ferramentas de rastreamento configuradas.');
  } else {
    melhorias.push('**Analytics**: Nenhuma ferramenta de analytics detectada.');
    recomendacoes.push('Configure Google Analytics, Meta Pixel ou outras ferramentas de rastreamento.');
  }

  // Analisar SEO Técnico
  if (siteData.hasStructuredData) {
    pontosPositivos.push('**SEO Técnico**: Dados estruturados (Schema.org) encontrados.');
  } else {
    melhorias.push('**SEO Técnico**: Dados estruturados ausentes.');
    recomendacoes.push('Implemente dados estruturados (JSON-LD) para melhorar a exibição nos resultados de busca.');
  }

  // Analisar Cache
  if (siteData.headers.cacheControl || siteData.headers.etag) {
    pontosPositivos.push('**Cache**: Headers de cache configurados.');
  } else {
    melhorias.push('**Cache**: Headers de cache não configurados.');
    recomendacoes.push('Configure Cache-Control e ETag para melhorar performance e reduzir carga no servidor.');
  }

  // Analisar Robots.txt e Sitemap
  if (siteData.hasRobotsTxt) {
    pontosPositivos.push('**Robots.txt**: Arquivo encontrado.');
  } else {
    melhorias.push('**Robots.txt**: Arquivo ausente.');
    recomendacoes.push('Crie um arquivo robots.txt na raiz do site para orientar crawlers.');
  }

  if (siteData.hasSitemapXml) {
    pontosPositivos.push('**Sitemap.xml**: Arquivo encontrado.');
  } else {
    melhorias.push('**Sitemap.xml**: Arquivo ausente.');
    recomendacoes.push('Crie um sitemap.xml para facilitar a indexação do site pelos motores de busca.');
  }

  // Construir análise
  let analysis = `# Diagnóstico Técnico do Site\n\n`;
  
  analysis += `## Diagnóstico Geral\n\n`;
  if (pontosPositivos.length > melhorias.length) {
    analysis += `O site apresenta uma implementação técnica de qualidade **boa**, com vários pontos positivos identificados. Existem algumas oportunidades de melhoria que podem elevar ainda mais a qualidade técnica do site.\n\n`;
  } else if (melhorias.length > pontosPositivos.length) {
    analysis += `O site apresenta uma implementação técnica que precisa de **melhorias significativas**. Vários aspectos importantes não estão configurados ou podem ser otimizados.\n\n`;
  } else {
    analysis += `O site apresenta uma implementação técnica de qualidade **média**, com pontos positivos e áreas que precisam de atenção.\n\n`;
  }

  if (pontosPositivos.length > 0) {
    analysis += `## Pontos Positivos\n\n`;
    pontosPositivos.forEach(ponto => {
      analysis += `- ${ponto}\n`;
    });
    analysis += `\n`;
  }

  if (melhorias.length > 0) {
    analysis += `## O Que Precisa Melhorar\n\n`;
    melhorias.forEach(melhoria => {
      analysis += `- ${melhoria}\n`;
    });
    analysis += `\n`;
  }

  if (recomendacoes.length > 0) {
    analysis += `## Recomendações Simples\n\n`;
    recomendacoes.forEach((rec, index) => {
      analysis += `${index + 1}. ${rec}\n`;
    });
  }

  return analysis;
}

export async function generateAIAnalysis(siteData: SiteData): Promise<string> {
  // Se não tiver OpenAI configurado, usar análise baseada em regras
  if (!openai || !process.env.OPENAI_API_KEY) {
    console.log('⚠️  OpenAI not available, using fallback analysis based on collected data');
    return generateFallbackAnalysis(siteData);
  }

  try {
    console.log('🤖 Generating AI analysis with OpenAI...');

    const prompt = `
Você é um especialista técnico em SEO, acessibilidade, performance web, segurança e análise técnica de sites. Receberá dados técnicos de um site e deve gerar um relatório em português claro, com explicações acessíveis para leigos e sugestões práticas de melhoria. Destaque os principais erros e boas práticas.

Dados básicos:
- Título da página: ${siteData.title}
- Meta description: ${siteData.metaDescription}
- Tempo de carregamento: ${siteData.loadTime.toFixed(2)} segundos
- HTTPS ativo: ${siteData.isHttps ? 'Sim' : 'Não'}
- Imagens sem alt: ${siteData.imagesWithoutAlt}
- Tamanho total dos arquivos: ${siteData.totalSizeKB} KB
- Tags H1: ${siteData.h1Count}
- Tags H2: ${siteData.h2Count}
- Tags H3: ${siteData.h3Count}
- Robots.txt: ${siteData.hasRobotsTxt ? 'Presente' : 'Ausente'}
- Sitemap.xml: ${siteData.hasSitemapXml ? 'Presente' : 'Ausente'}

Dados de segurança:
- X-Content-Type-Options: ${siteData.securityHeaders.xContentTypeOptions ? 'Presente' : 'Ausente'}
- X-Frame-Options: ${siteData.securityHeaders.xFrameOptions ? 'Presente' : 'Ausente'}
- Strict-Transport-Security: ${siteData.securityHeaders.strictTransportSecurity ? 'Presente' : 'Ausente'}
- Content-Security-Policy: ${siteData.securityHeaders.contentSecurityPolicy ? 'Presente' : 'Ausente'}
- Bibliotecas vulneráveis: ${siteData.vulnerableLibraries.length > 0 ? siteData.vulnerableLibraries.join(', ') : 'Nenhuma detectada'}

Dados de mobile e responsividade:
- Viewport meta tag: ${siteData.hasViewportMeta ? 'Presente' : 'Ausente'}
- Tamanho de fonte em mobile: ${siteData.fontSizeOnMobile}
- Áreas clicáveis adequadas: ${siteData.clickableAreasSufficient ? 'Sim' : 'Não'}

Dados de analytics e rastreamento:
- Google Analytics: ${siteData.analyticsTools.googleAnalytics ? 'Presente' : 'Ausente'}
- Meta Pixel: ${siteData.analyticsTools.metaPixel ? 'Presente' : 'Ausente'}
- LinkedIn Insight Tag: ${siteData.analyticsTools.linkedInInsightTag ? 'Presente' : 'Ausente'}
- Outros trackers: ${siteData.analyticsTools.otherTrackers.length > 0 ? siteData.analyticsTools.otherTrackers.join(', ') : 'Nenhum'}
- Scripts no head: ${siteData.trackingScriptPlacement.inHead.length > 0 ? siteData.trackingScriptPlacement.inHead.join(', ') : 'Nenhum'}
- Scripts no body: ${siteData.trackingScriptPlacement.inBody.length > 0 ? siteData.trackingScriptPlacement.inBody.join(', ') : 'Nenhum'}

Dados técnicos de SEO:
- Meta tags: Title (${siteData.metaTags.title ? 'Presente' : 'Ausente'}), Description (${siteData.metaTags.description ? 'Presente' : 'Ausente'}), Canonical (${siteData.metaTags.canonical ? 'Presente' : 'Ausente'}), OG Image (${siteData.metaTags.ogImage ? 'Presente' : 'Ausente'})
- Dados estruturados: ${siteData.hasStructuredData ? 'Presentes' : 'Ausentes'}

Dados de headers HTTP e cache:
- Cache-Control: ${siteData.headers.cacheControl || 'Não configurado'}
- ETag: ${siteData.headers.etag ? 'Presente' : 'Ausente'}
- Expires: ${siteData.headers.expires || 'Não configurado'}

Gere um relatório organizado com seções:
1. Diagnóstico geral
2. Pontos positivos
3. O que precisa melhorar
4. Recomendações simples
`;

    // Timeout para requisição de 30 segundos
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API request timed out')), 30000);
    });

    const apiPromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em análise técnica de websites. Responda sempre em português BR de forma clara, objetiva e acionável. Foque em recomendações práticas que o dono do site pode implementar."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    }).then(response => {
      const aiText = response.choices[0]?.message?.content?.trim();
      return aiText || generateFallbackAnalysis(siteData);
    });

    return await Promise.race([apiPromise, timeoutPromise]);
  } catch (error: any) {
    console.error('❌ Error generating AI analysis with OpenAI:', error?.message || error);
    
    // Verificar se é erro de créditos/autenticação
    if (error?.status === 401 || error?.message?.includes('Incorrect API key') || error?.message?.includes('insufficient_quota')) {
      console.warn('⚠️  OpenAI API key issue or insufficient credits. Using fallback analysis.');
    }
    
    // Usar análise baseada em regras como fallback
    return generateFallbackAnalysis(siteData);
  }
}
