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
import { AffordabilityAnalysisView } from "./screens/AffordabilityAnalysisView";
import { DependencyModelingView } from "./screens/DependencyModelingView";
import { SavedPlansView } from "./screens/SavedPlansView";
import { SettingsView } from "./screens/SettingsView";
import { ComplianceView } from "./screens/ComplianceView";
import { SystemStatesView } from "./screens/SystemStatesView";
import { PolicyAnalyzerView } from "./screens/PolicyAnalyzerView";
import { AskShieldIQ } from "./components/AskShieldIQ";

function MainContent() {
  const { currentScreen, user, aiProvider } = useApp();

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
        {currentScreen === "affordability" && <AffordabilityAnalysisView />}
        {currentScreen === "dependencies" && <DependencyModelingView />}
        {currentScreen === "savedplans" && <SavedPlansView />}
        {currentScreen === "settings" && <SettingsView />}
        {currentScreen === "compliance" && <ComplianceView />}
        {currentScreen === "systemstates" && <SystemStatesView />}
        {currentScreen === "policyscan" && <PolicyAnalyzerView />}
      </main>

      {/* Keyed by user so one account never sees another's conversation */}
      {aiProvider && user.isLoggedIn && user.onboardingCompleted && currentScreen !== "onboarding" && <AskShieldIQ key={user.email} />}
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
