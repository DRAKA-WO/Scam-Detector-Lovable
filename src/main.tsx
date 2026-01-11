import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// 🛡️ CRITICAL: Install fetch interceptor IMMEDIATELY, before any other code runs
// This prevents browser extensions from corrupting Supabase URLs
console.log('🛡️ Installing global fetch interceptor...');
const originalFetch = window.fetch;
window.fetch = function(...args) {
  let [resource, config] = args;
  
  // Fix corrupted Supabase URLs - AGGRESSIVE pattern matching
  if (typeof resource === 'string') {
    const originalResource = resource;
    
    // Log ALL Supabase fetches for debugging
    if (resource.includes('supabase.co')) {
      console.log('🔍 Intercepted fetch to:', resource.substring(0, 100));
    }
    
    // Pattern 1: Extra .ggg in the URL
    if (resource.includes('ggg') && resource.includes('supabase.co')) {
      resource = resource.replace(/tpmynhukocny\.gggkxckh/g, 'tpmynhukocnyggqkxckh');
      resource = resource.replace(/\.ggg/g, '');
    }
    
    // Pattern 2: Any Supabase URL that doesn't have the correct project ID
    if (resource.includes('supabase.co') && !resource.includes('tpmynhukocnyggqkxckh')) {
      console.warn('🛡️ Detected non-standard Supabase URL:', originalResource);
      // Extract the path and rebuild with correct project ID
      try {
        const urlObj = new URL(resource);
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        resource = `https://tpmynhukocnyggqkxckh.supabase.co${path}`;
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }
    
    // Log if we fixed anything
    if (resource !== originalResource) {
      console.warn('🛡️ ⚠️ FIXED CORRUPTED URL ⚠️');
      console.warn('  ❌ FROM:', originalResource);
      console.warn('  ✅ TO:', resource);
    }
  }
  
  return originalFetch.call(window, resource, config);
};
console.log('✅ Global fetch interceptor installed!');

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
