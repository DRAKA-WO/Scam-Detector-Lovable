import { supabase } from '@/integrations/supabase/client'

/**
 * Save a scan to history with retry logic
 * @param {string} userId - User ID
 * @param {string} scanType - 'image', 'url', or 'text'
 * @param {string|null} imageUrl - Supabase Storage URL for image (if applicable)
 * @param {string|null} contentPreview - Preview text for URL/text scans
 * @param {string} classification - 'safe', 'suspicious', or 'scam'
 * @param {Object} analysisResult - Full analysis result object
 * @param {number} retryCount - Current retry attempt (internal use)
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Object>} Saved scan record
 */
export async function saveScanToHistory(userId, scanType, imageUrl, contentPreview, classification, analysisResult, retryCount = 0, maxRetries = 3) {
    // Removed verbose logging
  
  if (!userId) {
    console.warn('❌ Cannot save scan history: user not logged in')
    return null
  }

  try {
    // Safety check: Truncate content_preview to 2000 chars to prevent timeout issues
    // Database constraint also enforces this, but we truncate here to avoid errors
    const MAX_PREVIEW_LENGTH = 2000
    const truncatedPreview = contentPreview && contentPreview.length > MAX_PREVIEW_LENGTH
      ? contentPreview.substring(0, MAX_PREVIEW_LENGTH)
      : contentPreview
    
    const insertData = {
      user_id: userId,
      scan_type: scanType,
      image_url: imageUrl || null,
      content_preview: truncatedPreview || null,
      classification: classification,
      analysis_result: analysisResult
    };
    
    // Removed verbose logging
    
    const { data, error } = await supabase
      .from('scan_history')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Error saving scan to history:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Check if this is a retryable error
      const isRetryableError = 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('ERR_CONNECTION') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNRESET') ||
        error.code === 'PGRST301' || // PostgREST connection error
        error.code === 'PGRST302';   // PostgREST timeout
      
      // Retry on network/connection errors
      if (isRetryableError && retryCount < maxRetries) {
        const delay = 500 * Math.pow(2, retryCount); // Exponential backoff: 500ms, 1s, 2s
        console.log(`🔄 Retrying save scan to history in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await saveScanToHistory(userId, scanType, imageUrl, contentPreview, classification, analysisResult, retryCount + 1, maxRetries);
      }
      
      // Store failed save in localStorage for later retry (only for retryable errors)
      if (isRetryableError && typeof window !== 'undefined') {
        try {
          const failedScansKey = `scam_checker_failed_scans_${userId}`;
          const failedScans = JSON.parse(localStorage.getItem(failedScansKey) || '[]');
          failedScans.push({
            ...insertData,
            timestamp: Date.now(),
            retryCount: 0
          });
          // Keep only last 10 failed scans
          if (failedScans.length > 10) {
            failedScans.shift();
          }
          localStorage.setItem(failedScansKey, JSON.stringify(failedScans));
          console.warn('⚠️ Stored failed scan in localStorage for later retry');
        } catch (storageError) {
          console.error('Error storing failed scan:', storageError);
        }
      }
      
      throw error; // Throw instead of returning null
    }

    // Removed verbose logging
    
    // Increment permanent stats (cumulative, never decrease) with retry
    try {
      await incrementUserStats(userId, classification);
    } catch (statsError) {
      console.error('❌ Error incrementing stats (non-critical):', statsError);
      // Don't throw - stats can be recalculated, but scan history is more important
    }
    
    // The trigger will automatically clean up old scans (keep only 10)
    return data
  } catch (error) {
    console.error('❌ Exception saving scan to history:', error);
    console.error('Exception details:', error.message, error.stack);
    
    // Final retry attempt for unhandled errors
    if (retryCount < maxRetries && error.message && !error.message.includes('duplicate') && !error.message.includes('constraint')) {
      const delay = 500 * Math.pow(2, retryCount);
      console.log(`🔄 Final retry attempt in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await saveScanToHistory(userId, scanType, imageUrl, contentPreview, classification, analysisResult, retryCount + 1, maxRetries);
    }
    
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Retry failed scans stored in localStorage
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of successfully retried scans
 */
export async function retryFailedScans(userId) {
  if (!userId || typeof window === 'undefined') return 0
  
  try {
    const failedScansKey = `scam_checker_failed_scans_${userId}`;
    const failedScans = JSON.parse(localStorage.getItem(failedScansKey) || '[]');
    
    if (failedScans.length === 0) return 0
    
    console.log(`🔄 Retrying ${failedScans.length} failed scans...`);
    
    const successfulRetries = [];
    const stillFailed = [];
    
    for (const scan of failedScans) {
      try {
        // Only retry scans that are less than 24 hours old
        const scanAge = Date.now() - scan.timestamp;
        if (scanAge > 24 * 60 * 60 * 1000) {
          console.log('⏭️ Skipping old failed scan (older than 24 hours)');
          continue;
        }
        
        // Safety check: Truncate content_preview to 2000 chars
        const MAX_PREVIEW_LENGTH = 2000
        const truncatedPreview = scan.content_preview && scan.content_preview.length > MAX_PREVIEW_LENGTH
          ? scan.content_preview.substring(0, MAX_PREVIEW_LENGTH)
          : scan.content_preview
        
        const { data, error } = await supabase
          .from('scan_history')
          .insert({
            user_id: scan.user_id,
            scan_type: scan.scan_type,
            image_url: scan.image_url,
            content_preview: truncatedPreview,
            classification: scan.classification,
            analysis_result: scan.analysis_result
          })
          .select()
          .single()
        
        if (error) {
          // Check if it's a duplicate (already saved)
          if (error.code === '23505' || error.message?.includes('duplicate')) {
            console.log('✅ Scan already exists in database, removing from failed list');
            successfulRetries.push(scan);
          } else {
            // Still failing, keep for next retry
            stillFailed.push(scan);
          }
        } else {
          // Successfully saved
          successfulRetries.push(scan);
        }
      } catch (error) {
        console.error('Error retrying failed scan:', error);
        stillFailed.push(scan);
      }
    }
    
    // Update localStorage with remaining failed scans
    if (stillFailed.length > 0) {
      localStorage.setItem(failedScansKey, JSON.stringify(stillFailed));
    } else {
      localStorage.removeItem(failedScansKey);
    }
    
    // Increment stats for successfully retried scans
    for (const scan of successfulRetries) {
      try {
        await incrementUserStats(userId, scan.classification);
      } catch (error) {
        console.error('Error incrementing stats for retried scan:', error);
      }
    }
    
    console.log(`✅ Successfully retried ${successfulRetries.length} scans, ${stillFailed.length} still failed`);
    return successfulRetries.length
  } catch (error) {
    console.error('Error retrying failed scans:', error);
    return 0
  }
}

/**
 * Get user's scan history (last 30 days)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of scan records
 */
export async function getScanHistory(userId) {
  if (!userId) {
    return []
  }

  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })

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
    console.warn('⚠️ getSignedImageUrl: No image path provided')
    return null
  }

  try {
    console.log('🔗 Generating signed URL for path:', imagePath)
    // Generate a signed URL that expires in 1 hour
    const { data, error } = await supabase.storage
      .from('scan-images')
      .createSignedUrl(imagePath, 3600) // 1 hour expiry

    if (error) {
      console.error('❌ Error creating signed URL:', error)
      console.error('   Path:', imagePath)
      console.error('   Error details:', JSON.stringify(error, null, 2))
      return null
    }

    if (!data || !data.signedUrl) {
      console.error('❌ No signed URL returned from Supabase')
      return null
    }

    console.log('✅ Successfully generated signed URL for:', imagePath)
    return data.signedUrl
  } catch (error) {
    console.error('❌ Exception creating signed URL:', error)
    console.error('   Path:', imagePath)
    return null
  }
}

/**
 * Get user statistics from database (fetches ALL scans, not just latest 3)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User stats calculated from database
 */
export async function getUserStatsFromDatabase(userId) {
  if (!userId) {
    return {
      totalScans: 0,
      scamsDetected: 0,
      safeResults: 0,
      suspiciousResults: 0
    }
  }

  try {
    // Fetch ALL scans for the user (not just latest 3)
    const { data, error } = await supabase
      .from('scan_history')
      .select('classification')
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Error fetching scan stats:', error)
      return {
        totalScans: 0,
        scamsDetected: 0,
        safeResults: 0,
        suspiciousResults: 0
      }
    }

    // Calculate stats from the data
    const stats = {
      totalScans: data.length,
      scamsDetected: data.filter(scan => scan.classification === 'scam').length,
      safeResults: data.filter(scan => scan.classification === 'safe').length,
      suspiciousResults: data.filter(scan => scan.classification === 'suspicious').length
    }

    console.log('✅ Calculated user stats from database:', stats);
    return stats
  } catch (error) {
    console.error('❌ Exception fetching scan stats:', error)
    return {
      totalScans: 0,
      scamsDetected: 0,
      safeResults: 0,
      suspiciousResults: 0
    }
  }
}

/**
 * Get or create user stats from permanent stats table
 * These stats are cumulative and never decrease
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User permanent stats
 */
export async function getUserPermanentStats(userId) {
  if (!userId) {
    return {
      totalScans: 0,
      scamsDetected: 0,
      safeResults: 0,
      suspiciousResults: 0
    }
  }

  try {
    // Try to get existing stats - use maybeSingle() to avoid errors when no rows exist
    const { data, error } = await supabase
      .from('user_stats')
      .select('user_id, total_scans, scams_detected, safe_results, suspicious_results, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching permanent stats:', error)
      return {
        totalScans: 0,
        scamsDetected: 0,
        safeResults: 0,
        suspiciousResults: 0
      }
    }

    // If no stats exist, create initial record
    if (!data) {
      const { data: newStats, error: insertError } = await supabase
        .from('user_stats')
        .insert({ user_id: userId })
        .select('user_id, total_scans, scams_detected, safe_results, suspicious_results, created_at, updated_at')
        .single()

      if (insertError) {
        console.error('❌ Error creating initial stats:', insertError)
        return {
          totalScans: 0,
          scamsDetected: 0,
          safeResults: 0,
          suspiciousResults: 0
        }
      }

      return {
        totalScans: newStats.total_scans || 0,
        scamsDetected: newStats.scams_detected || 0,
        safeResults: newStats.safe_results || 0,
        suspiciousResults: newStats.suspicious_results || 0
      }
    }

    console.log('✅ Fetched permanent stats:', data);
    return {
      totalScans: data.total_scans || 0,
      scamsDetected: data.scams_detected || 0,
      safeResults: data.safe_results || 0,
      suspiciousResults: data.suspicious_results || 0
    }
  } catch (error) {
    console.error('❌ Exception fetching permanent stats:', error)
    return {
      totalScans: 0,
      scamsDetected: 0,
      safeResults: 0,
      suspiciousResults: 0
    }
  }
}

/**
 * Increment user stats (call this every time a scan is saved)
 * @param {string} userId - User ID
 * @param {string} classification - 'safe', 'suspicious', or 'scam'
 */
export async function incrementUserStats(userId, classification) {
  if (!userId || !classification) {
    console.warn('⚠️ Cannot increment stats: missing userId or classification');
    return
  }

  try {
    console.log('📈 Incrementing stats for user:', userId, 'classification:', classification);
    
    // Get current stats or create if not exists
    let { data: stats, error } = await supabase
      .from('user_stats')
      .select('user_id, total_scans, scams_detected, safe_results, suspicious_results, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle() // Use maybeSingle() instead of single() to avoid errors when no rows exist

    // If no record exists or there was an error, create initial record
    if (error || !stats) {
      const { data: newStats, error: insertError } = await supabase
        .from('user_stats')
        .insert({ user_id: userId })
        .select('user_id, total_scans, scams_detected, safe_results, suspicious_results, created_at, updated_at')
        .single()

      if (insertError) {
        console.error('❌ Error creating initial stats record:', insertError);
        return
      }
      
      stats = newStats
    }

    if (!stats) {
      console.error('❌ Could not get or create stats record');
      return
    }

    // Increment appropriate counters
    const updates = {
      total_scans: (stats.total_scans || 0) + 1,
      updated_at: new Date().toISOString()
    }

    if (classification === 'scam') {
      updates.scams_detected = (stats.scams_detected || 0) + 1
    } else if (classification === 'safe') {
      updates.safe_results = (stats.safe_results || 0) + 1
    } else if (classification === 'suspicious') {
      updates.suspicious_results = (stats.suspicious_results || 0) + 1
    }

    console.log('📊 Updating stats with:', updates);

    // Update the record
    const { error: updateError } = await supabase
      .from('user_stats')
      .update(updates)
      .eq('user_id', userId)

    if (updateError) {
      console.error('❌ Error updating permanent stats:', updateError)
    } else {
      console.log('✅ Successfully incremented permanent stats');
    }
  } catch (error) {
    console.error('❌ Exception incrementing stats:', error)
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
