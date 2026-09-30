import "./styles.css";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import "@fortawesome/fontawesome-free/css/regular.min.css";
import { render } from "solid-js/web";
import App from "./App";
import { initTheme } from "./state/theme";
import { watchViewport } from "./state/viewport";

initTheme();
watchViewport();
render(() => <App />, document.getElementById("app")!);
