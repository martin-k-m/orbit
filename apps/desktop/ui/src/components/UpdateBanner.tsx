import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkForUpdate, installUpdate, type UpdateInfo } from "@/lib/updater";

// A slim banner that appears when a newer version of Orbit is available and
// lets the user install it and relaunch. Silent when up to date or in the
// browser demo.
export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    checkForUpdate().then((info) => {
      if (!cancelled) setUpdate(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const show = update && !dismissed;

  async function onInstall() {
    setInstalling(true);
    try {
      await installUpdate((f) => setProgress(f));
    } catch {
      setInstalling(false);
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="flex items-center gap-3 border-b border-white/[0.06] bg-accent/[0.08] px-4 py-2 text-sm"
        >
          <Download className="h-4 w-4 text-accent" />
          <span className="text-fg">
            Orbit <strong>v{update?.version}</strong> is available.
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={onInstall} disabled={installing}>
              {installing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {progress > 0 ? `${Math.round(progress * 100)}%` : "Installing…"}
                </>
              ) : (
                "Install & restart"
              )}
            </Button>
            {!installing && (
              <button
                aria-label="Dismiss update"
                className="no-drag rounded-md p-1 text-fg-muted hover:bg-white/[0.06] hover:text-fg"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
