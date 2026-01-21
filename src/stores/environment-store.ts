import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Environment = "sandbox" | "production";

interface ApiKeys {
  sandbox?: string;
  production?: string;
}

interface EnvironmentState {
  environment: Environment;
  apiKeys: ApiKeys;
  setEnvironment: (env: Environment) => void;
  setApiKey: (env: Environment, key: string) => void;
  clearApiKey: (env: Environment) => void;
  getApiKey: (env: Environment) => string | undefined;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environment: "sandbox",
      apiKeys: {},
      setEnvironment: (environment) => set({ environment }),
      setApiKey: (env, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [env]: key },
        })),
      clearApiKey: (env) =>
        set((state) => {
          const newApiKeys = { ...state.apiKeys };
          delete newApiKeys[env];
          return { apiKeys: newApiKeys };
        }),
      getApiKey: (env) => get().apiKeys[env],
    }),
    {
      name: "safepackage-environment",
    }
  )
);
