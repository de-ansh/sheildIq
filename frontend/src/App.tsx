import { ThemeProvider } from "./components/theme-provider";
import { AppContextProvider, useApp } from "./lib/AppContext";
import { Navbar } from "./components/Navbar";
import { LoginView } from "./screens/LoginView";
import { OnboardingView } from "./screens/OnboardingView";
import { DashboardView } from "./screens/DashboardView";
import { LifeCalculatorView } from "./screens/LifeCalculatorView";
import { HealthPlannerView } from "./screens/HealthPlannerView";
import { CoverageAnalysisView } from "./screens/CoverageAnalysisView";
import { ComparisonView } from "./screens/ComparisonView";
import { RiskSimulatorView } from "./screens/RiskSimulatorView";
import { PolicyDeepDiveView } from "./screens/PolicyDeepDiveView";

function MainContent() {
  const { currentScreen } = useApp();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {currentScreen !== "login" && <Navbar />}

      <main className="flex-1">
        {currentScreen === "login" && <LoginView />}
        {currentScreen === "onboarding" && <OnboardingView />}
        {currentScreen === "dashboard" && <DashboardView />}
        {currentScreen === "analysis" && <CoverageAnalysisView />}
        {currentScreen === "comparison" && <ComparisonView />}
        {currentScreen === "simulator" && <RiskSimulatorView />}
        {currentScreen === "calculator" && <LifeCalculatorView />}
        {currentScreen === "healthplanner" && <HealthPlannerView />}
        {currentScreen === "deepdive" && <PolicyDeepDiveView />}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="shield-iq-theme">
      <AppContextProvider>
        <MainContent />
      </AppContextProvider>
    </ThemeProvider>
  );
}

export default App;
