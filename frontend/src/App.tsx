import { lazy, Suspense } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { AppContextProvider, useApp } from "./lib/AppContext";
import { Navbar } from "./components/Navbar";
import { LoginView } from "./screens/LoginView";
import { AskShieldIQ } from "./components/AskShieldIQ";
import { ScreenErrorBoundary } from "./components/ScreenErrorBoundary";
import { LanguageProvider, useI18n } from "./lib/i18n";

// Each screen downloads the first time it is opened; only the login screen ships in the first bundle.
const screen = <K extends string>(name: K, load: () => Promise<Record<K, React.ComponentType>>) =>
  lazy(() => load().then(m => ({ default: m[name] })));
const OnboardingView = screen("OnboardingView", () => import("./screens/OnboardingView"));
const DashboardView = screen("DashboardView", () => import("./screens/DashboardView"));
const LifeCalculatorView = screen("LifeCalculatorView", () => import("./screens/LifeCalculatorView"));
const HealthPlannerView = screen("HealthPlannerView", () => import("./screens/HealthPlannerView"));
const CoverageAnalysisView = screen("CoverageAnalysisView", () => import("./screens/CoverageAnalysisView"));
const ComparisonView = screen("ComparisonView", () => import("./screens/ComparisonView"));
const RiskSimulatorView = screen("RiskSimulatorView", () => import("./screens/RiskSimulatorView"));
const PolicyDeepDiveView = screen("PolicyDeepDiveView", () => import("./screens/PolicyDeepDiveView"));
const AffordabilityAnalysisView = screen("AffordabilityAnalysisView", () => import("./screens/AffordabilityAnalysisView"));
const DependencyModelingView = screen("DependencyModelingView", () => import("./screens/DependencyModelingView"));
const SavedPlansView = screen("SavedPlansView", () => import("./screens/SavedPlansView"));
const SettingsView = screen("SettingsView", () => import("./screens/SettingsView"));
const ComplianceView = screen("ComplianceView", () => import("./screens/ComplianceView"));
const SystemStatesView = screen("SystemStatesView", () => import("./screens/SystemStatesView"));
const PolicyAnalyzerView = screen("PolicyAnalyzerView", () => import("./screens/PolicyAnalyzerView"));

function MainContent() {
  const { currentScreen, setCurrentScreen, user, aiProvider } = useApp();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {currentScreen !== "login" && <Navbar />}

      <main className="flex-1">
        <ScreenErrorBoundary key={currentScreen} onHome={() => setCurrentScreen(user.isLoggedIn ? "dashboard" : "login")}>
        <Suspense fallback={<p role="status" className="px-6 py-24 text-center text-sm text-muted-foreground">{t("screen.loading")}</p>}>
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
        </Suspense>
        </ScreenErrorBoundary>
      </main>

      {/* Keyed by user so one account never sees another's conversation */}
      {aiProvider && user.isLoggedIn && user.onboardingCompleted && currentScreen !== "onboarding" && <AskShieldIQ key={user.email} />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="shield-iq-theme">
      <LanguageProvider>
        <AppContextProvider>
          <MainContent />
        </AppContextProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
