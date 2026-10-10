"use client";

import { useEffect, useRef, useState } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { BatchSelector } from "@/components/batch-selector";
import { Icon, type IconName } from "@/components/ui/icon";
import { AuthScreen } from "@/features/auth/auth-screen";
import { BatchesPage } from "@/features/batches/batches-page";
import { BuyersPage } from "@/features/buyers/buyers-page";
import { ExpensesPage } from "@/features/expenses/expenses-page";
import { FeedPage } from "@/features/feed/feed-page";
import { PigsPage } from "@/features/pigs/pigs-page";
import { ReportsPage } from "@/features/reports/reports-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { SalesPage } from "@/features/sales/sales-page";
import { useAuth } from "@/hooks/use-auth";
import { usePiggyTrack } from "@/hooks/use-piggy-track";

type PageName =
  | "Dashboard"
  | "Batches"
  | "Pigs"
  | "Expenses"
  | "Feed"
  | "Sales"
  | "Buyers"
  | "Reports"
  | "Settings";

const navigation: { label: PageName; icon: IconName; enabled: boolean }[] = [
  { label: "Dashboard", icon: "dashboard", enabled: true },
  { label: "Batches", icon: "batches", enabled: true },
  { label: "Pigs", icon: "pigs", enabled: true },
  { label: "Expenses", icon: "expenses", enabled: true },
  { label: "Feed", icon: "feed", enabled: true },
  { label: "Sales", icon: "sales", enabled: true },
  { label: "Buyers", icon: "buyers", enabled: true },
  { label: "Reports", icon: "reports", enabled: true },
  { label: "Settings", icon: "settings", enabled: true },
];

export function AppShell() {
  const auth = useAuth();
  const enabled = !auth.configured || Boolean(auth.user);
  const store = usePiggyTrack(enabled);
  const [page, setPage] = useState<PageName>("Dashboard");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const data = store.workspace?.data;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileMenuOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLButtonElement>(".sidebar-close")
      ?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
      if (event.key !== "Tab") return;
      const buttons =
        sidebarRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      menuTriggerRef.current?.focus({ preventScroll: true });
    };
  }, [mobileMenuOpen, isMobile]);

  useEffect(() => {
    if (!data?.batches.length) {
      setSelectedBatchId("");
      return;
    }
    if (!data.batches.some((batch) => batch.id === selectedBatchId))
      setSelectedBatchId(data.batches[0].id);
  }, [data, selectedBatchId]);

  function navigate(item: (typeof navigation)[number]) {
    if (item.enabled) {
      setPage(item.label);
      setNotice(null);
    } else setNotice(`${item.label} is planned for the next PiggyTrack milestone.`);
    setMobileMenuOpen(false);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  if (auth.loading) return <LoadingScreen label="Checking your workspace…" />;
  if (auth.configured && !auth.user)
    return <AuthScreen message={auth.message} onSignIn={auth.signIn} onSignUp={auth.signUp} />;
  if (store.loading && !store.workspace) return <LoadingScreen label="Loading farm records…" />;
  if (!store.workspace || !data)
    return (
      <ErrorScreen
        message={store.error ?? "PiggyTrack could not load your workspace."}
        onRetry={store.reload}
      />
    );

  const displayName = auth.user?.email?.split("@")[0] ?? "Demo User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const canEdit = store.workspace.farmRole === "Owner";
  const currentBatchId = selectedBatchId || data.batches[0]?.id || "";

  return (
    <div className="app-frame">
      <aside
        id="workspace-sidebar"
        ref={sidebarRef}
        inert={isMobile && !mobileMenuOpen}
        aria-hidden={isMobile && !mobileMenuOpen}
        aria-label="Workspace menu"
        className={`sidebar [@media(max-width:800px)]:transition-[transform,opacity] [@media(max-width:800px)]:duration-300 [@media(max-width:800px)]:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          mobileMenuOpen
            ? "[@media(max-width:800px)]:[transform:translate3d(0,0,0)] [@media(max-width:800px)]:opacity-100"
            : "[@media(max-width:800px)]:[transform:translate3d(-102%,0,0)] [@media(max-width:800px)]:opacity-0 [@media(max-width:800px)]:pointer-events-none"
        }`}
      >
        <div className="brand-row">
          <button
            className="brand brand-button"
            type="button"
            onClick={() => navigate(navigation[0])}
            aria-label="PiggyTrack home"
          >
            <span className="brand-mark">
              <Icon name="pigs" />
            </span>
            <span>
              <strong>PiggyTrack</strong>
              <small>{store.workspace.farmName}</small>
            </span>
          </button>
          {/* <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon name="close" />
          </button> */}
        </div>
        <nav aria-label="Main navigation">
          <p className="nav-kicker">Workspace</p>
          {navigation.map((item) => (
            <button
              className={`nav-item ${page === item.label ? "active" : ""}`}
              key={item.label}
              type="button"
              onClick={() => navigate(item)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {!item.enabled && <span className="soon-tag">Soon</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="help-icon">6</span>
          <div>
            <strong>Phase 6</strong>
            <p>Family access and farm settings are ready.</p>
          </div>
        </div>
        <div className="profile-card">
          <span className="avatar">{initials}</span>
          <span>
            <strong>{displayName}</strong>
            <small>{auth.configured ? "Family member" : "Local demo mode"}</small>
          </span>
          {auth.configured ? (
            <button className="signout-button" type="button" onClick={() => void auth.signOut()}>
              Sign out
            </button>
          ) : (
            <span className="demo-dot" title="Local demo mode" />
          )}
        </div>
      </aside>

      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={`fixed inset-0 z-90 border-0 bg-[rgba(23,31,28,0.42)] transition-[opacity,visibility] duration-300 ease-out min-[801px]:hidden motion-reduce:transition-none ${
          mobileMenuOpen ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <main className="main-content" id="top">
        <header className="mobile-header">
          <button className="brand brand-button" type="button" onClick={() => setPage("Dashboard")}>
            <span className="brand-mark">
              <Icon name="pigs" />
            </span>
            <strong>PiggyTrack</strong>
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="workspace-sidebar"
            onClick={(event) => {
              menuTriggerRef.current = event.currentTarget;
              setMobileMenuOpen((open) => !open);
            }}
          >
            {/* <MobileMenuIcon open={mobileMenuOpen} /> */}
            <Icon name="menu" />
          </button>
        </header>
        <div className="content-wrap">
          {notice && (
            <div className="phase-notice" role="status">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">
                <Icon name="close" />
              </button>
            </div>
          )}
          {store.error && (
            <div className="error-banner" role="alert">
              <span>{store.error}</span>
              <button type="button" onClick={() => void store.reload()}>
                Try again
              </button>
            </div>
          )}

          {!canEdit && (
            <div className="phase-notice" role="status">
              Viewer access: you can view this farm’s records and reports. Only Owners can make
              changes.
            </div>
          )}
          {page === "Dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Farm overview</p>
                  <h1>Good morning, {displayName}.</h1>
                  <p>Here’s how your current batch is doing.</p>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setPage("Expenses")}
                >
                  <Icon name={canEdit ? "plus" : "receipt"} />
                  {canEdit ? "Add expense" : "View expenses"}
                </button>
              </div>
              {data.batches.length > 0 ? (
                <>
                  <BatchSelector
                    batches={data.batches}
                    selectedBatchId={currentBatchId}
                    onChange={setSelectedBatchId}
                  />
                  <Dashboard
                    data={data}
                    selectedBatchId={currentBatchId}
                    onOpenExpenses={() => setPage("Expenses")}
                    onOpenFeed={() => setPage("Feed")}
                    onOpenSales={() => setPage("Sales")}
                  />
                </>
              ) : (
                <div className="inline-empty dashboard-empty">
                  <Icon name="batches" />
                  <h2>{canEdit ? "Create your first batch" : "No batches yet"}</h2>
                  <p>A batch is the starting point for pigs, expenses, and sales.</p>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setPage("Batches")}
                  >
                    <Icon name="plus" />
                    {canEdit ? "Create batch" : "View batches"}
                  </button>
                </div>
              )}
            </>
          )}
          {page === "Batches" && (
            <BatchesPage
              canEdit={canEdit}
              data={data}
              saving={store.saving}
              onSave={store.saveBatch}
              onDelete={store.deleteBatch}
            />
          )}
          {page === "Pigs" && currentBatchId && (
            <PigsPage
              canEdit={canEdit}
              data={data}
              selectedBatchId={currentBatchId}
              onBatchChange={setSelectedBatchId}
              saving={store.saving}
              onSave={store.savePig}
              onDelete={store.deletePig}
            />
          )}
          {page === "Expenses" && currentBatchId && (
            <ExpensesPage
              canEdit={canEdit}
              data={data}
              selectedBatchId={currentBatchId}
              onBatchChange={setSelectedBatchId}
              saving={store.saving}
              onSave={store.saveExpense}
              onDelete={store.deleteExpense}
              onReconcile={store.reconcilePigPurchases}
            />
          )}
          {page === "Feed" && currentBatchId && (
            <FeedPage
              canEdit={canEdit}
              data={data}
              selectedBatchId={currentBatchId}
              onBatchChange={setSelectedBatchId}
              saving={store.saving}
              onSave={store.saveExpense}
              onDelete={store.deleteExpense}
            />
          )}
          {page === "Sales" && currentBatchId && (
            <SalesPage
              canEdit={canEdit}
              data={data}
              selectedBatchId={currentBatchId}
              onBatchChange={setSelectedBatchId}
              saving={store.saving}
              onSaveSale={store.saveSale}
              onDeleteSale={store.deleteSale}
              onSavePayment={store.savePayment}
              onDeletePayment={store.deletePayment}
              onOpenBuyers={() => setPage("Buyers")}
            />
          )}
          {page === "Buyers" && (
            <BuyersPage
              canEdit={canEdit}
              data={data}
              saving={store.saving}
              onSave={store.saveBuyer}
              onDelete={store.deleteBuyer}
            />
          )}
          {page === "Reports" && currentBatchId && (
            <ReportsPage
              data={data}
              selectedBatchId={currentBatchId}
              onBatchChange={setSelectedBatchId}
            />
          )}
          {page === "Settings" && (
            <SettingsPage
              workspace={store.workspace}
              cloudEnabled={auth.configured}
              saving={store.saving}
              onSwitchFarm={store.switchFarm}
              onRenameFarm={store.renameFarm}
              onCreateInvitation={store.createFarmInvitation}
              onAcceptInvitation={store.acceptFarmInvitation}
              onRemoveMember={store.removeFarmMember}
            />
          )}
          {(page === "Pigs" ||
            page === "Expenses" ||
            page === "Feed" ||
            page === "Sales" ||
            page === "Reports") &&
            !currentBatchId && (
              <div className="inline-empty dashboard-empty">
                <Icon name="batches" />
                <h2>Create a batch first</h2>
                <p>Pigs, expenses, feed, sales, and reports must belong to a batch.</p>
                <button className="primary-button" type="button" onClick={() => setPage("Batches")}>
                  Go to batches
                </button>
              </div>
            )}
          <p className="mock-note">
            {auth.configured
              ? "Secure shared workspace · Data protected by Supabase Row Level Security."
              : "Local demo workspace · Add Supabase environment variables to enable shared cloud data."}
          </p>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => (
          <button
            key={item.label}
            type="button"
            className={page === item.label ? "active" : ""}
            onClick={() => navigate(item)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="workspace-sidebar"
          onClick={(event) => {
            menuTriggerRef.current = event.currentTarget;
            setMobileMenuOpen((open) => !open);
          }}
        >
          <MobileMenuIcon open={mobileMenuOpen} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

function MobileMenuIcon({ open }: { open: boolean }) {
  const lineClass =
    "absolute left-0 h-0.5 w-5 rounded-full bg-current transition-[translate,rotate,scale,opacity] duration-300 ease-in-out motion-reduce:transition-none";
  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <span className={`${lineClass} top-[3px] ${open ? "translate-y-[6px] rotate-45" : ""}`} />
      <span className={`${lineClass} top-[9px] ${open ? "scale-x-0 opacity-0" : ""}`} />
      <span className={`${lineClass} top-[15px] ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
    </span>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="state-page">
      <div className="loading-mark">
        <Icon name="pigs" />
      </div>
      <h1>{label}</h1>
      <div className="loading-line" />
    </main>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return (
    <main className="state-page">
      <div className="state-icon">!</div>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <button className="primary-button" type="button" onClick={() => void onRetry()}>
        Try again
      </button>
    </main>
  );
}
