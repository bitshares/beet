let localeList = [{
        iso: 'en',
        name: 'English',
        dir: 'ltr',
    },
    {
            iso: 'de',
            name: 'ger',
            dir: 'ltr',
        }
    //,
    // {
    //    iso: 'de',
    //    name: 'Deutsch',
    //    dir: 'ltr',
    //}
];

export const locales = localeList;
export const defaultLocale = localeList[0];
export const selectLocales = localeList.map(locale => {
  return {label: locale.name, value: locale.iso}
});
export const menuLocales = localeList.map(locale => locale.iso);
