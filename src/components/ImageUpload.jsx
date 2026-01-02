import { useState, useRef, useEffect } from 'react'

function ImageUpload({ onUpload }) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // 'user' for front, 'environment' for back
  const [cameraError, setCameraError] = useState(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setCameraError(null)
  }

  const startCamera = async () => {
    try {
      setCameraError(null)
      setError(null)
      
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access to take photos.'
          : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
          ? 'No camera found on this device.'
          : 'Failed to access camera. Please try again or upload an image instead.'
      )
      setCameraActive(false)
    }
  }

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacingMode)
    
    // Restart camera with new facing mode
    if (cameraActive) {
      stopCamera()
      // Small delay to ensure stream is fully stopped
      setTimeout(() => {
        startCamera()
      }, 100)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Failed to capture photo')
        return
      }

      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
      
      if (validateFile(file)) {
        setSelectedFile(file)
        setPreview(URL.createObjectURL(blob))
        stopCamera()
      }
    }, 'image/jpeg', 0.95)
  }

  const handleTakePhoto = () => {
    if (cameraActive) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  const validateFile = (file) => {
    setError(null)

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a PNG, JPG, GIF, or WEBP image.')
      return false
    }

    // Check file size
    if (file.size > MAX_SIZE) {
      setError('File size exceeds 10MB limit. Please upload a smaller image.')
      return false
    }

    return true
  }

  const handleFile = (file) => {
    if (!validateFile(file)) {
      return
    }

    // Store the file
    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleCheckNow = () => {
    if (selectedFile && validateFile(selectedFile)) {
      onUpload(selectedFile)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      {!cameraActive && !preview && (
        <div className="bg-white rounded-lg p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-red-500 bg-pink-100'
                : 'border-red-500 bg-pink-50 hover:bg-pink-100'
            }`}
            onClick={handleClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              onChange={handleChange}
              className="hidden"
            />

            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-700 mb-2 font-medium">
                Drag and drop your images here
              </p>
              <p className="text-gray-500 text-sm mb-4">
                or click and browse
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleTakePhoto()
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Take Photo
              </button>
            </div>
          </div>

          {/* Check Now Button */}
          {selectedFile ? (
            <button
              onClick={handleCheckNow}
              className="mt-4 w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-medium py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors"
            >
              Check now
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleClick}
              className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors"
            >
              Check now
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {cameraActive && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-black">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
              style={{ maxHeight: '500px', objectFit: 'contain' }}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center"
              >
                <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-400"></div>
              </button>
              {navigator.mediaDevices && navigator.mediaDevices.enumerateDevices && (
                <button
                  onClick={switchCamera}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  title="Switch camera"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {cameraError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{cameraError}</p>
            </div>
          )}
        </div>
      )}

      {preview && !cameraActive && (
        <div className="bg-white rounded-lg p-6">
          <div className="border-2 border-gray-300 rounded-lg p-4 mb-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-96 mx-auto rounded-lg object-contain"
            />
          </div>
          
          <button
            onClick={() => {
              setPreview(null)
              setSelectedFile(null)
              setError(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
            className="text-gray-600 hover:text-gray-800 underline text-sm mb-4 block mx-auto text-center"
          >
            Choose a different image
          </button>

          {/* Check Now Button */}
          <button
            onClick={handleCheckNow}
            className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-medium py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors"
          >
            Check now
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

export default ImageUpload

