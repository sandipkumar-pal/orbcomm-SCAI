import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE || '';

const client = axios.create({
  baseURL
});

let requestInterceptor;

export const configureInterceptors = token => {
  if (requestInterceptor) {
    client.interceptors.request.eject(requestInterceptor);
  }
  requestInterceptor = client.interceptors.request.use(config => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  });
};

export const login = async ({ email, password }) => {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
};

export const fetchKpis = async ({ routeCode, week }) => {
  const { data } = await client.get(`/api/kpi/${routeCode}/${week}`);
  return data;
};

export const fetchKpiTrend = async ({ routeCode, weeks }) => {
  const { data } = await client.post(`/api/kpi/${routeCode}/trend`, { weeks });
  return data;
};

export const fetchRouteMap = async ({ routeCode }) => {
  const { data } = await client.get(`/api/map/${routeCode}`);
  return data;
};

export default client;
