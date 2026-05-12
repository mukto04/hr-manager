import { NotepadClient } from "@/modules/notepad/notepad-client";

export const metadata = {
  title: "Notepad | Business HR Manager",
  description: "Manage your quick notes and thoughts.",
};

export default function NotepadPage() {
  return (
    <main className="p-6">
      <NotepadClient />
    </main>
  );
}
