/* eslint-disable func-names */
import { proxy } from "valtio";
import pMap from "p-map";
import Task, { Status, TaskApi } from "../task/task.js";
import createTaskRunner from "../components/TaskRunner.js";

type TaskOrFail = (arg: TaskManagerApi, err?: Error) => void | Promise<void>;

export interface TaskManagerApi extends TaskApi {
  task: (...args: Parameters<typeof task>) => void;
  taskFail: (fn: TaskOrFail) => void;
}

type P = Parameters<typeof task>;

export const task = (
  name: string,
  statusOrFunctionOrError: Status | TaskOrFail,
  functionOrError?: TaskOrFail
) => {
  let status: Status = "idle";
  let fn: TaskOrFail | undefined;

  if (isTaskTaskFn(statusOrFunctionOrError)) {
    fn = statusOrFunctionOrError;
    status = "idle";
  } else if (isTaskTaskFn(functionOrError)) {
    status = statusOrFunctionOrError;
    fn = functionOrError;
  }

  const task = new Task({
    message: name,
    status,
  });

  const bindApi = (t: Task, api: TaskApi) => {
    const bindedApi = Object.keys(api).reduce(
      (p, c) => ({
        ...p,
        [c]: api[c].bind(t),
      }),
      {} as TaskApi
    );

    return bindedApi;
  };

  const pushFail = function (fn: P[2]) {
    this.fail = async function (error, api2) {
      this.status = "error";
      const toCall = isTaskTaskFn(status) ? status : fn;
      toCall.bind(this);

      await toCall(
        {
          ...bindApi(this, api2),
          task: push.bind(this),
          taskFail: pushFail.bind(this),
        },
        error
      );
    };
  };

  const push = function (name: P[0], status: P[1], fn: P[2]) {
    const newTask = new Task({
      message: name,
      status: typeof status === "string" ? status : "idle",
    });

    newTask.task = async function (api2) {
      const toCall = isTaskTaskFn(status) ? status : fn;
      toCall.bind(this);

      await toCall({
        ...bindApi(this, api2),
        task: push.bind(this),
        taskFail: pushFail.bind(this),
      });
    };

    this.add(newTask);
  };

  task.task = async function (api) {
    await fn.call(this, {
      ...bindApi(this, api),
      task: push.bind(this),
      taskFail: pushFail.bind(this),
    });
  };

  return task;
};

export const isTaskFailFn = (fn: TaskOrFail | Status): fn is TaskOrFail =>
  typeof fn === "function" && fn.length === 2;

export const isTaskTaskFn = (fn: TaskOrFail | Status): fn is TaskOrFail =>
  typeof fn === "function" && fn.length === 1;

export const render = async (tasks: Task[]) => {
  const proxyTasks = proxy<Task[]>(tasks);

  createTaskRunner(proxyTasks);

  await pMap(
    proxyTasks,
    async (p) => {
      await p.run();
    },
    { concurrency: 1 }
  );
};

// taskFail: (name: P[0], status: P[1], fn2: P[2]) => {
//   task.fail = (error, failApi) => {
//     const task = new Task({
//       message: name,
//       status: typeof status === "string" ? status : "idle",
//       task: (api2) => {
//         fn2.call(
//           task,
//           {
//             ...api2,
//             task: (name: P[0], status: P[1], fn2: P[2]) => {
//               api2.add(TaskManager.register(name, status, fn2));
//             },
//           },
//           error
//         );
//       },
//     });

//     failApi.add(task);
//   };
// },
