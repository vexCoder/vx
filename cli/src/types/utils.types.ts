import * as Pmap from "p-map";

export interface FileConfig {
  name: string;
  src: string;
  dest: string;
  isDir: boolean;
}

export type InferPromise<T> = T extends Promise<infer U> ? U : T;

export interface SpinnerOptions<T, Z> extends Pmap.Options {
  map: (p: T) => Promise<Z>;
  messager?: (p: T) => void;
}
