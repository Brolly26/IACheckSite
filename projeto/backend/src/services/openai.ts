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
 * Linguagem simples para donos de negócio (não técnicos)
 */
function generateFallbackAnalysis(siteData: SiteData): string {
  const criticos: string[] = [];
  const importantes: string[] = [];
  const bomTer: string[] = [];
  const positivos: string[] = [];

  // Analisar HTTPS (CRÍTICO)
  if (siteData.isHttps) {
    positivos.push('Site tem conexão segura (cadeado verde)');
  } else {
    criticos.push(`**Site sem cadeado de segurança**
   Por que importa: Clientes não confiam em sites "Não Seguro". O Google também penaliza sites assim.
   Como resolver: Peça ao seu desenvolvedor/hospedagem para ativar o certificado SSL (geralmente é grátis).`);
  }

  // Analisar Performance (CRÍTICO se muito lento)
  if (siteData.loadTime <= 2) {
    positivos.push(`Site carrega rápido (${siteData.loadTime.toFixed(1)} segundos)`);
  } else if (siteData.loadTime <= 3) {
    importantes.push(`**Site um pouco lento (${siteData.loadTime.toFixed(1)} segundos)**
   Por que importa: Cada segundo a mais = 10% menos vendas. Pessoas desistem de esperar.
   Como resolver: Reduza o tamanho das imagens e remova plugins/scripts desnecessários.`);
  } else {
    criticos.push(`**Site muito lento (${siteData.loadTime.toFixed(1)} segundos)**
   Por que importa: 53% das pessoas abandonam sites que demoram mais de 3 segundos. Você está perdendo clientes!
   Como resolver: Comprima as imagens do site, use um serviço de hospedagem mais rápido, ou contrate otimização profissional.`);
  }

  // Analisar Título e Descrição para Google
  if (siteData.title && siteData.title.length > 0) {
    positivos.push('Site tem título configurado para o Google');
  } else {
    criticos.push(`**Site sem título para o Google**
   Por que importa: O Google não sabe como mostrar seu site nos resultados de busca. Você fica invisível!
   Como resolver: Defina um título claro que descreva seu negócio (ex: "Pizzaria do João - Delivery em SP").`);
  }

  if (siteData.metaDescription && siteData.metaDescription.length > 0) {
    positivos.push('Site tem descrição para o Google');
  } else {
    importantes.push(`**Site sem descrição para o Google**
   Por que importa: Quando seu site aparece no Google, não tem texto explicando o que você faz. Menos cliques!
   Como resolver: Escreva 1-2 frases descrevendo seu negócio e o que você oferece.`);
  }

  // Analisar Mobile
  if (siteData.hasViewportMeta) {
    positivos.push('Site funciona no celular');
  } else {
    criticos.push(`**Site não funciona bem no celular**
   Por que importa: 70% das pessoas acessam pelo celular. Se não funciona, você perde 7 de cada 10 visitantes!
   Como resolver: O site precisa ser "responsivo". Peça ao desenvolvedor para adaptar.`);
  }

  // Analisar Analytics
  const hasAnalytics = siteData.analyticsTools.googleAnalytics ||
                       siteData.analyticsTools.metaPixel ||
                       siteData.analyticsTools.linkedInInsightTag;

  if (hasAnalytics) {
    positivos.push('Ferramentas de análise de visitantes instaladas');
  } else {
    importantes.push(`**Você não sabe quantas pessoas visitam seu site**
   Por que importa: Sem dados, você não sabe se seu marketing está funcionando. É como dirigir de olhos fechados!
   Como resolver: Instale o Google Analytics (é grátis). Qualquer desenvolvedor faz em 10 minutos.`);
  }

  // Analisar Segurança
  const securityCount = [
    siteData.securityHeaders.xContentTypeOptions,
    siteData.securityHeaders.xFrameOptions,
    siteData.securityHeaders.strictTransportSecurity,
    siteData.securityHeaders.contentSecurityPolicy
  ].filter(Boolean).length;

  if (securityCount === 4) {
    positivos.push('Proteções de segurança completas');
  } else if (securityCount >= 2) {
    bomTer.push(`**Segurança pode ser melhorada**
   Por que importa: Proteções extras evitam que hackers invadam seu site ou roubem dados.
   Como resolver: Peça ao desenvolvedor para configurar as proteções de segurança do servidor.`);
  } else {
    importantes.push(`**Site com poucas proteções de segurança**
   Por que importa: Seu site está vulnerável a ataques. Hackers podem derrubar ou usar para golpes!
   Como resolver: Configure proteções de segurança no servidor. Um desenvolvedor resolve em algumas horas.`);
  }

  // Analisar Robots e Sitemap
  if (siteData.hasRobotsTxt && siteData.hasSitemapXml) {
    positivos.push('Arquivos para o Google encontrar seu site configurados');
  } else if (!siteData.hasRobotsTxt && !siteData.hasSitemapXml) {
    importantes.push(`**Google tem dificuldade para encontrar suas páginas**
   Por que importa: Sem os arquivos certos, o Google pode não encontrar todas as páginas do seu site.
   Como resolver: Crie um "mapa do site" (sitemap). A maioria dos criadores de site faz isso automaticamente.`);
  }

  // Analisar Tamanho
  if (siteData.totalSizeKB <= 1000) {
    positivos.push('Tamanho do site adequado');
  } else if (siteData.totalSizeKB <= 2000) {
    bomTer.push(`**Site um pouco pesado (${Math.round(siteData.totalSizeKB / 1024 * 10) / 10} MB)**
   Por que importa: Sites pesados demoram mais para carregar, especialmente no 4G.
   Como resolver: Comprima as imagens do site. Existem ferramentas online grátis para isso.`);
  } else {
    importantes.push(`**Site muito pesado (${Math.round(siteData.totalSizeKB / 1024 * 10) / 10} MB)**
   Por que importa: Demora muito para carregar, especialmente no celular. Visitantes desistem!
   Como resolver: Reduza o tamanho das imagens e remova arquivos desnecessários.`);
  }

  // Analisar Acessibilidade
  if (siteData.imagesWithoutAlt > 0) {
    bomTer.push(`**${siteData.imagesWithoutAlt} imagens sem descrição**
   Por que importa: Pessoas com deficiência visual não conseguem entender as imagens. O Google também usa isso.
   Como resolver: Adicione descrições às imagens (texto alternativo).`);
  }

  // Construir análise
  let analysis = `# Diagnóstico do Seu Site\n\n`;

  // Resumo executivo
  analysis += `## Resumo\n\n`;
  if (criticos.length === 0 && importantes.length <= 1) {
    analysis += `Seu site está em **boa forma**! Encontramos ${positivos.length} pontos positivos e apenas algumas melhorias opcionais.\n\n`;
  } else if (criticos.length >= 2) {
    analysis += `Seu site precisa de **atenção urgente**. Encontramos ${criticos.length} problemas críticos que podem estar custando clientes e vendas.\n\n`;
  } else {
    analysis += `Seu site está **razoável**, mas tem espaço para melhorar. Corrigindo os pontos abaixo, você pode atrair mais clientes.\n\n`;
  }

  // Pontos positivos
  if (positivos.length > 0) {
    analysis += `## O Que Está Funcionando Bem\n\n`;
    positivos.forEach(p => {
      analysis += `- ${p}\n`;
    });
    analysis += `\n`;
  }

  // Problemas críticos
  if (criticos.length > 0) {
    analysis += `## Problemas Críticos (Resolver Primeiro!)\n\n`;
    criticos.forEach(c => {
      analysis += `${c}\n\n`;
    });
  }

  // Problemas importantes
  if (importantes.length > 0) {
    analysis += `## Problemas Importantes\n\n`;
    importantes.forEach(i => {
      analysis += `${i}\n\n`;
    });
  }

  // Bom ter
  if (bomTer.length > 0) {
    analysis += `## Melhorias Opcionais\n\n`;
    bomTer.forEach(b => {
      analysis += `${b}\n\n`;
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
Você é um consultor de marketing digital explicando para um DONO DE NEGÓCIO (não técnico).

REGRAS IMPORTANTES:
- Use português SIMPLES, sem jargões técnicos
- Para cada problema, explique POR QUE importa (impacto no negócio/vendas)
- Dê recomendações PRÁTICAS e diretas
- Evite termos como: viewport, LCP, CLS, canonical, headers, meta tags
- Use linguagem como: "aparecer no Google", "carregar rápido", "funcionar no celular", "proteger contra hackers"

DADOS DO SITE ANALISADO:

Informações básicas:
- Nome/Título do site: ${siteData.title || 'Não configurado'}
- Descrição para o Google: ${siteData.metaDescription || 'Não configurada'}
- Tempo para carregar: ${siteData.loadTime.toFixed(2)} segundos
- Conexão segura (cadeado): ${siteData.isHttps ? 'Sim' : 'Não'}
- Imagens sem descrição: ${siteData.imagesWithoutAlt}
- Peso da página: ${siteData.totalSizeKB} KB

Organização do conteúdo:
- Título principal (H1): ${siteData.h1Count}
- Subtítulos: ${siteData.h2Count + siteData.h3Count}

Arquivos para o Google:
- Robots.txt: ${siteData.hasRobotsTxt ? 'OK' : 'Faltando'}
- Sitemap: ${siteData.hasSitemapXml ? 'OK' : 'Faltando'}

Segurança:
- Proteções ativas: ${[siteData.securityHeaders.xContentTypeOptions, siteData.securityHeaders.xFrameOptions, siteData.securityHeaders.strictTransportSecurity, siteData.securityHeaders.contentSecurityPolicy].filter(Boolean).length}/4
- Programas desatualizados: ${siteData.vulnerableLibraries.length > 0 ? siteData.vulnerableLibraries.join(', ') : 'Nenhum'}

Funciona no celular:
- Adaptado para celular: ${siteData.hasViewportMeta ? 'Sim' : 'Não'}
- Texto legível: ${siteData.fontSizeOnMobile === 'Adequado' ? 'Sim' : 'Não'}
- Botões fáceis de clicar: ${siteData.clickableAreasSufficient ? 'Sim' : 'Não'}

Ferramentas de análise de visitantes:
- Google Analytics: ${siteData.analyticsTools.googleAnalytics ? 'Instalado' : 'Não instalado'}
- Pixel do Facebook/Meta: ${siteData.analyticsTools.metaPixel ? 'Instalado' : 'Não instalado'}
- LinkedIn: ${siteData.analyticsTools.linkedInInsightTag ? 'Instalado' : 'Não instalado'}

Aparência nas redes sociais:
- Imagem de compartilhamento: ${siteData.metaTags.ogImage ? 'Configurada' : 'Não configurada'}

Velocidade em visitas repetidas:
- Cache configurado: ${siteData.headers.cacheControl ? 'Sim' : 'Não'}

GERE O RELATÓRIO COM ESTAS SEÇÕES:

## Resumo Executivo
(2-3 frases sobre a situação geral do site)

## O Que Está Funcionando Bem
(Liste os pontos positivos de forma simples)

## Problemas Que Estão Custando Dinheiro
(Para cada problema, explique o impacto no negócio. Ex: "Site lento = visitantes desistem = menos vendas")

## Próximos Passos (Por Prioridade)
(Liste 3-5 ações concretas, começando pela mais importante)
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
          content: "Você é um consultor de marketing digital falando com donos de negócio que NÃO entendem de tecnologia. Use linguagem simples e direta. Sempre explique POR QUE cada problema importa (impacto em vendas, clientes, dinheiro). Nunca use jargões técnicos. Exemplo: em vez de 'LCP alto', diga 'site demora para carregar'. Em vez de 'meta description ausente', diga 'o Google não sabe como descrever seu site'."
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
