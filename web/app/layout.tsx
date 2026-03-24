import "./globals.css";

export const metadata = {
  title: "Scalar IST - 同意管理",
  description: "Scalar IST 簡易同意管理アプリケーション",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
