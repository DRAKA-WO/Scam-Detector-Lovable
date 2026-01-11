import { Shield, AlertTriangle, XCircle, Eye, Sparkles } from 'lucide-react';

function BlurredResultPreview({ classification, onSignup }) {
  const getIcon = () => {
    switch (classification) {
      case 'safe':
        return Shield;
      case 'suspicious':
        return AlertTriangle;
      case 'scam':
        return XCircle;
      default:
        return Shield;
    }
  };

  const getColor = () => {
    switch (classification) {
      case 'safe':
        return 'text-green-500';
      case 'suspicious':
        return 'text-yellow-500';
      case 'scam':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const Icon = getIcon();
  const colorClass = getColor();

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred background with partial result */}
      <div className="filter blur-md select-none pointer-events-none">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center ${colorClass}`}>
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Analysis Complete</h3>
              <p className="text-gray-400">Classification: {classification}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300">
                ████████████████████████████████████████
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300">
                ████████████████████████████████
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300">
                ██████████████████████████████████████████████
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay with signup prompt */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div 
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl border-2 border-purple-500/50 text-center max-w-md w-full transform transition-all animate-fade-in"
          style={{
            boxShadow: '0 0 60px rgba(168, 85, 247, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.9)',
          }}
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 animate-pulse"></div>
            </div>
            <Eye className="w-16 h-16 mx-auto text-purple-500 relative z-10" />
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="text-2xl font-bold text-white">
              Results Ready!
            </h3>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          
          <div className="mb-6">
            <p className="text-gray-300 mb-2">
              Your <span className={`font-bold ${colorClass}`}>{classification}</span> analysis is complete
            </p>
            <p className="text-gray-400 text-sm">
              Sign up free to view your full results and save them to your history
            </p>
          </div>

          <button
            onClick={onSignup}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg mb-4 flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Sign Up to View Full Results
          </button>
          
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              ✓ Free forever
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              ✓ Takes 30 seconds
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlurredResultPreview;
