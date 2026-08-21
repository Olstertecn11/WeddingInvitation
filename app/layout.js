import "./globals.css";

const siteUrl = "https://www.oliveranalucia.love";
const title = "Oliver & Analucía | Nuestra boda";
const description =
  "Acompáñanos a celebrar nuestra boda el 13 de diciembre de 2026 en Antigua Guatemala.";
const previewImage = "/images/link-preview.jpg";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Oliver & Analucía",
    locale: "es_GT",
    type: "website",
    images: [
      {
        url: previewImage,
        width: 1200,
        height: 630,
        alt: "Oliver y Analucía celebrando su compromiso.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [previewImage],
  },
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
