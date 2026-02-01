import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a client instance with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests once
      retry: 1,
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
})

export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

