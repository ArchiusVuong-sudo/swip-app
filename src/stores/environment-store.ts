import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Environment = "sandbox" | "production";

interface EnvironmentState {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set) => ({
      environment: "sandbox",
      setEnvironment: (environment) => set({ environment }),
    }),
    {
      name: "safepackage-environment",
    }
  )
);
