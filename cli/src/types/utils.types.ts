export interface CopyFilesConfig {
  src: string;
  dest: string;
  isDir: boolean;
}

export type InferPromise<T> = T extends Promise<infer U> ? U : T;
