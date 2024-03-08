/*
    This script is used to detect and fix any variables which have been broken during translations.
    It uses the english locale files as the truthful references, and scans deeply nested keys for variables to fix.
*/

const fs = require('fs');

// 
function getAllKeys(obj, prefix = '') {
    return Object.entries(obj).reduce((result, [key, value]) => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;

        return result.concat([
        newPrefix,
        ...(typeof value === 'object' && value !== null
            ? getAllKeys(value, newPrefix)
            : []),
        ]);
    }, []);
}

/**
 * access nested values in an object using a string path
 * @param {Object} obj 
 * @param {String} path 
 * @returns 
 */
function getNestedValue(obj, path) {
    if (!path) return;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// 1. import en.json files to use as primary sources of truth
const en_common = require('./common/en.json');
const en_operations = require('./operations/en.json');

// 2. Extract all nested keys from ./common/en.json and ./operations/en.json
const en_common_keys = getAllKeys(en_common);
const en_operations_keys = getAllKeys(en_operations);
// The above keys will be identical for all languages, no need to getAllKeys for all languages


// for all keys, find those which values contain the variable string e.g {variable}
// for all keys, find those which values contain the variable string e.g {variable}
const variable_regex = /{(.+?)}/g;
const common_variables = [];
const operations_variables = [];

// 3. For all retrieved keys, detect if they have variables like "text {variable} text", and extract an array of these detected variables
en_common_keys.forEach((key) => {
    //const value = en_common[key];
    const value = getNestedValue(en_common, key);
    if (typeof value === 'string') {
        const matches = value.match(variable_regex);
        if (matches) {
            common_variables.push({key, matches});
        }
    }
    
    if (!value) {
        console.log('not a string', key, value);
    }
});

en_operations_keys.forEach((key) => {
    const value = getNestedValue(en_operations, key);

    if (typeof value === 'string') {
        const matches = value.match(variable_regex);
        if (matches) {
            operations_variables.push({key, matches});
        }
    }
    
    if (!value) {
        console.log('not a string', key, value);
    }
});

const languages = [
    'da',
    'de',
    'es',
    'fr',
    'it',
    'ja',
    'ko',
    'pt',
    'th'
];

function overwriteVariables() {
    languages.forEach((language) => {
        const commonLanguageFile = require(`./common/${language}.json`);
        const operationsLanguageFile = require(`./operations/${language}.json`);

        let comparisonCommonJSON = commonLanguageFile; // for overwriting
        let comparisonOperationsJSON = operationsLanguageFile; // for overwriting

        function setNestedValue(obj, lookupKey, newValue) {
            const parts = lookupKey.split('.');
            const lastPart = parts.pop();
            const parent = parts.reduce((acc, part) => {
              if (typeof acc[part] !== 'object' || acc[part] === null) {
                acc[part] = {};
              }
              return acc[part];
            }, obj);
            parent[lastPart] = newValue;
          }

        en_common_keys
            .forEach((x) => {
                const {key, matches} = x;
                const original = getNestedValue(comparisonCommonJSON, key);
                let comparisonValue = getNestedValue(comparisonCommonJSON, key);
                if (typeof comparisonValue === 'string') {
                    const comparisonMatches = comparisonValue.match(variable_regex); // ["{variable}", ...]
                    
                    if (!comparisonMatches || !comparisonMatches.length) {
                        const partialRegex = /(?<=\s|^)[^{\s]+(?=\})/g;
                        const partialMatches = comparisonValue.match(partialRegex);
                        partialMatches.forEach((match, i) => {
                            comparisonValue = comparisonValue.replace(match + "}", matches[i]);
                        });
                        if (comparisonValue !== original) {
                            console.log(`replacing "${original}" with "${comparisonValue}"`);
                            setNestedValue(comparisonCommonJSON, key, comparisonValue);
                        }
                        return;
                    }
    
                    comparisonMatches.forEach((match, i) => {
                        // overwrite the match with the enMatch in the comparisonCommonJSON data
                        if (match !== matches[i]) {
                            comparisonValue = comparisonValue.replace(match, matches[i]);
                        }
                    });

                    if (comparisonValue !== original) {
                        console.log(`replacing "${original}" with "${comparisonValue}"`);
                        setNestedValue(comparisonCommonJSON, key, comparisonValue);
                    }
                }
            })

        // save json to disk
        fs.writeFile(`./common/${language}.json`, JSON.stringify(comparisonCommonJSON, null, 2), function writeJSON(err) {
            if (err) return console.log(err);
            console.log(`writing to common ${language}.json`);
        });

        operations_variables
        .forEach((x) => {
            //console.log({y: x})
            const {key, matches} = x;
            const original = getNestedValue(comparisonOperationsJSON, key);
            let comparisonValue = getNestedValue(comparisonOperationsJSON, key);
            if (typeof comparisonValue === 'string') {
                const comparisonMatches = comparisonValue.match(variable_regex); // ["{variable}", ...]
                
                if (!comparisonMatches || !comparisonMatches.length) {
                    //console.log({key, comparisonValue, comparisonMatches})
                    const partialRegex = /(?<=\s|^)[^{\s]+(?=\})/g;
                    const partialMatches = comparisonValue.match(partialRegex);
                    partialMatches.forEach((match, i) => {
                        comparisonValue = comparisonValue.replace(match + "}", matches[i]);
                    });
                    if (comparisonValue !== original) {
                        console.log(`replacing "${original}" with "${comparisonValue}"`);
                        setNestedValue(comparisonOperationsJSON, key, comparisonValue);
                    }
                    return;
                }

                comparisonMatches.forEach((match, i) => {
                    // overwrite the match with the enMatch in the comparisonCommonJSON data
                    if (match !== matches[i]) {
                        //console.log(`replacing ${match} with ${matches[i]}`)
                        comparisonValue = comparisonValue.replace(match, matches[i]);
                    }
                });
                if (comparisonValue !== original) {
                    console.log(`replacing "${original}" with "${comparisonValue}"`);
                    setNestedValue(comparisonOperationsJSON, key, comparisonValue);
                }
            }
        })

        fs.writeFile(`./operations/${language}.json`, JSON.stringify(comparisonOperationsJSON, null, 2), function writeJSON(err) {
            if (err) return console.log(err);
            console.log(`writing to operations ${language}.json`);
        });
    });
}

overwriteVariables();
