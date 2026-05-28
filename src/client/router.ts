import { createRouter, createWebHistory } from "vue-router";
import { resolveAuthNavigation } from "./lib/auth-guard";
import Home from "./views/Home.vue";
import Login from "./views/login.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { requiresAuth: false },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => resolveAuthNavigation(to));

export default router;
