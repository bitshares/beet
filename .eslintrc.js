module.exports = {
    root: true,
    env: {
      node: true,
      'vue/setup-compiler-macros': true
    },
    extends: [
        "eslint:recommended",
        'plugin:vue/vue3-recommended'
    ],
    plugins: [
        'vue'
    ],
    rules: {
        'vue/script-indent': ['error', 4, {
          'baseIndent': 1
        }],
        'vue/html-indent': ['error', 4, {
          'baseIndent': 1
        }],
        "no-console": 0,
        "no-unused-vars": "off",
        "no-async-promise-executor": "off",
        "vue/multi-word-component-names": "off"
    }
  }
