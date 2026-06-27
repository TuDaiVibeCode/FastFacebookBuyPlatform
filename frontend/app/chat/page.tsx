import { AppSidebar } from "@/components/app-sidebar";
import { ChatbotPanel } from "@/components/chatbot-panel";

export default function ChatPage() {
  return (
    <main className="app-frame">
      <AppSidebar active="chat" />
      <section className="content-shell chat-page">
        <ChatbotPanel />
      </section>
    </main>
  );
}
