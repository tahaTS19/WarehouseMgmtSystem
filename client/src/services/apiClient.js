// Central API client — uses native fetch, no axios.
// Every request in the app should go through this file, not raw fetch() calls
// scattered across components, so error handling stays consistent in one place.
//
// Auth is handled entirely via an httpOnly cookie, sent automatically by the
// browser with every request (`credentials: "include"`) — there is no token
// for this file to read, attach, or store. Frontend JS never has direct
// access to it at all; that's the whole point of using an httpOnly cookie.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(endpoint, { method = "GET", body, headers = {} } = {}) {
  // FormData (multipart file uploads) must NOT be JSON.stringify'd — that
  // produces "{}" since FormData has no enumerable own properties, silently
  // dropping the actual file. It also must NOT get a manual Content-Type —
  // the browser has to generate that itself, including the multipart
  // boundary string, which only it can compute correctly.
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: isFormData
      ? { ...headers }
      : {
          "Content-Type": "application/json",
          ...headers,
        },
    credentials: "include", // sends the httpOnly auth cookie automatically
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: "POST", body }),
  put: (endpoint, body) => request(endpoint, { method: "PUT", body }),
  patch: (endpoint, body) => request(endpoint, { method: "PATCH", body }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};