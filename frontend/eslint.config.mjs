// Generated after `npm install` / `nuxt prepare` — see https://eslint.nuxt.com
import withNuxt from './.nuxt/eslint.config.mjs';

// Prettier formats void elements as self-closing in Vue templates; align ESLint.
export default withNuxt({
  rules: {
    'vue/html-self-closing': [
      'warn',
      {
        html: {
          void: 'always',
          normal: 'always',
          component: 'always',
        },
      },
    ],
  },
});
