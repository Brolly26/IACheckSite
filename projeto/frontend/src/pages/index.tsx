import { useState } from 'react'
import axios from 'axios'
import { FaSearch, FaSpinner, FaShieldAlt, FaMobileAlt, FaChartLine, FaSearch as FaSearchIcon, FaServer } from 'react-icons/fa'
import ReportCard from '@/components/ReportCard'
import DetailedReportCard from '@/components/DetailedReportCard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface CheckItem {
  name: string;
  passed: boolean;
  details?: string;
}

interface ReportData {
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
    status: string;
    items: CheckItem[];
  };
  mobile: {
    score: number;
    details: string;
    status: string;
    items: CheckItem[];
  };
  analytics: {
    score: number;
    details: string;
    status: string;
    items: CheckItem[];
  };
  technicalSeo: {
    score: number;
    details: string;
    status: string;
    items: CheckItem[];
  };
  httpHeaders: {
    score: number;
    details: string;
    status: string;
    items: CheckItem[];
  };
  aiAnalysis: string;
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')
  
  // Function to handle PDF download
  const handleDownloadPdf = async () => {
    if (!reportData) return;
    
    try {
      setIsDownloadingPdf(true);
      setPdfError('');
      
      // Make a POST request to the backend to generate the PDF
      const response = await axios.post('http://localhost:3001/api/generate-pdf', reportData, {
        responseType: 'blob' // Important for handling binary data
      });
      
      // Create a blob URL for the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element and trigger a download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'site-analysis-report.pdf');
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setPdfError('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url) {
      setError('Por favor, insira uma URL válida')
      return
    }
    
    try {
      setIsLoading(true)
      setError('')
      setReportData(null)
      
      const response = await axios.post('http://localhost:3001/api/analyze', { url })
      setReportData(response.data)
    } catch (err) {
      setError('Ocorreu um erro ao analisar o site. Por favor, tente novamente.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-textDark">
            Diagnóstico Inteligente para seu Site
          </h1>
          <p className="text-xl text-textMedium mb-8">
            Insira a URL do seu site e receba uma análise completa de SEO, acessibilidade e performance com recomendações geradas por IA.
          </p>
          
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="url"
                placeholder="https://www.seusite.com.br"
                className="input-field flex-grow"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn-primary flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <FaSearch />
                    Analisar
                  </>
                )}
              </button>
            </div>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </form>
          
          {isLoading && (
            <div className="text-center py-12">
              <FaSpinner className="animate-spin text-4xl text-primary mx-auto mb-4" />
              <p className="text-xl">Analisando seu site...</p>
              <p className="text-textMedium">Isso pode levar alguns segundos.</p>
            </div>
          )}
          
          {reportData && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Resultado da Análise</h2>
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="bg-primary bg-opacity-10 p-2 rounded-full mr-2 text-primary">
                    <FaSearchIcon />
                  </span>
                  Relatórios Básicos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ReportCard 
                    title="SEO" 
                    score={reportData.seo.score} 
                    details={reportData.seo.details}
                  />
                  <ReportCard 
                    title="Acessibilidade" 
                    score={reportData.accessibility.score} 
                    details={reportData.accessibility.details}
                  />
                  <ReportCard 
                    title="Performance" 
                    score={reportData.performance.score} 
                    details={reportData.performance.details}
                  />
                </div>
              </div>
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="bg-primary bg-opacity-10 p-2 rounded-full mr-2 text-primary">
                    <FaShieldAlt />
                  </span>
                  Segurança e Infraestrutura
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailedReportCard 
                    title="Segurança" 
                    score={reportData.security.score} 
                    details={reportData.security.details}
                    status={reportData.security.status}
                    items={reportData.security.items}
                  />
                  <DetailedReportCard 
                    title="Headers HTTP e Cache" 
                    score={reportData.httpHeaders.score} 
                    details={reportData.httpHeaders.details}
                    status={reportData.httpHeaders.status}
                    items={reportData.httpHeaders.items}
                  />
                </div>
              </div>
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="bg-primary bg-opacity-10 p-2 rounded-full mr-2 text-primary">
                    <FaMobileAlt />
                  </span>
                  Experiência do Usuário
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailedReportCard 
                    title="Mobile e Responsividade" 
                    score={reportData.mobile.score} 
                    details={reportData.mobile.details}
                    status={reportData.mobile.status}
                    items={reportData.mobile.items}
                  />
                  <DetailedReportCard 
                    title="SEO Técnico" 
                    score={reportData.technicalSeo.score} 
                    details={reportData.technicalSeo.details}
                    status={reportData.technicalSeo.status}
                    items={reportData.technicalSeo.items}
                  />
                </div>
              </div>
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="bg-primary bg-opacity-10 p-2 rounded-full mr-2 text-primary">
                    <FaChartLine />
                  </span>
                  Analytics e Rastreamento
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <DetailedReportCard 
                    title="Analytics e Rastreamento" 
                    score={reportData.analytics.score} 
                    details={reportData.analytics.details}
                    status={reportData.analytics.status}
                    items={reportData.analytics.items}
                  />
                </div>
              </div>
              
              <div className="card mt-8">
                <h3 className="text-xl font-bold mb-4">Análise Detalhada por IA</h3>
                <div className="prose max-w-none">
                  {reportData.aiAnalysis.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
                
                <div className="mt-8 text-center">
                  <button 
                    className="btn-secondary"
                    onClick={() => handleDownloadPdf()}
                    disabled={isDownloadingPdf}
                  >
                    {isDownloadingPdf ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Gerando PDF...
                      </>
                    ) : (
                      'Baixar Relatório Completo (PDF)'
                    )}
                  </button>
                  {pdfError && <p className="text-red-500 mt-2">{pdfError}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
