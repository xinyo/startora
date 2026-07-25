import i18n from "i18next";
import { initReactI18next } from "react-i18next";

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  resources: {
    en: {
      translation: {
        common: {
          cancel: "Cancel",
          close: "Close",
          delete: "Delete",
          edit: "Edit",
          save: "Save changes",
          saving: "Saving…",
        },
        auth: {
          brand: "Startora",
          heading: "Your apps, one clean start.",
          intro: "Sign in to open and manage the tools you use every day.",
          loginTab: "Log in",
          registerTab: "Create account",
          username: "Username",
          usernamePlaceholder: "your.username",
          password: "Password",
          passwordPlaceholder: "At least 8 characters",
          login: "Log in",
          loggingIn: "Logging in…",
          register: "Create account",
          registering: "Creating account…",
          invalidCredentials: "The username or password is incorrect.",
          usernameTaken: "That username is already in use.",
          usernameInvalid:
            "Use 3–50 letters, numbers, dots, underscores, or hyphens.",
          passwordInvalid: "Use a password between 8 and 128 characters.",
          requestFailed: "We could not complete that request. Please try again.",
        },
        dashboard: {
          eyebrow: "Dashboard",
          greeting: "Welcome, {{username}}",
          subtitle: "Everything you need, one click away.",
          logout: "Log out",
          addApp: "Add app",
          noAppsTitle: "Build your launchpad",
          noAppsBody: "Add your first app to start your personal dashboard.",
          openApp: "Open {{name}}",
          editApp: "Edit {{name}}",
          deleteApp: "Delete {{name}}",
          loadFailed: "Your apps could not be loaded. Refresh to try again.",
        },
        appForm: {
          createTitle: "Add an app",
          editTitle: "Edit app",
          name: "App name",
          namePlaceholder: "Figma",
          icon: "Icon",
          iconSearch: "Search icons",
          iconSearchPlaceholder: "Search by icon name",
          iconResults: "{{count}} icons found",
          iconNoResults: "No matching icon. The default icon is selected.",
          url: "Web address",
          urlPlaceholder: "https://example.com",
          create: "Add app",
          creating: "Adding…",
          nameInvalid: "Enter an app name up to 100 characters.",
          iconInvalid: "Choose an available icon.",
          urlInvalid: "Enter a complete HTTP or HTTPS address.",
          requestFailed: "The app could not be saved. Please try again.",
        },
        deleteDialog: {
          title: "Delete {{name}}?",
          body: "This removes the app from your dashboard. This action cannot be undone.",
          confirm: "Delete app",
          deleting: "Deleting…",
          requestFailed: "The app could not be deleted. Please try again.",
        },
        status: {
          loading: "Loading your dashboard…",
        },
      },
    },
  },
});

export default i18n;
