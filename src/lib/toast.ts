"use client";

import { type ToastOptions, type TypeOptions, toast } from "react-toastify";

const baseToastOptions: ToastOptions = {
  closeButton: false,
  hideProgressBar: true,
  pauseOnFocusLoss: false,
};

function showToast(type: TypeOptions, message: string, options?: ToastOptions) {
  return toast(message, {
    ...baseToastOptions,
    ...options,
    type,
  });
}

export function notifySuccess(message: string, options?: ToastOptions) {
  return showToast("success", message, options);
}

export function notifyError(message: string, options?: ToastOptions) {
  return showToast("error", message, options);
}

export function notifyInfo(message: string, options?: ToastOptions) {
  return showToast("info", message, options);
}

export function notifyWarning(message: string, options?: ToastOptions) {
  return showToast("warning", message, options);
}
