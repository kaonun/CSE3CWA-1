import { cookies } from "next/headers";
import "./globals.css";
import Header from "@/components/layout/Header";
import NavBar from "@/components/layout/NavBar";
import Footer from "@/components/layout/Footer";
import ActivityPageTracker from "@/components/observability/ActivityPageTracker";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

export const metadata = {
  title: "Phoneme'le",
  description: "A builder for phoneme-based classroom activities.",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html lang="en" data-theme={theme}>
      <body>
        <ActivityPageTracker />
        <Header />
        <NavBar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
