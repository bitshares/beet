module.exports = {
    root: true,
    env: {
      node: true
    },
    extends: [        
        "eslint:recommended",
        'plugin:vue/recommended'
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
        "no-console": 0
    },
    parserOptions: {
      parser: 'babel-eslint'
    }
  }
  