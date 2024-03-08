import { createRouter, createWebHashHistory } from 'vue-router'

import HeaderGuest from "../components/header-guest";
import HeaderSmall from "../components/header-small";
import Start from "../components/start";
import Dashboard from "../components/dashboard";
import Restore from "../components/restore";
import AddAccount from "../components/add-account";
import Dapps from "../components/dapps";
import Backup from "../components/backup";
import Totp from "../components/totp";
import RawLink from "../components/raw-link";
import Qr from "../components/qr";
import Popups from "../components/popups";
import Receipt from "../components/receipt";
import Local from "../components/local";

const router = createRouter({
  routes: [{
      path: '/',
      components: {
        default: Start,
        header: HeaderGuest
      }
    },
    {
      path: '/backup',
      components: {
        default: Backup,
        header: HeaderSmall
      }
    },
    {
      path: '/dapps',
      components: {
        default: Dapps,
        header: HeaderSmall
      }
    },
    {
      path: '/local',
      components: {
        default: Local,
        header: HeaderSmall
      }
    },
    {
      path: '/totp',
      components: {
        default: Totp,
        header: HeaderSmall
      }
    },
    {
      path: '/raw-link',
      components: {
        default: RawLink,
        header: HeaderSmall
      }
    },
    {
      path: '/qr',
      components: {
        default: Qr,
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
    },
    {
        path: '/receipt',
        components: {
            default: Receipt,
            header: HeaderSmall
        }
    }
  ],
  history: createWebHashHistory()
});
export default router;
