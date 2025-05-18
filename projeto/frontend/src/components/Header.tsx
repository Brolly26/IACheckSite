import Link from 'next/link'

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-primary font-bold text-2xl">SiteCheckAI</span>
        </Link>
        
        <nav>
          <ul className="flex gap-6">
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
        </nav>
      </div>
    </header>
  )
}

export default Header
