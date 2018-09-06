module.exports = {
    extends: [        
        "eslint:recommended",
        'plugin:vue/recommended'
    ],
    rules: {
        'vue/script-indent': ['warn', 4, {
          'baseIndent': 1
        }],
        'vue/html-indent': ['warn', 4, {
          'baseIndent': 1
        }],        
        "no-console": 0
    }
}