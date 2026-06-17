import { createApp } from "vue";

// Import the global CSS file containing Tailwind v4
import "./assets/main.css";

// Import the main App component
import App from "./App.vue";

// Create the Vue application instance and mount it to the DOM
createApp(App).mount("#app");