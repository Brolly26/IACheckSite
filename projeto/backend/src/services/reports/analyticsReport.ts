import { Page } from 'puppeteer-core';
import { SiteData, CheckItem } from '../../utils/types';

/**
 * Runs an analytics and tracking check on the given URL
 * @param page The Puppeteer page (already navigated - no extra navigation needed)
 * @returns Analytics check data
 */
export async function runAnalyticsCheck(page: Page): Promise<{
  analyticsTools: SiteData['analyticsTools'],
  trackingScriptPlacement: SiteData['trackingScriptPlacement']
}> {
  console.log('Running analytics and tracking check...');

  // Page already loaded - no navigation needed

  // Check for analytics and tracking tools
  const analyticsData = await page.evaluate(() => {
    const scripts = Array.from(document.getElementsByTagName('script'));
    const scriptSources = scripts.map(script => script.src || script.innerHTML);
    const headScripts = Array.from(document.head.getElementsByTagName('script'));
    const bodyScripts = Array.from(document.body.getElementsByTagName('script'));
    
    // Check for Google Analytics
    const hasGoogleAnalytics = scriptSources.some(src => 
      src.includes('google-analytics.com') || 
      src.includes('googletagmanager.com') || 
      src.includes('gtag') || 
      src.includes('ga(')
    );
    
    // Check for Meta Pixel (Facebook Pixel)
    const hasMetaPixel = scriptSources.some(src => 
      src.includes('connect.facebook.net') || 
      src.includes('fbq(') || 
      src.includes('facebook-pixel')
    );
    
    // Check for LinkedIn Insight Tag
    const hasLinkedInInsightTag = scriptSources.some(src => 
      src.includes('linkedin.com/insight') || 
      src.includes('_linkedin_data_partner_id')
    );
    
    // Check for other common trackers
    const otherTrackers: string[] = [];
    
    if (scriptSources.some(src => src.includes('hotjar.com') || src.includes('hj('))) {
      otherTrackers.push('Hotjar');
    }
    
    if (scriptSources.some(src => src.includes('clarity.ms'))) {
      otherTrackers.push('Microsoft Clarity');
    }
    
    if (scriptSources.some(src => src.includes('matomo') || src.includes('piwik'))) {
      otherTrackers.push('Matomo/Piwik');
    }
    
    // Check script placement
    const inHead: string[] = [];
    const inBody: string[] = [];
    
    if (hasGoogleAnalytics) {
      const gaInHead = headScripts.some(script => 
        script.src?.includes('google-analytics.com') || 
        script.src?.includes('googletagmanager.com') || 
        script.innerHTML.includes('gtag') || 
        script.innerHTML.includes('ga(')
      );
      
      if (gaInHead) inHead.push('Google Analytics');
      else inBody.push('Google Analytics');
    }
    
    if (hasMetaPixel) {
      const metaInHead = headScripts.some(script => 
        script.src?.includes('connect.facebook.net') || 
        script.innerHTML.includes('fbq(') || 
        script.innerHTML.includes('facebook-pixel')
      );
      
      if (metaInHead) inHead.push('Meta Pixel');
      else inBody.push('Meta Pixel');
    }
    
    if (hasLinkedInInsightTag) {
      const linkedInInHead = headScripts.some(script => 
        script.src?.includes('linkedin.com/insight') || 
        script.innerHTML.includes('_linkedin_data_partner_id')
      );
      
      if (linkedInInHead) inHead.push('LinkedIn Insight Tag');
      else inBody.push('LinkedIn Insight Tag');
    }
    
    return {
      analyticsTools: {
        googleAnalytics: hasGoogleAnalytics,
        metaPixel: hasMetaPixel,
        linkedInInsightTag: hasLinkedInInsightTag,
        otherTrackers
      },
      trackingScriptPlacement: {
        inHead,
        inBody
      }
    };
  });
  
  return analyticsData;
}

/**
 * Calculates the analytics score based on the collected data
 * @param data The site data
 * @returns The analytics score (0-100)
 */
export function calculateAnalyticsScore(data: SiteData): number {
  let score = 100;
  
  // Check if any analytics tool is present
  const hasAnyAnalytics = 
    data.analyticsTools.googleAnalytics || 
    data.analyticsTools.metaPixel || 
    data.analyticsTools.linkedInInsightTag || 
    data.analyticsTools.otherTrackers.length > 0;
  
  if (!hasAnyAnalytics) {
    score -= 50; // Major penalty for no analytics
  } else {
    // Check for multiple analytics tools
    let analyticsCount = 0;
    if (data.analyticsTools.googleAnalytics) analyticsCount++;
    if (data.analyticsTools.metaPixel) analyticsCount++;
    if (data.analyticsTools.linkedInInsightTag) analyticsCount++;
    analyticsCount += data.analyticsTools.otherTrackers.length;
    
    if (analyticsCount === 1) {
      score -= 20; // Penalty for only one analytics tool
    } else if (analyticsCount > 3) {
      score -= 10; // Small penalty for too many analytics tools (performance impact)
    }
  }
  
  // Check script placement
  const totalScripts = data.trackingScriptPlacement.inHead.length + data.trackingScriptPlacement.inBody.length;
  if (totalScripts > 0) {
    const percentInHead = (data.trackingScriptPlacement.inHead.length / totalScripts) * 100;
    
    if (percentInHead < 50) {
      score -= 20; // Penalty for most scripts not in head
    } else if (percentInHead < 100) {
      score -= 10; // Small penalty for some scripts not in head
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Gets the analytics check items
 * @param data The site data
 * @returns Array of check items
 */
export function getAnalyticsCheckItems(data: SiteData): CheckItem[] {
  const hasAnyAnalytics = 
    data.analyticsTools.googleAnalytics || 
    data.analyticsTools.metaPixel || 
    data.analyticsTools.linkedInInsightTag || 
    data.analyticsTools.otherTrackers.length > 0;
  
  const items: CheckItem[] = [
    {
      name: 'Google Analytics',
      passed: data.analyticsTools.googleAnalytics,
      details: data.analyticsTools.googleAnalytics ? 
        'Google Analytics detectado no site.' : 
        'Google Analytics não detectado.'
    },
    {
      name: 'Meta Pixel',
      passed: data.analyticsTools.metaPixel,
      details: data.analyticsTools.metaPixel ? 
        'Meta Pixel (Facebook) detectado no site.' : 
        'Meta Pixel (Facebook) não detectado.'
    },
    {
      name: 'LinkedIn Insight Tag',
      passed: data.analyticsTools.linkedInInsightTag,
      details: data.analyticsTools.linkedInInsightTag ? 
        'LinkedIn Insight Tag detectado no site.' : 
        'LinkedIn Insight Tag não detectado.'
    }
  ];
  
  // Add other trackers
  if (data.analyticsTools.otherTrackers.length > 0) {
    items.push({
      name: 'Outras ferramentas de analytics',
      passed: true,
      details: `Outras ferramentas detectadas: ${data.analyticsTools.otherTrackers.join(', ')}`
    });
  } else {
    items.push({
      name: 'Outras ferramentas de analytics',
      passed: false,
      details: 'Nenhuma outra ferramenta de analytics detectada.'
    });
  }
  
  // Add script placement check
  const totalScripts = data.trackingScriptPlacement.inHead.length + data.trackingScriptPlacement.inBody.length;
  if (totalScripts > 0) {
    const percentInHead = (data.trackingScriptPlacement.inHead.length / totalScripts) * 100;
    
    items.push({
      name: 'Posicionamento dos scripts',
      passed: percentInHead >= 50,
      details: percentInHead === 100 ?
        'Todos os scripts de analytics estão corretamente posicionados no <head>.' :
        percentInHead >= 50 ?
          `${Math.round(percentInHead)}% dos scripts de analytics estão no <head>, o restante está no <body>.` :
          `Apenas ${Math.round(percentInHead)}% dos scripts de analytics estão no <head>, a maioria está no <body>.`
    });
  }
  
  return items;
}

/**
 * Gets the analytics status based on the score
 * @param score The analytics score
 * @returns The analytics status
 */
export function getAnalyticsStatus(score: number): 'Completo' | 'Parcial' | 'Ausente' {
  if (score >= 80) return 'Completo';
  if (score >= 40) return 'Parcial';
  return 'Ausente';
}

/**
 * Gets the analytics details based on the score
 * @param data The site data
 * @param score The analytics score
 * @returns The analytics details
 */
export function getAnalyticsDetails(data: SiteData, score: number): string {
  const hasAnyAnalytics = 
    data.analyticsTools.googleAnalytics || 
    data.analyticsTools.metaPixel || 
    data.analyticsTools.linkedInInsightTag || 
    data.analyticsTools.otherTrackers.length > 0;
  
  if (score >= 80) {
    return 'Implementação completa de analytics. O site utiliza múltiplas ferramentas de rastreamento corretamente posicionadas.';
  } else if (score >= 40) {
    return 'Implementação parcial de analytics. O site utiliza algumas ferramentas de rastreamento, mas pode melhorar a implementação.';
  } else {
    return hasAnyAnalytics ?
      'Implementação inadequada de analytics. O site tem poucas ferramentas de rastreamento ou elas estão mal posicionadas.' :
      'Nenhuma ferramenta de analytics detectada. O site não está coletando dados de visitantes.';
  }
}
