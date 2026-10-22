import { Notifications } from "@/terminal/screens/System";

// The alerts the shell already loads (layout.tsx), in the terminal concept's
// Alerts screen. Read state saves through the shell store.
export default function NotificationsPage() {
  return <Notifications />;
}
