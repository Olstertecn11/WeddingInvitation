import "./globals.css";

export const metadata = {
  title: "Oliver & Analucía | Nuestra boda",
  description:
    "Invitación a la boda de Oliver José Tzunún Dávila y Analucía Arelis Mendez Moraga.",
};

export const viewport = {
  themeColor: "#a45d45",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
