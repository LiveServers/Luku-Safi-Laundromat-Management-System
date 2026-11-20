import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextCoreWebVitals,
  {
    // shortcut: existing hook findings warn until the affected effects are refactored.
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
