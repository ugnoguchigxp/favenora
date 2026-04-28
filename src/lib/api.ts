import type { AppType } from '@api/app';
import { hc } from 'hono/client';

let isRefreshing = false;
let refreshSubscribers: {
  resolve: () => void;
  reject: (error: Error) => void;
}[] = [];

const onRefreshed = () => {
  refreshSubscribers.forEach(({ resolve }) => {
    resolve();
  });
  refreshSubscribers = [];
};

const onRefreshFailed = (error: Error) => {
  refreshSubscribers.forEach(({ reject }) => {
    reject(error);
  });
  refreshSubscribers = [];
};

const addRefreshSubscriber = (subscriber: {
  resolve: () => void;
  reject: (error: Error) => void;
}) => {
  refreshSubscribers.push(subscriber);
};

const redirectToLoginIfNeeded = () => {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const newInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers: {
      ...init?.headers,
    },
  };

  let response = await fetch(input, newInit);

  const urlString = input.toString();
  const isRefreshEndpoint = urlString.includes('/auth/refresh');
  const isIdentityRefreshEndpoint = urlString.includes('/identity/session/refresh');
  const isLoginEndpoint = urlString.includes('/auth/login');
  const isRegisterEndpoint = urlString.includes('/auth/register');
  const isLogoutEndpoint = urlString.includes('/auth/logout');
  const isMeEndpoint = urlString.includes('/auth/me');
  const isIdentityMeEndpoint = urlString.includes('/identity/me');
  const isIdentityLogoutEndpoint = urlString.includes('/identity/logout');

  if (
    response.status === 401 &&
    !isRefreshEndpoint &&
    !isIdentityRefreshEndpoint &&
    !isLoginEndpoint &&
    !isRegisterEndpoint &&
    !isLogoutEndpoint &&
    !isMeEndpoint &&
    !isIdentityMeEndpoint &&
    !isIdentityLogoutEndpoint
  ) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        let refreshRes = await fetch('/api/identity/session/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (!refreshRes.ok) {
          refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
        }

        if (refreshRes.ok) {
          onRefreshed();
          response = await fetch(input, newInit);
        } else {
          const error = new Error('Failed to refresh session');
          onRefreshFailed(error);
          redirectToLoginIfNeeded();
        }
      } catch (error) {
        onRefreshFailed(error instanceof Error ? error : new Error('Failed to refresh session'));
        redirectToLoginIfNeeded();
      } finally {
        isRefreshing = false;
      }
    } else {
      return new Promise((resolve, reject) => {
        addRefreshSubscriber({
          resolve: () => {
            resolve(fetch(input, newInit));
          },
          reject,
        });
      });
    }
  }

  return response;
};

export const client = hc<AppType>('/api', {
  fetch: customFetch,
});
