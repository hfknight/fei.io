/* eslint-disable @typescript-eslint/no-empty-object-type */
import 'styled-components';
import { Theme as CustomTheme } from './theme';

declare module 'styled-components' {
  export interface DefaultTheme extends CustomTheme {}
}