import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
    // Base configuration for all files
    js.configs.recommended,

    // Ignore configuration
    {
        ignores: [
            'scripts/**/*',
            'dist/**/*',
            'node_modules/**/*',
            '*.config.js',
            '*.config.ts',
        ],
    },

    // Configuration for TypeScript/React files (browser environment)
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.es2020,
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'unused-imports': unusedImports,
        },
        rules: {
            // TypeScript recommended rules
            ...typescript.configs.recommended.rules,

            // React hooks rules
            ...reactHooks.configs.recommended.rules,

            // Custom rules
            'react-refresh/only-export-components': [
                'warn',
                {allowConstantExport: true},
            ],

            // Unused imports and variables - 忽略未使用导入的错误
            'unused-imports/no-unused-imports': 'off',
            'unused-imports/no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off', // Turn off the base rule as it's replaced by unused-imports

            '@typescript-eslint/no-explicit-any': 'off', // 允许使用 any 类型，在原型开发阶段很常见
            'no-console': 'off', // 允许 console 语句，用于调试
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-template': 'error',
        },
    },

    // Configuration for Node.js files (config files, scripts)
    {
        files: ['*.{js,ts,cjs,mjs}', 'scripts/**/*.{js,ts,cjs}', 'vite.config.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
                ...globals.es2020,
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            'unused-imports': unusedImports,
        },
        rules: {
            // TypeScript recommended rules
            ...typescript.configs.recommended.rules,

            // Custom rules for Node.js files - 忽略未使用导入的错误
            'unused-imports/no-unused-imports': 'off',
            'unused-imports/no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off', // Turn off the base rule as it's replaced by unused-imports

            '@typescript-eslint/no-explicit-any': 'off', // 允许使用 any 类型
            'no-console': 'off', // Allow console in Node.js files
            'no-unused-vars': 'off', // Turn off base rule for Node.js files
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-template': 'error',
        },
    },

    // Configuration for test files
    {
        files: [
            '**/*.test.{ts,tsx}',
            '**/__tests__/**/*.{ts,tsx}',
            '**/test/**/*.{ts,tsx}',
        ],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
            globals: {
                ...globals.browser,
                ...globals.es2020,
                // Vitest globals
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                vi: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            'unused-imports': unusedImports,
        },
        rules: {
            // TypeScript recommended rules
            ...typescript.configs.recommended.rules,

            // Unused imports and variables - 忽略未使用导入的错误
            'unused-imports/no-unused-imports': 'off',
            'unused-imports/no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',

            '@typescript-eslint/no-explicit-any': 'off', // 允许使用 any 类型
            'no-console': 'off', // Allow console in test files
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-template': 'error',
        },
    },

    // Ignore patterns
    {
        ignores: ['dist/**', 'src-tauri/**', 'eslint.config.js', 'node_modules/**'],
    },
];
