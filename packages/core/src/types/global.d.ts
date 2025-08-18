interface Window {
  AbortSignal: typeof AbortSignal;
  runtime_config?: {
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    DEEPSEEK_API_KEY?: string;
    SILICONFLOW_API_KEY?: string;
    ZHIPU_API_KEY?: string;
    CUSTOM_API_KEY?: string;
    CUSTOM_API_BASE_URL?: string;
    CUSTOM_API_MODEL?: string;
    [key: string]: string | undefined;
  };
  electronAPI?: {
    prompt: {
      testPromptStream: (
        systemPrompt: string,
        userPrompt: string,
        modelKey: string,
        callbacks: {
          onToken: (token: string) => void;
          onReasoningToken?: (token: string) => void;
          onComplete: () => void;
          onError: (error: Error) => void;
        },
        images?: { url: string; name?: string }[],
        signal?: AbortSignal
      ) => Promise<void>;
    };
    llm: {
      // Define the methods for the LLM API proxy
      supportsMultimodal: (provider: string) => Promise<boolean>;
      sendMessage: (messages: any[], provider: string) => Promise<string>;
      sendMessageStructured: (messages: any[], provider: string) => Promise<any>;
      sendMessageStream: (
        messages: any[],
        provider: string,
        callbacks: {
          onContent?: (content: string) => void;
          onThinking?: (thinking: string) => void;
          onFinish?: () => void;
          onError?: (error: Error) => void;
        },
        signal?: AbortSignal
      ) => Promise<void>;
      testConnection: (provider: string) => Promise<void>;
      fetchModelList: (provider: string, customConfig?: any) => Promise<Array<{value: string, label: string}>>;
    };
    settings: {
      getSettings: () => Promise<any>;
      saveSetting: (setting: any) => Promise<void>;
      updateSetting: (updates: any) => Promise<void>;
      resetToDefault: () => Promise<void>;
      getDefaultSetting: () => Promise<any>;
      exportData: () => Promise<any>;
      importData: (data: any) => Promise<void>;
      getSetting: () => Promise<any>;
      testSetting: () => Promise<boolean>;
      getDataType: () => Promise<string>;
      validateData: (data: any) => Promise<boolean>;
    }
    model: {
      getModels: () => Promise<any[]>;
      addModel: (model: any) => Promise<void>;
      updateModel: (id: string, updates: any) => Promise<void>;
      deleteModel: (id: string) => Promise<void>;
      getEnabledModels: () => Promise<Array<any>>;
    };
    template: {
      getTemplates: () => Promise<any[]>;
      getTemplate: (id: string) => Promise<any>;
      createTemplate: (template: any) => Promise<any>;
      updateTemplate: (id: string, updates: any) => Promise<void>;
      deleteTemplate: (id: string) => Promise<void>;
      listTemplatesByType: (type: 'optimize' | 'userOptimize' | 'iterate') => Promise<any[]>;
    };
    history: {
      getHistory: () => Promise<any[]>;
      addRecord: (record: any) => Promise<any>;
      deleteRecord: (id: string) => Promise<void>;
      clearHistory: () => Promise<void>;
      getIterationChain: (recordId: string) => Promise<any[]>;
      getAllChains: () => Promise<any[]>;
      getChain: (chainId: string) => Promise<any>;
      createNewChain: (record: any) => Promise<any>;
      addIteration: (params: {
        chainId: string;
        originalPrompt: string;
        optimizedPrompt: string;
        iterationNote?: string;
        modelKey: string;
        templateId: string;
      }) => Promise<any>;
      deleteChain: (chainId: string) => Promise<void>;
    };
    config: {
      getEnvironmentVariables: () => Promise<Record<string, string>>;
    };
    storage: {
      // Define the methods for the Storage API proxy
      getItem: (key: string) => Promise<string | null>;
      setItem: (key: string, value: string) => Promise<void>;
      removeItem: (key: string) => Promise<void>;
      clearAll: () => Promise<void>;
      atomicUpdate: <T>(key: string, updateFn: (currentValue: T | null) => T) => Promise<void>;
      updateData: <T>(key: string, modifier: (currentValue: T | null) => T) => Promise<void>;
      batchUpdate: (operations: Array<{ key: string; operation: 'set' | 'remove'; value?: string }>) => Promise<void>;
      getStorageInfo: () => Promise<{ itemCount: number; estimatedSize: number; lastUpdated: number | null }>;
      exportAll: () => Promise<Record<string, string>>;
      importAll: (data: Record<string, string>) => Promise<void>;
      close: () => Promise<void>;
    };
  };
} 