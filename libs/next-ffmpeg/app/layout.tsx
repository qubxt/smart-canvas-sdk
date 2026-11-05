export const metadata = {
  title: "FFmpeg Conversion Service",
  description: "Video conversion microservice",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
