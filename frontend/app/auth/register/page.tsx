import { AppSidebar } from "@/components/app-sidebar";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="app-frame">
      <AppSidebar active="auth" />
      <section className="content-shell">
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
