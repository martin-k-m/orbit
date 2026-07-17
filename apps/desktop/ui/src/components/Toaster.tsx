import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useAppStore, type ToastVariant } from "@/store/app";
import { cn } from "@/lib/cn";

const iconFor: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
};

const accentFor: Record<ToastVariant, string> = {
  default: "text-accent",
  success: "text-success",
  error: "text-danger",
};

export function Toaster() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = iconFor[t.variant];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/[0.08] bg-elevated/95 p-3.5 shadow-lift backdrop-blur-xl"
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", accentFor[t.variant])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 truncate text-xs text-fg-muted">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-md p-0.5 text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
