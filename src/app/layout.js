import "./globals.css";
import Header from "@/components/layout/Header";
import NavBar from "@/components/layout/NavBar";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Phoneme'le",
  description: "A builder for phoneme-based classroom activities.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <NavBar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
