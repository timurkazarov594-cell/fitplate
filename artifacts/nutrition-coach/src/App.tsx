import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/authContext";
import { captureReferralFromUrl, getRefCodeFromUrlParam } from "@/lib/referral";
import { trackPartnerReferralClick } from "@workspace/api-client-react";
import { SupportButton } from "@/components/support-button";
import { InstallBanner } from "@/components/install-banner";
import NotFound from "@/pages/not-found";

import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Analyze from "@/pages/analyze";
import History from "@/pages/history";
import Stats from "@/pages/stats";
import Settings from "@/pages/settings";
import Payment from "@/pages/payment";
import PaymentSuccess from "@/pages/payment-success";
import PartnerAccess from "@/pages/partner-access";
import PartnerDashboard from "@/pages/partner-dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/history" component={History} />
      <Route path="/stats" component={Stats} />
      <Route path="/settings" component={Settings} />
      <Route path="/payment" component={Payment} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/partner" component={PartnerDashboard} />
      <Route path="/partner/:code" component={PartnerAccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    captureReferralFromUrl();
    const code = getRefCodeFromUrlParam();
    if (code) {
      trackPartnerReferralClick({ code }).catch(() => {
        // Best-effort analytics beacon — a failed click log must never block the page.
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <InstallBanner />
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
          <SupportButton />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
