import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**/*', 'dev-dist/**/*']
  },
  ...tseslint.configs.recommended,
  {
    files: ['firestore.rules'],
    plugins: {
      'firebase-rules': firebaseRulesPlugin
    }
    // Note: The plugin might require specific flat config setup if available, 
    // but we can also use it for manual linting or as a placeholder for now.
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
