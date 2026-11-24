"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/empty-state";
import { useKitchen } from "@/hooks/use-kitchen";
import { useAccount } from "./account-provider";

const SYNC_LABEL = { idle: "Starting…", syncing: "Saving…", saved: "All changes saved", offline: "Offline. Changes will save when you reconnect." };

export function AccountPage() {
  const account = useAccount();
  const { data } = useKitchen();
  const router = useRouter();
  const [unsaved, setUnsaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [nameNote, setNameNote] = useState<string | null>(null);

  useEffect(() => {
    if (account.configured && account.status === "guest") router.replace("/login?next=/account");
  }, [account.configured, account.status, router]);

  if (!account.configured) {
    return (
      <div className="container-page pt-8 sm:pt-12">
        <PageHeader eyebrow="Account" title="Accounts aren't connected yet" description="Everything still works as a guest, saved in this browser." />
        <Link href="/my-fridge" className={buttonClass("primary", "md", "mt-6")}>Open My Fridge</Link>
      </div>
    );
  }
  if (account.status !== "signed-in") return <div className="container-page pt-12"><Skeleton className="h-64" /></div>;

  const signOut = async (force = false) => {
    setBusy(true);
    const ok = await account.signOut(force);
    if (!ok) setUnsaved(true);
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    setError(null);
    if (!(await account.deleteAccount())) setError("Couldn't delete your account. Nothing was removed. Please try again.");
    setBusy(false);
  };

  return (
    <div className="container-page max-w-3xl pt-8 sm:pt-12">
      <PageHeader eyebrow="Account" title={account.name ?? "Your account"} description={account.email ?? undefined} />
      <form
        className="mt-6 flex items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await account.updateName(nameDraft ?? account.name ?? "");
          setNameNote(ok ? "Name saved" : "Couldn't save your name. Please try again.");
          if (ok) setNameDraft(null);
        }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="account-name" className="label">Your name</label>
          <input id="account-name" className="field" maxLength={80} autoComplete="given-name" value={nameDraft ?? account.name ?? ""} onChange={(e) => { setNameDraft(e.target.value); setNameNote(null); }} />
        </div>
        <button type="submit" disabled={nameDraft === null} className={buttonClass("secondary", "md")}>Save</button>
      </form>
      {nameNote && <p role="status" className="mt-2 text-sm text-muted">{nameNote}</p>}
      <dl className="mt-4 divide-y divide-line border-b border-line">
        <div className="flex justify-between gap-4 py-4"><dt className="text-muted">Sync</dt><dd role="status" className="text-right font-medium">{SYNC_LABEL[account.sync]}</dd></div>
        <div className="flex justify-between py-4"><dt className="text-muted">Ingredients</dt><dd className="tabular-nums">{data.inventory.length}</dd></div>
        <div className="flex justify-between py-4"><dt className="text-muted">Saved recipes</dt><dd className="tabular-nums">{data.favorites.length}</dd></div>
        <div className="flex justify-between py-4"><dt className="text-muted">Planned meals</dt><dd className="tabular-nums">{data.mealPlan.length}</dd></div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/preferences" className={buttonClass("secondary", "md")}>Appearance &amp; preferences</Link>
        <button type="button" disabled={busy} onClick={() => void signOut()} className={buttonClass("secondary", "md")}>Sign out</button>
      </div>
      {unsaved && (
        <div role="alert" className="mt-4 rounded-[0.625rem] bg-orange-soft px-4 py-3 text-sm text-orange-ink">
          Some changes haven&apos;t reached your account yet. They&apos;ll stay on this device if you sign out now.{" "}
          <button type="button" onClick={() => void signOut(true)} className="font-medium underline">Sign out anyway</button>
        </div>
      )}
      <section aria-labelledby="danger" className="mt-12 border-t border-line pt-6">
        <h2 id="danger" className="font-display text-[1.375rem]">Delete account</h2>
        <p className="mt-1 text-sm text-muted">Permanently removes your account and its cloud data.</p>
        <button type="button" onClick={() => setConfirmDelete(true)} className={buttonClass("danger", "md", "mt-4")}>Delete my account</button>
      </section>
      <Dialog
        open={confirmDelete}
        onClose={() => { setConfirmDelete(false); setTyped(""); }}
        title="Delete your account?"
        description="This can't be undone."
        footer={
          <>
            <button type="button" className={buttonClass("ghost", "md")} onClick={() => { setConfirmDelete(false); setTyped(""); }}>Cancel</button>
            <button type="button" disabled={typed !== "DELETE" || busy} onClick={() => void remove()} className={buttonClass("primary", "md", "bg-coral-ink hover:bg-coral-ink/90")}>Delete forever</button>
          </>
        }
      >
        <label htmlFor="delete-confirm" className="label">Type DELETE to confirm</label>
        <input id="delete-confirm" className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        {error && <p role="alert" className="mt-2 text-sm text-coral-ink">{error}</p>}
      </Dialog>
    </div>
  );
}
