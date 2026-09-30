import { Route, Router, type RouteSectionProps, useNavigate } from "@solidjs/router";
import { Show, lazy, onMount } from "solid-js";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import TestPage from "./pages/TestPage";
import { refreshIdentity } from "./state/identity";
import { setNavigator } from "./state/live";
import Footer from "./ui/Footer";
import Nav from "./ui/Nav";
import TabBar from "./ui/TabBar";
import { isTouch } from "./state/device";
import { playing } from "./state/focus";
import { keyboardOpen } from "./state/viewport";
import Notices from "./ui/Notices";

// the tests (home and test pages) come with the app; other pages load when first visited
const Admin = lazy(() => import("./pages/Admin"));
const Daily = lazy(() => import("./pages/Daily"));
const Duel = lazy(() => import("./pages/Duel"));
const DuelHub = lazy(() => import("./pages/DuelHub"));
const Friends = lazy(() => import("./pages/Friends"));
const Leaderboards = lazy(() => import("./pages/Leaderboards"));
const Login = lazy(() => import("./pages/Login"));
const Org = lazy(() => import("./pages/Org"));
const Orgs = lazy(() => import("./pages/Orgs"));
const Party = lazy(() => import("./pages/Party"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileGame = lazy(() => import("./pages/ProfileGame"));
const ProfileHistory = lazy(() => import("./pages/ProfileHistory"));
const Register = lazy(() => import("./pages/Register"));
const Remote = lazy(() => import("./pages/Remote"));
const RemotePair = lazy(() => import("./pages/RemotePair"));
const UserProfile = lazy(() => import("./pages/UserProfile"));

function Layout(props: RouteSectionProps) {
  const navigate = useNavigate();
  setNavigator((path) => navigate(path));
  onMount(() => void refreshIdentity());
  // a phone used as a remote gets the controller alone
  const bare = () => props.location.pathname.startsWith("/remote");
  // a phone playing a game gets the whole screen; its tab bar also gives way to the keyboard
  const gameOnPhone = () => playing() && isTouch();
  const tabs = () => !bare() && !gameOnPhone() && !keyboardOpen();
  return (
    // the visible height (`dvh`: less Safari's or Chrome's bars as they come and go), clear of
    // the notch and the rounded corners (the safe areas), and of the tab bar on a phone
    <div
      class={`mx-auto grid min-h-[100dvh] w-full max-w-[1536px] grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] gap-4 px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-8 sm:px-8 sm:py-8 ${
        tabs() ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))]" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      }`}
    >
      <Show when={!bare() && !gameOnPhone()} fallback={<div />}>
        <Nav />
      </Show>
      <main class="flex flex-col">{props.children}</main>
      <Show when={!bare() && !gameOnPhone()} fallback={<div />}>
        <Footer />
      </Show>
      <Show when={tabs()}>
        <TabBar />
      </Show>
      <Notices />
    </div>
  );
}

export default function App() {
  return (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/t/:test" component={TestPage} />
      <Route path="/daily" component={Daily} />
      <Route path="/duel" component={DuelHub} />
      <Route path="/duel/:test/:code?" component={Duel} />
      <Route path="/party/:code?" component={Party} />
      <Route path="/leaderboards/:test?" component={Leaderboards} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/history" component={ProfileHistory} />
      <Route path="/profile/:test" component={ProfileGame} />
      <Route path="/friends" component={Friends} />
      <Route path="/admin" component={Admin} />
      <Route path="/remote" component={Remote} />
      <Route path="/remote/pair/:code" component={RemotePair} />
      <Route path="/orgs" component={Orgs} />
      <Route path="/orgs/:tag" component={Org} />
      <Route path="/u/:username" component={UserProfile} />
      <Route path="/u/:username/history" component={ProfileHistory} />
      <Route path="/u/:username/:test" component={ProfileGame} />
      <Route path="*" component={NotFound} />
    </Router>
  );
}
