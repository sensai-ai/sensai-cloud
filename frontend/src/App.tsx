import { ThemeProvider } from "@/components/ui/theme-provider";
import MainRoutes from "./routes";
import { Toaster } from "sonner";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Toaster />
      <MainRoutes />
    </ThemeProvider>
  );
}

export default App;
