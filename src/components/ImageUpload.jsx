import { useState, useRef, useEffect } from 'react'

function ImageUpload({ onUpload }) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')
  const [cameraError, setCameraError] = useState(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
  const MAX_SIZE = 10 * 1024 * 1024

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
    
    if (cameraActive) {
      stopCamera()
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a PNG, JPG, GIF, or WEBP image.')
      return false
    }

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

    setSelectedFile(file)

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
        <div>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
              dragActive
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
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

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <svg
                  className="h-8 w-8 text-primary"
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
              </div>
              <p className="text-foreground font-medium mb-1">
                Drag and drop your image here
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                or click to browse
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleTakePhoto()
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground text-sm transition-colors bg-secondary rounded-lg hover:bg-secondary/80"
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

          {/* Tip Notice */}
          <div className="mt-6 bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-4 h-4 text-primary-foreground"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-foreground text-sm leading-relaxed">
                <span className="font-semibold">Tip:</span> Capture as much content as possible, including the full message, sender details, URLs, phone numbers, and visible context, to improve analysis accuracy.
              </p>
            </div>
          </div>

          <button
            onClick={selectedFile ? handleCheckNow : handleClick}
            className={`mt-6 w-full font-medium py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
              selectedFile
                ? 'gradient-button text-primary-foreground shadow-lg hover:shadow-primary/25 hover:scale-[1.02]'
                : 'bg-secondary text-muted-foreground cursor-pointer hover:bg-secondary/80'
            }`}
          >
            Check Now
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

      {cameraActive && (
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
              style={{ maxHeight: '400px', objectFit: 'contain' }}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="w-14 h-14 gradient-button rounded-full border-4 border-background flex items-center justify-center shadow-lg"
              >
                <div className="w-10 h-10 bg-primary-foreground rounded-full"></div>
              </button>
              {navigator.mediaDevices && navigator.mediaDevices.enumerateDevices && (
                <button
                  onClick={switchCamera}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors"
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
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive text-sm">{cameraError}</p>
            </div>
          )}
        </div>
      )}

      {preview && !cameraActive && (
        <div>
          <div className="border border-border rounded-xl p-4 mb-4 bg-card">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-80 mx-auto rounded-lg object-contain"
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
            className="text-muted-foreground hover:text-foreground underline text-sm mb-4 block mx-auto text-center transition-colors"
          >
            Choose a different image
          </button>

          <button
            onClick={handleCheckNow}
            className="w-full gradient-button text-primary-foreground font-medium py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-primary/25 hover:scale-[1.02]"
          >
            Check Now
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
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

export default ImageUpload
