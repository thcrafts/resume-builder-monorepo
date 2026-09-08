import axios, { type AxiosInstance } from "axios";
import { notifySessionExpired } from "../utils/sessionExpiredHandler";
import { getAuthHeaders, getStoredToken } from "../utils/authSession";

class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });

    this.axiosInstance.interceptors.request.use((config) => {
      const authHeaders = getAuthHeaders();
      config.headers = {
        ...config.headers,
        ...authHeaders,
      } as typeof config.headers;
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only expire a real session. Unauthenticated 401s (e.g. /api/ai/models on
        // the login page when opening via LAN IP with empty localStorage) must not
        // trigger window.location.replace("/login") or the page reloads forever.
        if (error.response?.status === 401 && Boolean(getStoredToken())) {
          notifySessionExpired();
        }
        return Promise.reject(error);
      },
    );
  }

  public static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance.axiosInstance;
  }
}

export default ApiClient;
