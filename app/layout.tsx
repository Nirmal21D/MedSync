// import type React from "react"
// import type { Metadata } from "next"
// import { Inter } from "next/font/google"
// import "./globals.css"
// import { AuthProvider } from "@/components/providers/auth-provider"
// import { Toaster } from "@/components/ui/toaster"
// import { ThemeProvider } from "@/components/theme-provider"

// const inter = Inter({ subsets: ["latin"] })

// export const metadata: Metadata = {
//   title: "MedSync - Healthcare ERP System",
//   description: "Complete healthcare management system for hospitals",
//     generator: 'v0.dev'
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <body className={inter.className + " min-h-screen"}>
//         <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
//           <AuthProvider>
//             {children}
//             <Toaster />
//           </AuthProvider>
//         </ThemeProvider>
//       </body>
//     </html>
//   )
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="en">
//       <body>{children}</body>
//     </html>
//   );
// }

import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
