import { useState } from 'react'

function ReportModal({ isOpen, onClose, onConfirm, isSubmitting }) {
  const [userConsent, setUserConsent] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(userConsent)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-black mb-4">Report This Scam</h2>
        
        <p className="text-gray-700 mb-4">
          Thank you for helping us improve scam detection. Your report will help protect others from similar scams.
        </p>

        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={userConsent}
              onChange={(e) => setUserConsent(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">Help improve scam detection</span> (optional)
              <br />
              <span className="text-gray-600">
                Allow us to use this report anonymously to improve our AI model and help protect others
              </span>
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
