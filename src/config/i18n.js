let localeList = [{
        iso: 'en',
        name: 'English',
        dir: 'ltr',
    },
    {
        iso: 'de',
        name: 'Deutsch',
        dir: 'ltr',
    },
    {
        iso: 'da',
        name: 'Dansk',
        dir: 'ltr',
    },
    {
        iso: 'et',
        name: 'Eesti',
        dir: 'ltr',
    },
    {
        iso: 'es',
        name: 'Español',
        dir: 'ltr',
    },
    {
        iso: 'fr',
        name: 'Français',
        dir: 'ltr',
    },
    {
        iso: 'it',
        name: 'Italiano',
        dir: 'ltr',
    },
    {
        iso: 'ja',
        name: '日本語',
        dir: 'ltr',
    },
    {
        iso: 'ko',
        name: '한국어',
        dir: 'ltr',
    },
    {
        iso: 'pt',
        name: 'Português',
        dir: 'ltr',
    },
    {
        iso: 'th',
        name: 'ไทย',
        dir: 'ltr',
    }
];

export const locales = localeList;
export const defaultLocale = localeList[0];
export const selectLocales = localeList.map(locale => {
  return {label: locale.name, value: locale.iso}
});
export const menuLocales = localeList.map(locale => locale.iso);
