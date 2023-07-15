If you have used a machine learning based translation service to translate locale files, you may run into a scenario where variables in locale strings get translated, resulting in a failure to render the locale string in app.

With node installed, launch a terminal window and type the following command:

`node ./fix_locale_variables_post_translation.js`

It will output text to the terminal informing you of the changes being made, like:

```
node .\fixVariables.js
replacing "Transaktions-id: { resultat-id }" with "Transaktions-id: { resultID }"
...
writing to common da.json
```