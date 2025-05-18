// Site data collected by Puppeteer
export interface SiteData {
  title: string;
  metaDescription: string;
  loadTime: number;
  isHttps: boolean;
  imagesWithoutAlt: number;
  totalSizeKB: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
  
  // Security data
  securityHeaders: {
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    strictTransportSecurity: boolean;
    contentSecurityPolicy: boolean;
  };
  vulnerableLibraries: string[];
  
  // Mobile and responsiveness data
  hasViewportMeta: boolean;
  fontSizeOnMobile: string;
  clickableAreasSufficient: boolean;
  
  // Analytics and tracking data
  analyticsTools: {
    googleAnalytics: boolean;
    metaPixel: boolean;
    linkedInInsightTag: boolean;
    otherTrackers: string[];
  };
  trackingScriptPlacement: {
    inHead: string[];
    inBody: string[];
  };
  
  // Technical SEO data
  metaTags: {
    title: boolean;
    description: boolean;
    canonical: boolean;
    ogImage: boolean;
  };
  hasStructuredData: boolean;
  
  // HTTP headers and cache data
  headers: {
    cacheControl: string;
    etag: string;
    expires: string;
  };
}

// Analysis result returned to the frontend
export interface AnalysisResult {
  seo: {
    score: number;
    details: string;
    items?: CheckItem[];
  };
  accessibility: {
    score: number;
    details: string;
    items?: CheckItem[];
  };
  performance: {
    score: number;
    details: string;
    items?: CheckItem[];
  };
  security: {
    score: number;
    details: string;
    status: 'Seguro' | 'Atenção' | 'Crítico';
    items: CheckItem[];
  };
  mobile: {
    score: number;
    details: string;
    status: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico';
    items: CheckItem[];
  };
  analytics: {
    score: number;
    details: string;
    status: 'Completo' | 'Parcial' | 'Ausente';
    items: CheckItem[];
  };
  technicalSeo: {
    score: number;
    details: string;
    status: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico';
    items: CheckItem[];
  };
  httpHeaders: {
    score: number;
    details: string;
    status: 'Otimizado' | 'Adequado' | 'Inadequado';
    items: CheckItem[];
  };
  aiAnalysis: string;
}

// Interface for individual check items
export interface CheckItem {
  name: string;
  passed: boolean;
  details?: string;
}
