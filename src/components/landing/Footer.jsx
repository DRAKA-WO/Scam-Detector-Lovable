import { useScrollAnimation } from '../../hooks/useScrollAnimation'

function Footer() {
  const { ref: footerRef, isVisible: footerVisible } = useScrollAnimation()

  return (
    <footer 
      ref={footerRef}
      className={`py-12 border-t border-border transition-all duration-700 ${
        footerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-button flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg text-foreground">ScamGuard</span>
          </div>

          {/* Copyright */}
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} ScamGuard. Powered by AI • Protecting users worldwide
          </p>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Privacy
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Terms
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
