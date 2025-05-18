import Link from 'next/link'

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-primary font-bold text-xl">SiteCheckAI</span>
            <p className="text-textMedium mt-2">
              Diagnóstico Inteligente de Sites com IA
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div>
              <h3 className="font-semibold mb-2">Links Rápidos</h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/" className="text-textMedium hover:text-primary transition-colors">
                    Início
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-textMedium hover:text-primary transition-colors">
                    Como Funciona
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-textMedium hover:text-primary transition-colors">
                    Preços
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Recursos</h3>
              <ul className="space-y-1">
                <li>
                  <Link href="#" className="text-textMedium hover:text-primary transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-textMedium hover:text-primary transition-colors">
                    Documentação
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-textMedium hover:text-primary transition-colors">
                    Suporte
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-textMedium">
          <p>&copy; {new Date().getFullYear()} SiteCheckAI. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
