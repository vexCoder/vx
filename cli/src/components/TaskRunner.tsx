import { render } from "ink";
import React from "react";
import { useSnapshot } from "valtio";
import TaskData from "../task/task.js";
import Task from "./Task.js";

interface TaskRunnerProps {
  tasks: TaskData[];
}

function TaskRunner({ tasks }: TaskRunnerProps) {
  const proxy = useSnapshot(tasks) as TaskData[];

  const reducer = (c?: TaskData[]) => {
    const arr = (c ?? proxy).reduce((p, c) => {
      let slice = p.slice();
      slice.push(<Task key={c.id} task={c} />);
      if (c.children) slice = slice.concat(reducer(c.children));
      return slice;
    }, []);

    return arr;
  };

  return <>{reducer(tasks)}</>;
}

export default (tasks: TaskRunnerProps["tasks"]) => {
  const app = render(<TaskRunner tasks={tasks} />);
  return () => {
    app.rerender(null);
    app.unmount();
    app.clear();
    app.cleanup();
  };
};
