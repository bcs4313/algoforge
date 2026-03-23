import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";
import { useSession } from "./lib/auth";
import Index from "./pages/index";
import SignIn from "./pages/sign-in";
import SignUp from "./pages/sign-up";
import Builder from "./pages/builder";
import Strategies from "./pages/strategies";

function ProtectedRoute({ component: Component }: { component: () => React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending) return null;
  if (!session) return <Redirect to="/sign-in" />;
  return <Component />;
}

function App() {
  return (
    <Provider>
      <ErrorBoundary>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/sign-up" component={SignUp} />
        <Route path="/builder" component={Builder} />
        <Route path="/strategies">
          <ProtectedRoute component={Strategies} />
        </Route>
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
