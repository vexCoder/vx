import { proxy } from "valtio";
import pMap from "p-map";
import Task, { TaskSetting } from "./task.js";
import createTaskRunner from "../components/TaskRunner.js";

class TaskManager {
  static register(task: TaskSetting) {
    return new Task(task);
  }

  static async render(tasks: Task[]) {
    const proxyTasks = proxy<Task[]>(tasks);

    createTaskRunner(proxyTasks);

    await pMap(
      proxyTasks,
      async (p) => {
        await p.run();
      },
      { concurrency: 1 }
    );
  }
}

export default TaskManager;
