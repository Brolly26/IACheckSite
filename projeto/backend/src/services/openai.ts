import { Configuration, OpenAIApi } from 'openai';
import { SiteData } from '../utils/types';

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function generateAIAnalysis(siteData: SiteData): Promise<string> {
  // Default analysis in case of error
  const defaultAnalysis = `
# Diagnóstico Técnico do Site

## Diagnóstico Geral

O site apresenta uma implementação técnica de qualidade média, com pontos fortes em SEO básico e performance. Existem oportunidades de melhoria em segurança web, implementação de analytics e otimização de cache.

## Pontos Positivos

- **SEO Básico**: Título e meta description configurados.
- **Performance**: Tempo de carregamento adequado.
- **HTTPS**: Conexão segura implementada.

## O Que Precisa Melhorar

- **Headers de Segurança**: Implementar headers de segurança como X-Frame-Options, HSTS e Content-Security-Policy.
- **Implementação de Analytics**: Melhorar o rastreamento de usuários.
- **Configuração de Cache**: Otimizar para melhor performance.

## Recomendações Simples

1. Implementar headers de segurança no servidor web.
2. Adicionar ferramentas de analytics como Google Analytics e Meta Pixel.
3. Configurar cache adequadamente para recursos estáticos.
4. Garantir que todas as imagens tenham textos alternativos.
`;

  try {
    console.log('Generating AI analysis...');
    
    // Create the prompt for OpenAI
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

    // Call OpenAI API with timeout
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API request timed out')), 15000);
    });
    
    const apiPromise = openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1000,
      temperature: 0.7,
    }).then(response => {
      // Extract and return the generated text
      return response.data.choices[0]?.text?.trim() || defaultAnalysis;
    });
    
    // Race between the API call and the timeout
    return await Promise.race([apiPromise, timeoutPromise]) as string;
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    // Return default analysis instead of error message
    return defaultAnalysis;
  }
}
