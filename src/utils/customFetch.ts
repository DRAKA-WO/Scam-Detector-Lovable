// Custom fetch implementation using XMLHttpRequest to bypass URL corruption
// This is needed because something (antivirus/proxy/extension) is corrupting
// fetch() requests at the native level, even after our interceptor fixes them.

export function createCustomFetch() {
  return function customFetch(url, options = {}) {
    console.log('🔧 Custom fetch called for:', url);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const method = options.method || 'GET';
      
      // Open the request
      xhr.open(method, url, true);
      
      // Set headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            xhr.setRequestHeader(key, value);
          }
        });
      }
      
      // Handle response
      xhr.onload = function() {
        const headers = {};
        const headerLines = xhr.getAllResponseHeaders().split('\r\n');
        headerLines.forEach(line => {
          const parts = line.split(': ');
          if (parts.length === 2) {
            headers[parts[0].toLowerCase()] = parts[1];
          }
        });
        
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Map(Object.entries(headers)),
          url: url,
          text: () => Promise.resolve(xhr.responseText),
          json: () => Promise.resolve(JSON.parse(xhr.responseText)),
          blob: () => Promise.resolve(new Blob([xhr.response])),
        };
        
        console.log('✅ Custom fetch completed:', url, 'Status:', xhr.status);
        resolve(response);
      };
      
      xhr.onerror = function() {
        console.error('❌ Custom fetch error:', url);
        reject(new TypeError('Network request failed'));
      };
      
      xhr.ontimeout = function() {
        console.error('⏱️ Custom fetch timeout:', url);
        reject(new TypeError('Network request timed out'));
      };
      
      // Send the request
      if (options.body) {
        xhr.send(options.body);
      } else {
        xhr.send();
      }
    });
  };
}
