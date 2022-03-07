let localelist = [{
        iso: 'en',
        name: 'English',
        dir: 'ltr',
    }
    //,
    // {
    //    iso: 'de',
    //    name: 'Deutsch',
    //    dir: 'ltr',
    //}
];

export const locales = localelist;
export const defaultLocale = localelist[0];
export const selectLocales = localelist.map(locale => {
  return {label: locale.name, value: locale.iso}
});
