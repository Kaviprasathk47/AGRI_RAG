import axios from 'axios';

// Create AXIOS client instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 120000, // 120 seconds limit (ingestion parsing & Pinecone bulk upserting can take time)
});

// Configure Axios response interceptor for transient error retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    
    // Define transient errors: DNS resolution failures or gateway/gateway timeout 5xx errors
    const isTransient = !response || (response.status >= 502 && response.status <= 504);
    
    if (isTransient && config && !config._isRetry) {
      config._isRetry = true;
      config._retryCount = config._retryCount ? config._retryCount + 1 : 1;
      
      if (config._retryCount <= 2) {
        const delay = config._retryCount * 2000;
        console.warn(`[API Connection Warning] Request failed. Retrying ${config.method.toUpperCase()} ${config.url} (${config._retryCount}/2) in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(config);
      }
    }

    // Format errors to simplify consumer operations
    const formattedError = {
      message: response?.data?.message || error.message || 'A network connection timeout occurred.',
      status: response?.status || 0,
      raw: error,
    };
    
    return Promise.reject(formattedError);
  }
);

export default api;
