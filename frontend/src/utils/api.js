export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('weiwuyan_belay_auth_token');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
  
    const response = await fetch(url, {
      ...options,
      headers
    });
  
    if (response.status === 401) {
      localStorage.removeItem('weiwuyan_belay_auth_token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
  
    return response;
  };