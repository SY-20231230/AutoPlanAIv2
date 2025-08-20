type ToolCategory = 'sql' | 'backend' | string;

interface Tool {
  id: string;
  category: ToolCategory;
  name: string;
  why: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
}

interface GlobalAppConfig {
  appName: string;
  version: string;
}

type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type ValueOf<T> = T[keyof T];

export {
  ToolCategory,
  Tool,
  GlobalAppConfig,
  Nullable,
  Optional,
  ValueOf,
};