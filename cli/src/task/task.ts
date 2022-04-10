import { isPromise } from "util/types";

export type Status = "idle" | "loading" | "success" | "error";

export interface TaskApi {
  add: (child: Task | TaskSetting) => void;
  setFail: (fn: (err: Error, api: TaskApi) => void | Promise<void>) => void;
  setMessage: (message: string) => void;
  setStatus: (message: Status) => void;
  setDescription: (message: string) => void;
  setProgress: (message: number) => void;
}
export interface TaskSetting {
  message?: string;
  description?: string;
  status?: Status;
  progress?: number;
  children?: TaskSetting[];
  fail?: (error: Error, api: TaskApi) => void | Promise<void>;
  task?: (params: TaskApi) => void | Promise<void>;
}

class Task {
  id: string;
  message?: string;
  description?: string;
  task?: (api: TaskApi) => void | Promise<void>;
  status?: Status;
  progress?: number;
  execution?: number;
  completed?: boolean;
  error?: string;
  level?: number;
  fail?: (error: Error, api: TaskApi) => void | Promise<void>;
  parent?: Task;
  children?: Task[] = [];

  constructor(t: TaskSetting) {
    this.id = `task-${Math.random() * 9999 + 1000}`;
    this.status = t.status ?? "idle";
    this.message = t.message;
    this.task = t.task;
    this.description = t.description;
    this.progress = t.progress;
    this.fail = t.fail;
    this.level = 0;
    this.completed = false;
  }

  public add(child: Task | TaskSetting) {
    if (!this.children) this.children = [];
    const newChild = child instanceof Task ? child : new Task(child);
    newChild.parent = this;
    newChild.level = this.level + 1;
    this.children.push(newChild);
    return this;
  }

  public remove(child: Task) {
    if (!this.children) return;
    this.children = this.children.filter((c) => c.id !== child.id);
    child.parent = null;
    return this;
  }

  public functions(): TaskApi {
    return {
      add(child: Task | TaskSetting) {
        this.add.call(this, child);
      },
      setFail(fn: (error: Error, failApi: TaskApi) => void) {
        this.fail = fn;
      },
      setMessage(msg: string) {
        this.message = msg;
      },
      setStatus(status: Status) {
        this.status = status;
      },
      setDescription(description: string) {
        this.description = description;
      },
      setProgress(progress: number) {
        this.progress = progress;
      },
    };
  }

  public async run() {
    if (!this.completed) {
      try {
        if (this.task) {
          const start = process.hrtime();
          await this.task(this.functions());
          const end = process.hrtime(start);
          if (isPromise(this.task))
            this.execution = end[0] + end[1] / 1000000000;

          this.completed = true;
        }

        for (const child of this.children) {
          await child.run.call(child);
        }
      } catch (error) {
        this.completed = true;
        this.error = error.message;
        if (this.parent && this.parent.children) {
          for (let i = 0; i < this.parent.children.length; i++) {
            const t = this.parent.children[i];
            t.task = undefined;
          }
        }

        let node = this as Task;
        while (node) {
          node.status = "error";
          if (node.fail)
            await node.fail.call(node, error, node.functions.call(node));
          node = node.parent;
        }

        await this.run();
      }
    }
  }
}

export default Task;
