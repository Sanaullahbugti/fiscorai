import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

const login = vi.fn();
const register = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    login,
    register,
    logout: vi.fn(),
    touch: vi.fn(),
    refreshSubscription: vi.fn(),
  }),
}));

import { SignInPage, SignUpPage } from "@/features/auth/AuthPages";

describe("AuthPages", () => {
  beforeEach(() => {
    login.mockReset();
    register.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("submits sign-in credentials", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    await user.clear(screen.getByLabelText(/^Email$/i));
    await user.type(screen.getByLabelText(/^Email$/i), "user@fiscor.ai");
    await user.clear(screen.getByLabelText(/^Password$/i));
    await user.type(screen.getByLabelText(/^Password$/i), "secret12");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith("user@fiscor.ai", "secret12");
  });

  it("blocks sign-up when passwords do not match", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/^Email$/i), "new@fiscor.ai");
    await user.type(screen.getByLabelText(/^Password$/i), "secret12");
    await user.type(screen.getByLabelText(/Confirm password/i), "other12");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/Passwords do not match/i)).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it("blocks sign-up when terms are not accepted", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/^Email$/i), "new@fiscor.ai");
    await user.type(screen.getByLabelText(/^Password$/i), "secret12");
    await user.type(screen.getByLabelText(/Confirm password/i), "secret12");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/Please accept the Terms of Service and Privacy Policy/i)).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });
});
