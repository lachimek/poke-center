"use client";

import "react-toastify/dist/ReactToastify.css";
import { type ToastClassName, ToastContainer } from "react-toastify";

const toastClassName: ToastClassName = (context) =>
  `app-toast app-toast--${context?.type ?? "default"}`;

export default function AppToaster() {
  return (
    <ToastContainer
      autoClose={3200}
      closeButton={false}
      draggable={false}
      hideProgressBar
      icon={false}
      limit={4}
      newestOnTop
      pauseOnFocusLoss={false}
      position="bottom-right"
      theme="dark"
      toastClassName={toastClassName}
    />
  );
}
