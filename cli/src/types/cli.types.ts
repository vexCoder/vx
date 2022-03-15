import { Commands } from "./operation.types.js";

export interface CliSettings {
  command: string | Commands;
  template?: string;
  name?: string;
  workspace?: string;
  confirm?: boolean;
  concurrency?: number;
}
