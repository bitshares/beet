import VueRouter from 'vue-router'
import HeaderGuest from "../components/header-guest";
import HeaderSmall from "../components/header-small";
import Start from "../components/start";
import Create from "../components/create";
import Dashboard from "../components/dashboard";

const router = new VueRouter({
  routes: [{
      path: '/',
      components: {
        default: Start,
        header: HeaderGuest
      }
    },
    {
      path: '/create',
      components: {
        default: Create,
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