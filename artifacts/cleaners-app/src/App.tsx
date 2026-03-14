import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import ScheduleMap from "@/pages/ScheduleMap";
import Bookings from "@/pages/Bookings";
import Clients from "@/pages/Clients";
import Invoices from "@/pages/Invoices";
import Money from "@/pages/Money";
import Labor from "@/pages/Labor";
import Todos from "@/pages/Todos";
import Followups from "@/pages/Followups";
import Campaigns from "@/pages/Campaigns";
import Reports from "@/pages/Reports";
import Inventory from "@/pages/Inventory";
import PurchaseOrders from "@/pages/PurchaseOrders";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/employees" component={Employees} />
        <Route path="/scheduling" component={ScheduleMap} />
        <Route path="/map" component={ScheduleMap} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/clients" component={Clients} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/money" component={Money} />
        <Route path="/receipts" component={Money} />
        <Route path="/expenses" component={Money} />
        <Route path="/labor" component={Labor} />
        <Route path="/todos" component={Todos} />
        <Route path="/followups" component={Followups} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/reports" component={Reports} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/purchase-orders" component={PurchaseOrders} />
        <Route>
          <div className="text-center p-12">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-slate-500 mt-2">Page not found</p>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
