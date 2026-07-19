export default function ImmersiveLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="h-dvh w-full overflow-hidden">{children}</main>;
}
