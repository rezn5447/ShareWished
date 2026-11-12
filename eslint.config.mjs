import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // Playwright fixtures take a callback named `use`; it isn't React's hook.
    files: ['e2e/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    // Python virtualenvs (ai/.venv) bundle JavaScript from packages like PyTorch.
    ignores: ['.next/**', 'node_modules/**', '**/.venv/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'],
  },
]

export default eslintConfig
