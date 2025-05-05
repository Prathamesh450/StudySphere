import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Making API request: ${method} ${url}`, { data });
  const res = await fetch(url, {
    method,
    headers: data ? { 
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    } : {
      "X-Requested-With": "XMLHttpRequest"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`API response status: ${res.status} ${res.statusText}`);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Making query request: ${queryKey[0]}`);
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    console.log(`Query response status: ${res.status} ${res.statusText}`);
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("Unauthorized request, returning null");
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
