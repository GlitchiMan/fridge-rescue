"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- a full reload restarts auth and storage cleanly */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { kitchenStore } from "@/hooks/use-kitchen";
import { guestFingerprint, hasKitchenData, mergeGuestIntoAccount } from "@/lib/account/merge";
import type { KitchenSync, SyncMeta, SyncMetaStorage, SyncStatus } from "@/lib/account/sync";
import { LocalStorageRepository } from "@/lib/storage/repository";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { parseAppearance } from "@/lib/theme/appearance";
import { appearanceStore } from "@/lib/theme/store";
import type { StorageSchema } from "@/types";

interface AccountApi {
  configured: boolean;
  status: "loading" | "guest" | "signed-in";
  email: string | null;
  name: string | null;
  sync: SyncStatus;
  /** Returns false if unsaved changes couldn't reach the cloud (retry with force). */
  signOut: (force?: boolean) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  updateName: (name: string) => Promise<boolean>;
}

const AccountContext = createContext<AccountApi | null>(null);
const DISMISS_KEY = "fridge-rescue:guest-merge-dismissed";
const IMPORTED_KEY = "fridge-rescue:guest-imported";

function metaStorage(key: string): SyncMetaStorage {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as SyncMeta) : null;
      } catch {
        return null;
      }
    },
    save(meta) {
      try {
        localStorage.setItem(key, JSON.stringify(meta));
      } catch {
        /* storage full or blocked */
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

const hasSessionCookie = () => /(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie);

export function AccountProvider({ children }: { children: ReactNode }) {
  const configured = Boolean(getSupabaseConfig());
  const toast = useToast();
  const [status, setStatus] = useState<AccountApi["status"]>(configured ? "loading" : "guest");
  const [user, setUser] = useState<{ id: string; email: string | null; name: string | null } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [guest, setGuest] = useState<StorageSchema | null>(null);
  const [merging, setMerging] = useState(false);
  const syncRef = useRef<KitchenSync | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const leaveAccount = useCallback((userId: string, clearCache: boolean) => {
    syncRef.current?.stop();
    syncRef.current = null;
    cleanupRef.current?.();
    if (clearCache) {
      new LocalStorageRepository(`fridge-rescue:account:${userId}`).clear();
      metaStorage(`fridge-rescue:account:${userId}:sync`).clear();
    }
    kitchenStore.useRepository(new LocalStorageRepository());
  }, []);

  useEffect(() => {
    if (!configured) return;
    let alive = true;
    let unsubscribeAuth: (() => void) | undefined;

    (async () => {
      // Guests never download the auth code.
      if (!hasSessionCookie()) {
        setStatus("guest");
        return;
      }
      const [{ getBrowserSupabase, createCloudKitchen }, { KitchenSync }] = await Promise.all([import("@/lib/supabase/browser"), import("@/lib/account/sync")]);
      const supabase = getBrowserSupabase();
      if (!supabase) return setStatus("guest");
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;
      if (error || !data.user) return setStatus("guest");
      const u = data.user;
      const meta = u.user_metadata as { full_name?: string; name?: string };
      setUser({ id: u.id, email: u.email ?? null, name: meta.full_name ?? meta.name ?? null });

      const deviceConsent = kitchenStore.data.consent;
      const guestState = new LocalStorageRepository().load()?.state ?? null;
      kitchenStore.useRepository(new LocalStorageRepository(`fridge-rescue:account:${u.id}`));
      if (deviceConsent.decided) kitchenStore.replaceAll({ ...kitchenStore.data, consent: deviceConsent });

      const sync = new KitchenSync(createCloudKitchen(supabase, u.id), kitchenStore, metaStorage(`fridge-rescue:account:${u.id}:sync`), setSyncStatus);
      syncRef.current = sync;
      const retry = () => void sync.flush();
      const onHide = () => {
        if (document.visibilityState === "hidden") void sync.flush();
      };
      window.addEventListener("online", retry);
      document.addEventListener("visibilitychange", onHide);
      cleanupRef.current = () => {
        window.removeEventListener("online", retry);
        document.removeEventListener("visibilitychange", onHide);
      };
      setStatus("signed-in");

      const ok = await sync.start();
      const imported = localStorage.getItem(`${IMPORTED_KEY}:${u.id}`);
      if (alive && ok && guestState && hasKitchenData(guestState) && imported !== guestFingerprint(guestState) && sessionStorage.getItem(DISMISS_KEY) !== u.id) setGuest(guestState);

      // Name and appearance follow the account across devices.
      const { data: profile } = await supabase.from("profiles").select("display_name, appearance").eq("id", u.id).maybeSingle();
      if (!alive) return;
      if (profile?.display_name) setUser((x) => (x ? { ...x, name: profile.display_name as string } : x));
      const savedLook = parseAppearance(profile?.appearance);
      const saveLook = () => supabase.from("profiles").update({ appearance: appearanceStore.get() }).eq("id", u.id).then(() => undefined);
      if (savedLook) appearanceStore.set(savedLook);
      else if (profile) void saveLook();
      let lookTimer: ReturnType<typeof setTimeout> | undefined;
      const offLook = appearanceStore.subscribe(() => {
        clearTimeout(lookTimer);
        lookTimer = setTimeout(() => void saveLook(), 500);
      });
      const baseCleanup = cleanupRef.current;
      cleanupRef.current = () => {
        baseCleanup?.();
        offLook();
        clearTimeout(lookTimer);
      };

      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          leaveAccount(u.id, true);
          window.location.href = "/";
        }
      });
      unsubscribeAuth = () => listener.subscription.unsubscribe();
    })().catch(() => alive && setStatus("guest"));

    return () => {
      alive = false;
      unsubscribeAuth?.();
    };
  }, [configured, leaveAccount]);

  const signOut = useCallback(
    async (force = false) => {
      const sync = syncRef.current;
      const saved = sync ? await sync.flush() : true;
      if (!saved && !force) return false;
      const { getBrowserSupabase } = await import("@/lib/supabase/browser");
      if (user) leaveAccount(user.id, saved);
      await getBrowserSupabase()?.auth.signOut({ scope: "local" });
      window.location.href = "/";
      return true;
    },
    [user, leaveAccount],
  );

  const deleteAccount = useCallback(async () => {
    const { getBrowserSupabase } = await import("@/lib/supabase/browser");
    const supabase = getBrowserSupabase();
    if (!supabase || !user) return false;
    syncRef.current?.stop();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      void syncRef.current?.start();
      return false;
    }
    leaveAccount(user.id, true);
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/";
    return true;
  }, [user, leaveAccount]);

  const updateName = useCallback(
    async (name: string) => {
      const { getBrowserSupabase } = await import("@/lib/supabase/browser");
      const supabase = getBrowserSupabase();
      if (!supabase || !user) return false;
      const clean = name.trim().slice(0, 80) || null;
      const { error } = await supabase.from("profiles").update({ display_name: clean }).eq("id", user.id);
      if (error) return false;
      setUser((x) => (x ? { ...x, name: clean } : x));
      return true;
    },
    [user],
  );

  const moveGuestData = async () => {
    if (!guest || !syncRef.current) return;
    setMerging(true);
    kitchenStore.replaceAll(mergeGuestIntoAccount(guest, kitchenStore.data));
    const saved = await syncRef.current.flush();
    setMerging(false);
    if (saved) {
      // The guest copy is kept on this device; remember it so we don't ask again.
      localStorage.setItem(`${IMPORTED_KEY}:${user!.id}`, guestFingerprint(guest));
      setGuest(null);
      toast.show("Your kitchen is now saved to your account");
    } else {
      toast.show("Couldn't reach your account. Your guest data is still safe on this device.", { tone: "info" });
    }
  };

  const api = useMemo<AccountApi>(
    () => ({ configured, status, email: user?.email ?? null, name: user?.name ?? null, sync: syncStatus, signOut, deleteAccount, updateName }),
    [configured, status, user, syncStatus, signOut, deleteAccount, updateName],
  );

  return (
    <AccountContext.Provider value={api}>
      {children}
      <Dialog
        open={Boolean(guest)}
        onClose={() => {
          if (user) sessionStorage.setItem(DISMISS_KEY, user.id);
          setGuest(null);
        }}
        title="Bring your kitchen with you?"
        description="We found data saved on this device before you signed in."
        footer={
          <>
            <button
              type="button"
              className={buttonClass("ghost", "md")}
              onClick={() => {
                if (user) sessionStorage.setItem(DISMISS_KEY, user.id);
                setGuest(null);
              }}
            >
              Not now
            </button>
            <button type="button" disabled={merging} className={buttonClass("primary", "md")} onClick={() => void moveGuestData()}>
              {merging ? "Saving…" : "Add to my account"}
            </button>
          </>
        }
      >
        {guest && (
          <ul className="divide-y divide-line border-y border-line text-sm">
            {[
              ["Ingredients", guest.inventory.length],
              ["Saved recipes", guest.favorites.length],
              ["Shopping items", guest.shoppingList.length],
              ["Planned meals", guest.mealPlan.length],
              ["Cooked meals", guest.history.length],
            ].map(([label, n]) => (
              <li key={label} className="flex justify-between py-2">
                <span>{label}</span>
                <span className="tabular-nums text-muted">{n}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">Only continue if this is your data. Nothing in your account is removed, amounts are never added together, and this device keeps its copy.</p>
      </Dialog>
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountApi {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within <AccountProvider>");
  return ctx;
}
