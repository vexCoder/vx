import { Box, Text, Spacer } from "ink";
import React from "react";
import _ from "lodash";
import Color from "color";
import TaskData from "../task/task.js";
import Loader from "./Loader.js";

interface TaskProps {
  task: TaskData;
}

function Task({ task }: TaskProps) {
  const statuses: Record<typeof task["status"], React.ReactNode> = {
    success: <Text color="green">✓</Text>,
    error: <Text color="red">✘</Text>,
    idle: <Text color="cyan">𝒊</Text>,
    loading: <Loader type="dots" color="yellow" />,
  };

  const isIdle = task.status === "idle";
  const isError = task.status === "error";
  return (
    <Box display="flex" flexDirection="column">
      <Box marginLeft={task.level * 2} display="flex" alignItems="center">
        {task.error ? (
          <Text backgroundColor="red">{` Error `}</Text>
        ) : (
          statuses[task.status]
        )}
        {!task.error && (
          <Box marginLeft={isIdle ? 0 : 1}>
            <Text>{task.message}</Text>
          </Box>
        )}
        {task.error && (
          <Box marginLeft={1}>
            <Text>{task.error}</Text>
            <Text color="gray">{` (${task.message})`}</Text>
          </Box>
        )}
        <Spacer />
        {!task.execution && typeof task.progress === "number" && (
          <Progression play={!isError} progress={task.progress} rate={30} />
        )}
        {task.execution && (
          <Text color="gray">{`took ${task.execution.toFixed(3)}s`}</Text>
        )}
      </Box>
      {task.description && (
        <Box marginLeft={task.level * 2 + 2} display="flex" alignItems="center">
          <Text color="gray">{task.description}</Text>
        </Box>
      )}
    </Box>
  );
}

interface ProgressionProps {
  progress: number;
  rate?: number;
  play?: boolean;
}

function Progression({ progress, rate = 30, play }: ProgressionProps) {
  const [lastProgress, setLastProgress] = React.useState(0);
  const [value, setValue] = React.useState(0);

  const update = async (step: number) => {
    await new Promise<void>((resolve) =>
      setTimeout(() => {
        resolve();
      }, 1000 / rate)
    );

    setValue((value) => value + step);
  };

  React.useEffect(() => {
    if (!play) return;
    if (value >= progress) {
      setLastProgress(progress);
      return;
    }

    const step = (progress - lastProgress) / rate;
    update(step);
  }, [progress, value]);

  const color = Color.hsl(149, 64 * value, 50).hex();
  return (
    <Text color={color}>{`${_.clamp(value * 100, 0, 100).toFixed(0)}%`}</Text>
  );
}

export default Task;
