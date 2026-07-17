import { FolderPlus, ScanSearch, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app";
import { addProject, pickFolder, scanFolder } from "@/lib/ipc";

interface Action {
  label: string;
  description: string;
  icon: typeof FolderPlus;
  run: () => void | Promise<void>;
}

export function QuickActions() {
  const navigate = useAppStore((s) => s.navigate);
  const setProjects = useAppStore((s) => s.setProjects);
  const pushToast = useAppStore((s) => s.pushToast);

  async function handleAdd() {
    const path = await pickFolder();
    if (!path) return;
    setProjects(await addProject(path));
    pushToast({ variant: "success", title: "Project added", description: path });
  }

  async function handleScan() {
    const path = await pickFolder();
    if (!path) return;
    const found = await scanFolder(path);
    setProjects(found);
    pushToast({
      variant: "success",
      title: "Scan complete",
      description: `${found.length} projects found`,
    });
  }

  const actions: Action[] = [
    {
      label: "Add project",
      description: "Track a folder",
      icon: FolderPlus,
      run: handleAdd,
    },
    {
      label: "Scan folder",
      description: "Discover projects",
      icon: ScanSearch,
      run: handleScan,
    },
    {
      label: "Analytics",
      description: "Weekly activity",
      icon: BarChart3,
      run: () => navigate({ kind: "analytics" }),
    },
    {
      label: "Settings",
      description: "Themes & editor",
      icon: SettingsIcon,
      run: () => navigate({ kind: "settings" }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            whileHover={{ y: -2 }}
            onClick={() => void a.run()}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left backdrop-blur transition-shadow hover:shadow-soft"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-gradient text-white shadow-soft transition-transform group-hover:scale-105">
              <Icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-fg">
                {a.label}
              </span>
              <span className="block text-xs text-fg-subtle">
                {a.description}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
