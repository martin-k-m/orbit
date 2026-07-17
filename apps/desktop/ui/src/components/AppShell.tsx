import { AnimatePresence, motion } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TitleBar } from "@/components/TitleBar";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "@/components/Toaster";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/cn";
import { Dashboard } from "@/views/Dashboard";
import { Analytics } from "@/views/Analytics";
import { Docker } from "@/views/Docker";
import { Database } from "@/views/Database";
import { ApiExplorer } from "@/views/ApiExplorer";
import { Settings } from "@/views/Settings";
import { ProjectView } from "@/views/ProjectView";

export function AppShell() {
  const view = useAppStore((s) => s.view);

  const key =
    view.kind === "project" ? `project:${view.id}` : view.kind;
  const inProject = view.kind === "project";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-bg text-fg">
        <TitleBar />
        <UpdateBanner />

        <div className="relative flex min-h-0 flex-1">
          <Sidebar />

          <main className="scrollbar-thin relative min-w-0 flex-1 overflow-y-auto bg-bg">
            <AnimatePresence mode="wait">
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  // The workspace (project) fills the full viewport like a real
                  // IDE — its own panels scroll internally; the launcher /
                  // analytics / settings pages stay comfortably centered.
                  inProject
                    ? "h-full w-full"
                    : "mx-auto w-full max-w-6xl px-8 py-8",
                )}
              >
                {view.kind === "dashboard" && <Dashboard />}
                {view.kind === "analytics" && <Analytics />}
                {view.kind === "docker" && <Docker />}
                {view.kind === "database" && <Database />}
                {view.kind === "apis" && <ApiExplorer />}
                {view.kind === "settings" && <Settings />}
                {view.kind === "project" && (
                  <ProjectView projectId={view.id} path={view.path} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <StatusBar />
        <CommandPalette />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
