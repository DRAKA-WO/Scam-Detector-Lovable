import { supabase } from '@/integrations/supabase/client'

/**
 * Save a scan to history
 * @param {string} userId - User ID
 * @param {string} scanType - 'image', 'url', or 'text'
 * @param {string|null} imageUrl - Supabase Storage URL for image (if applicable)
 * @param {string|null} contentPreview - Preview text for URL/text scans
 * @param {string} classification - 'safe', 'suspicious', or 'scam'
 * @param {Object} analysisResult - Full analysis result object
 * @returns {Promise<Object>} Saved scan record
 */
export async function saveScanToHistory(userId, scanType, imageUrl, contentPreview, classification, analysisResult) {
  console.log('📝 saveScanToHistory called with:', { userId, scanType, imageUrl, contentPreview, classification });
  
  if (!userId) {
    console.warn('❌ Cannot save scan history: user not logged in')
    return null
  }

  try {
    const insertData = {
      user_id: userId,
      scan_type: scanType,
      image_url: imageUrl || null,
      content_preview: contentPreview || null,
      classification: classification,
      analysis_result: analysisResult
    };
    
    console.log('📤 Inserting scan to history:', insertData);
    
    const { data, error } = await supabase
      .from('scan_history')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Error saving scan to history:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error; // Throw instead of returning null
    }

    console.log('✅ Successfully saved scan to history:', data);
    // The trigger will automatically clean up old scans (keep only 3)
    return data
  } catch (error) {
    console.error('❌ Exception saving scan to history:', error);
    console.error('Exception details:', error.message, error.stack);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Get user's scan history (latest 3)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of scan records
 */
export async function getScanHistory(userId) {
  if (!userId) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)

    if (error) {
      console.error('Error fetching scan history:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching scan history:', error)
    return []
  }
}

/**
 * Upload image to Supabase Storage and get signed URL
 * @param {File} imageFile - Image file to upload
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Signed URL of uploaded image or null
 */
export async function uploadScanImage(imageFile, userId) {
  console.log('📤 uploadScanImage called with:', { fileName: imageFile?.name, fileSize: imageFile?.size, userId });
  
  if (!userId || !imageFile) {
    console.warn('❌ Cannot upload image: missing userId or imageFile');
    return null
  }

  try {
    // Create a unique filename
    const timestamp = Date.now()
    const fileExt = imageFile.name.split('.').pop() || 'png'
    const fileName = `${userId}/${timestamp}.${fileExt}`
    
    console.log('📁 Uploading to path:', fileName);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('scan-images')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('❌ Error uploading image:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error; // Throw instead of returning null
    }

    console.log('✅ Successfully uploaded image:', data.path);
    // For private buckets, we need to use signed URLs
    // Signed URLs expire after 1 hour, but we'll generate them on-demand when displaying
    // Store the path instead of the URL
    return data.path
  } catch (error) {
    console.error('❌ Exception uploading image:', error);
    console.error('Exception details:', error.message, error.stack);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Get signed URL for an image path (for private buckets)
 * @param {string} imagePath - Path to the image in storage
 * @returns {Promise<string|null>} Signed URL or null
 */
export async function getSignedImageUrl(imagePath) {
  if (!imagePath) {
    return null
  }

  try {
    // Generate a signed URL that expires in 1 hour
    const { data, error } = await supabase.storage
      .from('scan-images')
      .createSignedUrl(imagePath, 3600) // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Exception creating signed URL:', error)
    return null
  }
}

/**
 * Delete old images from storage when scans are removed
 * @param {Array<string>} imageUrls - Array of image URLs to delete
 */
export async function deleteScanImages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return
  }

  try {
    // Extract file paths from URLs
    const filePaths = imageUrls
      .map(url => {
        // Extract path from Supabase Storage URL
        const match = url.match(/scan-images\/(.+)$/)
        return match ? match[1] : null
      })
      .filter(Boolean)

    if (filePaths.length === 0) {
      return
    }

    // Delete files from storage
    const { error } = await supabase.storage
      .from('scan-images')
      .remove(filePaths)

    if (error) {
      console.error('Error deleting old images:', error)
    }
  } catch (error) {
    console.error('Exception deleting images:', error)
  }
}
