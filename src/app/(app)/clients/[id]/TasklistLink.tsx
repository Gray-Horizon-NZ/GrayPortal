"use client";
import GoogleTasklistPicker from "@/components/ui/GoogleTasklistPicker";
import { listGoogleTasklistsAction, createGoogleTasklistAction, linkClientTasklistAction } from "../actions";

export default function TasklistLink({ clientId, currentTasklistId }: { clientId: string; currentTasklistId: string | null }) {
  return (
    <GoogleTasklistPicker
      currentTasklistId={currentTasklistId}
      listAction={listGoogleTasklistsAction}
      createAction={createGoogleTasklistAction}
      onLink={(tasklistId) => linkClientTasklistAction(clientId, tasklistId)}
    />
  );
}
