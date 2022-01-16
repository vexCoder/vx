import React, { ReactElement } from 'react';

function Counter(): ReactElement {
  const [state, setState] = React.useState(0);

  return (
    <div>
      <button
        data-testid="counter-minus"
        type="button"
        onClick={() => setState(state - 1)}
      >
        -
      </button>
      <div data-testid="counter">{state}</div>
      <button
        data-testid="counter-plus"
        type="button"
        onClick={() => setState(state + 1)}
      >
        +
      </button>
    </div>
  );
}

export default Counter;
