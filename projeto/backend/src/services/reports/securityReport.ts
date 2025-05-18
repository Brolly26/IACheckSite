import * as puppeteer from 'puppeteer';
import { SiteData, CheckItem } from '../../utils/types';

// Extend Window interface to include jQuery and bootstrap
declare global {
  interface Window {
    jQuery?: {
      fn: {
        jquery: string;
      };
    };
    bootstrap?: {
      Alert?: {
        VERSION?: string;
      };
      version?: string;
    };
  }
}

/**
 * Runs a security check on the given URL
 * @param url The URL to check
 * @returns Security check data
 */
export async function runSecurityCheck(page: puppeteer.Page, url: string): Promise<{
  securityHeaders: SiteData['securityHeaders'],
  vulnerableLibraries: string[]
}> {
  console.log('Running security check...');
  
  // Check if the site uses HTTPS (already done in the main analyzer)
  
  // Check security headers
  const response = await page.goto(url, { waitUntil: 'networkidle2' });
  const headers = response?.headers() || {};
  
  const securityHeaders = {
    xContentTypeOptions: headers['x-content-type-options']?.toLowerCase() === 'nosniff',
    xFrameOptions: !!headers['x-frame-options'],
    strictTransportSecurity: !!headers['strict-transport-security'],
    contentSecurityPolicy: !!headers['content-security-policy'],
  };
  
  // Detect vulnerable libraries (simplified version)
  // In a real implementation, this would use a vulnerability database like Snyk
  const vulnerableLibraries = await page.evaluate(() => {
    const libraries: string[] = [];
    
    // Check for jQuery and its version
    if (typeof window.jQuery !== 'undefined') {
      const version = window.jQuery.fn.jquery;
      // Example: Consider jQuery < 3.0.0 as vulnerable
      if (version && version.split('.')[0] < '3') {
        libraries.push(`jQuery ${version}`);
      }
    }
    
    // Check for outdated Bootstrap
    const bootstrapVersion = typeof window.bootstrap !== 'undefined' ? 
      window.bootstrap.Alert?.VERSION || window.bootstrap.version : null;
    if (bootstrapVersion && bootstrapVersion.split('.')[0] < '5') {
      libraries.push(`Bootstrap ${bootstrapVersion}`);
    }
    
    return libraries;
  }).catch(() => []);
  
  return {
    securityHeaders,
    vulnerableLibraries
  };
}

/**
 * Calculates the security score based on the collected data
 * @param data The site data
 * @returns The security score (0-100)
 */
export function calculateSecurityScore(data: SiteData): number {
  let score = 100;
  
  // HTTPS check
  if (!data.isHttps) {
    score -= 40; // Major penalty for no HTTPS
  }
  
  // Security headers
  if (!data.securityHeaders.xContentTypeOptions) score -= 10;
  if (!data.securityHeaders.xFrameOptions) score -= 10;
  if (!data.securityHeaders.strictTransportSecurity) score -= 10;
  if (!data.securityHeaders.contentSecurityPolicy) score -= 10;
  
  // Vulnerable libraries
  if (data.vulnerableLibraries.length > 0) {
    score -= Math.min(30, data.vulnerableLibraries.length * 10);
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Gets the security check items
 * @param data The site data
 * @returns Array of check items
 */
export function getSecurityCheckItems(data: SiteData): CheckItem[] {
  return [
    {
      name: 'HTTPS',
      passed: data.isHttps,
      details: data.isHttps ? 
        'O site utiliza HTTPS, garantindo conexão segura.' : 
        'O site não utiliza HTTPS, o que é crítico para segurança.'
    },
    {
      name: 'X-Content-Type-Options',
      passed: data.securityHeaders.xContentTypeOptions,
      details: data.securityHeaders.xContentTypeOptions ?
        'Header X-Content-Type-Options configurado corretamente.' :
        'Header X-Content-Type-Options ausente, o que pode permitir ataques MIME type sniffing.'
    },
    {
      name: 'X-Frame-Options',
      passed: data.securityHeaders.xFrameOptions,
      details: data.securityHeaders.xFrameOptions ?
        'Header X-Frame-Options presente, protegendo contra clickjacking.' :
        'Header X-Frame-Options ausente, tornando o site vulnerável a clickjacking.'
    },
    {
      name: 'Strict-Transport-Security',
      passed: data.securityHeaders.strictTransportSecurity,
      details: data.securityHeaders.strictTransportSecurity ?
        'Header HSTS configurado, forçando conexões HTTPS.' :
        'Header HSTS ausente, permitindo possíveis downgrade attacks.'
    },
    {
      name: 'Content-Security-Policy',
      passed: data.securityHeaders.contentSecurityPolicy,
      details: data.securityHeaders.contentSecurityPolicy ?
        'Content Security Policy implementada, reduzindo riscos de XSS.' :
        'Content Security Policy ausente, aumentando vulnerabilidade a XSS.'
    },
    {
      name: 'Bibliotecas Vulneráveis',
      passed: data.vulnerableLibraries.length === 0,
      details: data.vulnerableLibraries.length === 0 ?
        'Nenhuma biblioteca JavaScript vulnerável detectada.' :
        `Detectadas ${data.vulnerableLibraries.length} bibliotecas potencialmente vulneráveis: ${data.vulnerableLibraries.join(', ')}`
    }
  ];
}

/**
 * Gets the security status based on the score
 * @param score The security score
 * @returns The security status
 */
export function getSecurityStatus(score: number): 'Seguro' | 'Atenção' | 'Crítico' {
  if (score >= 80) return 'Seguro';
  if (score >= 50) return 'Atenção';
  return 'Crítico';
}

/**
 * Gets the security details based on the score
 * @param data The site data
 * @param score The security score
 * @returns The security details
 */
export function getSecurityDetails(data: SiteData, score: number): string {
  if (score >= 80) {
    return 'Boas práticas de segurança implementadas. Site utiliza HTTPS e headers de segurança adequados.';
  } else if (score >= 50) {
    return 'Segurança média. Algumas medidas importantes estão ausentes, como headers de segurança específicos.';
  } else {
    return 'Segurança crítica. O site pode não utilizar HTTPS ou está faltando a maioria dos headers de segurança essenciais.';
  }
}
