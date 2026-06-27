import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { RecipeProvider } from "@/lib/recipe-store";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/home";
import { Result } from "@/pages/result";
import { Saved } from "@/pages/saved";
import { Payment } from "@/pages/payment";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/result" component={Result} />
        <Route path="/saved" component={Saved} />
        <Route path="/payment" component={Payment} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="recipe-scanner-theme">
        <RecipeProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </RecipeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
