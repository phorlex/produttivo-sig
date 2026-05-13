import "./globals.css";

export const metadata = {
  title: "SIG Checklist Operacional",
  description: "Checklists operacionais personalizaveis da Sig Multimarcas"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
