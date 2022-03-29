export interface TaskApi {
  push: (child: Task | TaskSetting) => void;
  setMessage: (message: string) => void;
  setStatus: (status: "idle" | "loading" | "success" | "error") => void;
  setDescription: (description: string) => void;
  setProgress: (progress: number) => void;
}
export interface TaskSetting {
  message?: string;
  description?: string;
  status?: "idle" | "loading" | "success" | "error";
  progress?: number;
  children?: TaskSetting[];
  task?: (params: TaskApi) => void | Promise<void>;
  fail?: (err: Error, api: TaskApi) => void | Promise<void>;
}

class Task {
  id: string;
  message?: string;
  description?: string;
  task?: (api: TaskApi) => void | Promise<void>;
  status?: "idle" | "loading" | "success" | "error";
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

  public functions() {
    return {
      push: (child: Task | TaskSetting) => {
        this.add.call(this, child);
      },
      setMessage: (msg: string) => {
        this.message = msg;
      },
      setStatus: (status) => {
        this.status = status;
      },
      setDescription: (description: string) => {
        this.description = description;
      },
      setProgress: (progress: number) => {
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
          this.execution = end[0] + end[1] / 1000000000;
          this.completed = true;
        }
      } catch (error) {
        this.completed = true;
        this.error = error.message;

        let node = this as Task;
        while (node) {
          node.status = "error";
          if (node.fail) await node.fail.call(node, error, node.functions());
          node = node.parent;
        }

        await this.run();
      }
    }

    for (const child of this.children) {
      await child.run();
    }
  }
}

export default Task;
