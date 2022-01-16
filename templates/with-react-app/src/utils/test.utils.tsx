/* eslint-disable react/jsx-no-useless-fragment */
/* eslint-disable react/function-component-definition */
/* eslint-disable import/no-extraneous-dependencies */
import * as testing from '@testing-library/react';
import React, { FC, ReactElement } from 'react';

const Providers: FC = ({ children }) => <>{children}</>;

export const render = (
  ui: ReactElement,
  options?: Omit<testing.RenderOptions, 'wrapper'>,
) => testing.render(ui, { wrapper: Providers, ...options });

export * from '@testing-library/react';
