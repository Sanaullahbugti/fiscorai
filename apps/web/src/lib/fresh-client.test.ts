import { afterEach, describe, expect, it, vi } from "vitest";
import { applyFreshClientBuild, clearBrowserCookies } from "./fresh-client";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("applyFreshClientBuild", () => {
  it("records the build id on a clean first visit without reloading", () => {
    const reloading = applyFreshClientBuild();
    expect(reloading).toBe(false);
    expect(localStorage.getItem("fiscor.buildId")).toBeTruthy();
  });

  it("clears stored auth when the build id changes", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    localStorage.setItem("fiscor.buildId", "old-build");
    localStorage.setItem("fiscor.accessToken", "stale");
    localStorage.setItem("fiscor.user", "{}");
    const reloading = applyFreshClientBuild();
    expect(reloading).toBe(true);
    expect(localStorage.getItem("fiscor.accessToken")).toBeNull();
    expect(localStorage.getItem("fiscor.user")).toBeNull();
    expect(localStorage.getItem("fiscor.buildId")).not.toBe("old-build");
    expect(reload).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("clears a pre-build-id session so existing users get a fresh login", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    localStorage.setItem("fiscor.accessToken", "legacy");
    const reloading = applyFreshClientBuild();
    expect(reloading).toBe(true);
    expect(localStorage.getItem("fiscor.accessToken")).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});

describe("clearBrowserCookies", () => {
  it("expires visible cookies", () => {
    document.cookie = "demo=1;path=/";
    clearBrowserCookies();
    expect(document.cookie.includes("demo=")).toBe(false);
  });
});
