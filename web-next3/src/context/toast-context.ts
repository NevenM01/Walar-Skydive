import { createContext } from 'react'

export type ToastVariant = 'default' | 'success'

export type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
