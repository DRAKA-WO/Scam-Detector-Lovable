import { X, Zap, ShoppingCart, AlertCircle } from 'lucide-react'

function OutOfChecksModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Out of Checks</h2>
              <p className="text-sm text-gray-400">Choose how to continue</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="text-gray-300 mb-6">
            You've used all your available checks. Get more checks to continue protecting yourself from scams!
          </p>

          {/* Options */}
          <div className="space-y-3">
            {/* Upgrade Plan Option */}
            <a
              href="/pricing"
              className="block group relative overflow-hidden rounded-xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-4 hover:border-purple-500 transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    Upgrade Plan
                    <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full font-medium">
                      Best Value
                    </span>
                  </h3>
                  <p className="text-sm text-gray-400 mb-2">
                    Get unlimited checks + premium features
                  </p>
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                    <span>View plans</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </a>

            {/* Buy Checks Option */}
            <a
              href="/pricing#buy-checks"
              className="block group relative overflow-hidden rounded-xl border-2 border-gray-600 bg-gray-800/50 p-4 hover:border-gray-500 transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Buy Checks
                  </h3>
                  <p className="text-sm text-gray-400 mb-2">
                    Purchase additional checks as needed
                  </p>
                  <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                    <span>One-time purchase</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </a>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              Continue protecting yourself from scams with more checks
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OutOfChecksModal
