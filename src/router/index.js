import { createRouter, createWebHashHistory } from 'vue-router'

import HeaderGuest from "../components/header-guest";
import HeaderSmall from "../components/header-small";
import Start from "../components/start";
import Dashboard from "../components/dashboard";
import Restore from "../components/restore";
import AddAccount from "../components/add-account";
import Settings from "../components/settings";
import Popups from "../components/popups";

const router = createRouter({
  routes: [{
      path: '/',
      components: {
        default: Start,
        header: HeaderGuest
      }
    },
    {
      path: '/settings',
      components: {
        default: Settings,
        header: HeaderSmall
      }
    },
    {
      path: '/restore',
      components: {
        default: Restore,
        header: HeaderSmall
      }
    },
    {
      path: '/create',
      components: {
        default: AddAccount,
        header: HeaderSmall
      }
    },
    {
      path: '/add-account',
      components: {
        default: AddAccount,
        header: HeaderSmall
      }
    },
    {
      path: '/dashboard',
      components: {
        default: Dashboard,
        header: HeaderSmall
      }
    },
    {
      path: '/modal',
      components: {
        default: Popups,
        header: HeaderSmall
      }
    }
  ],
  history: createWebHashHistory()
});
export default router;
