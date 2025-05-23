"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X, AlertTriangle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  position?: "top-right" | "top-center" | "bottom-right" | "bottom-center";
}

export function Toast({
  message,
  type = "success",
  duration = 3000,
  onClose,
  position = "top-right",
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Wait for exit animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getPositionStyles = () => {
    switch (position) {
      case "top-right":
        return "top-4 right-4";
      case "top-center":
        return "top-4 left-1/2 -translate-x-1/2";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-center":
        return "bottom-4 left-1/2 -translate-x-1/2";
      default:
        return "top-4 right-4";
    }
  };

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-900/70",
          border: "border-green-600",
          icon: <CheckCircle className="h-5 w-5 text-green-400" />,
          text: "text-green-100",
        };
      case "error":
        return {
          bg: "bg-red-900/70",
          border: "border-red-600",
          icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
          text: "text-red-100",
        };
      case "info":
        return {
          bg: "bg-blue-900/70",
          border: "border-blue-600",
          icon: <Info className="h-5 w-5 text-blue-400" />,
          text: "text-blue-100",
        };
      default:
        return {
          bg: "bg-green-900/70",
          border: "border-green-600",
          icon: <CheckCircle className="h-5 w-5 text-green-400" />,
          text: "text-green-100",
        };
    }
  };

  const styles = getToastStyles();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            opacity: 0,
            y: position.includes("top") ? -20 : 20,
            scale: 0.9,
          }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: position.includes("top") ? -20 : 20,
            scale: 0.9,
          }}
          className={`fixed ${getPositionStyles()} z-50 flex items-center justify-between px-6 py-4 rounded-lg shadow-lg backdrop-blur-md ${
            styles.bg
          } border ${styles.border} min-w-[300px] max-w-md`}
        >
          <div className="flex items-center">
            {styles.icon}
            <span className={`ml-3 ${styles.text} font-medium`}>{message}</span>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded-full hover:bg-black/20 transition-colors"
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<
    Array<{ id: string; props: ToastProps }>
  >([]);

  const showToast = (props: Omit<ToastProps, "onClose">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [
      ...prev,
      { id, props: { ...props, onClose: () => removeToast(id) } },
    ]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map(({ id, props }) => (
        <Toast key={id} {...props} />
      ))}
    </>
  );

  return { showToast, ToastContainer };
}
