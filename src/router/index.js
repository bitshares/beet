import VueRouter from 'vue-router'
import HeaderGuest from "../components/header-guest";
import HeaderSmall from "../components/header-small";
import Start from "../components/start";
import Dashboard from "../components/dashboard";
import AddAccount from "../components/add-account";
import Settings from "../components/settings";

const router = new VueRouter({
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
    }
  ]
});
export default router;