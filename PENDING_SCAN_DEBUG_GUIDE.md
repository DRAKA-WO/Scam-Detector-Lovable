# Pending Scan Feature - Debug Guide

## 🔍 How to Test & Debug

I've added extensive logging to help diagnose why pending scans aren't being saved to history. Follow this step-by-step guide:

### Prerequisites
1. Make sure you're **logged out** completely
2. Open **DevTools** (F12)
3. Go to **Console tab**
4. Clear console (click the 🚫 icon or type `clear()`)

---

## 📝 Step-by-Step Testing Process

### Step 1: Clear Everything
```javascript
// Run this in the console to start fresh:
localStorage.clear();
location.reload();
```

### Step 2: First Scan (Should Work Normally)
1. Upload any image or analyze any URL/text
2. **Watch console for:**
   - ✅ `💳 Before using free check: 2`
   - ✅ `💳 After using free check: 1`
   - ✅ `ℹ️ Normal flow - not last free check`
3. You should see **full results** (no blur)

### Step 3: Second Scan (THE IMPORTANT ONE)
1. Upload an image or analyze URL/text
2. **Watch console for these key messages:**

#### A. Check Detection:
```
🔍 After image analysis: {isLoggedIn: false, checksAfter: 0, isLastFreeCheck: true}
```
✅ **If you see this** → Feature is detecting last check correctly  
❌ **If checksAfter is NOT 0** → Check limit system is broken

#### B. Pending Scan Storage:
```
🎯 LAST FREE CHECK DETECTED - Storing pending scan and showing preview
✅ Successfully stored pending scan: {scanType: "image", ...}
📦 Full pending scan data: {...}
✅ Verified: Pending scan is in localStorage
✅ Blurred preview and signup modal should now be visible
```
✅ **If you see all these** → Pending scan stored successfully  
❌ **If you see ERROR** → localStorage might be full or blocked

#### C. Visual Confirmation:
- You should see a **blurred result preview**
- **Signup modal** should appear on top

### Step 4: Verify localStorage
In DevTools → **Application tab** → **Local Storage** → Check for:
```
scam_checker_pending_scan: {
  "scanType": "image",
  "imageFile": "blob:...",
  "classification": "...",
  "analysisResult": {...},
  ...
}
```

### Step 5: Sign Up
1. Click "Sign Up with Google" or "Sign Up with Email"
2. Complete the signup process
3. **Watch console VERY CAREFULLY for:**

#### A. Pending Scan Detection:
```
🔍 Checking for pending scan after auth...
📦 Pending scan data from localStorage: FOUND
📋 Parsed pending scan: {...}
🔎 Scan details: {scanType: "image", classification: "scam", ...}
```
✅ **If you see "FOUND"** → Good!  
❌ **If you see "NOT FOUND"** → localStorage was cleared somehow

#### B. Image Upload (for image scans):
```
📤 Attempting to upload pending image...
🔗 Fetching blob from URL: blob:...
✅ Blob fetched, size: 123456 type: image/png
📁 File created, uploading to Supabase...
📤 uploadScanImage called with: {...}
📁 Uploading to path: userId/timestamp.png
✅ Successfully uploaded image: userId/timestamp.png
```
✅ **If you see "Successfully uploaded"** → Image upload worked  
❌ **If you see ERROR** → Check Supabase Storage policies

#### C. History Save:
```
💾 Saving pending scan to history...
📝 saveScanToHistory called with: {...}
📤 Inserting scan to history: {...}
✅ Successfully saved scan to history: {...}
🗑️ Cleared pending scan from localStorage
🔄 Redirecting to dashboard...
```
✅ **If you see "Successfully saved"** → Scan saved to database!  
❌ **If you see ERROR** → Check Supabase RLS policies

---

## 🚨 Common Error Messages & Solutions

### Error: "Cannot save scan history: user not logged in"
**Problem:** Auth session not established yet  
**Solution:** Wait longer before checking, or auth callback isn't working

### Error: "RLS policy violation" or "permission denied"
**Problem:** Supabase policies not configured correctly  
**Solution:** Run this in Supabase SQL Editor:
```sql
-- Check if INSERT policy exists
SELECT policyname FROM pg_policies 
WHERE tablename = 'scan_history' AND cmd = 'INSERT';
```
Should return: `"Users can insert their own scans"`

### Error: "Storage: Object not found" or "403"
**Problem:** Storage bucket policies not set up  
**Solution:** Check Storage policies in Supabase Dashboard

### Error: "Failed to fetch blob"
**Problem:** Blob URL expired or was revoked  
**Solution:** This is a timing issue - the blob URL should be valid for several minutes

---

## 🎯 What To Report

If the scan still doesn't save to history, please share:

1. **All console logs** from the moment you click "Analyze" on your 2nd scan
2. **Screenshot of localStorage** (Application tab → Local Storage)
3. **Any red errors** in the console
4. **Screenshot of Supabase policies**:
   - Table Editor → scan_history → RLS Policies
   - Storage → scan-images → Policies

---

## ✅ Expected Success Output

When everything works correctly, you should see this sequence:

```
[Scan 2]
🔍 After image analysis: {isLoggedIn: false, checksAfter: 0, isLastFreeCheck: true}
🎯 LAST FREE CHECK DETECTED
✅ Successfully stored pending scan
✅ Verified: Pending scan is in localStorage

[Sign Up]
🔍 Checking for pending scan after auth...
📦 Pending scan data: FOUND
📤 Attempting to upload pending image...
✅ Successfully uploaded image: path/to/image.png
💾 Saving pending scan to history...
✅ Successfully saved scan to history
🗑️ Cleared pending scan from localStorage
🔄 Redirecting to dashboard...

[Dashboard]
Scan appears in history section!
```

---

**Status**: Enhanced logging deployed  
**Next Step**: Test the flow and check console logs
