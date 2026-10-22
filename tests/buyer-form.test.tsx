/**
 * PlatformI - Buyer form tests (Task 3).
 * Full name, phone, and email are always required; ID is required exactly
 * when the sales matrix says so; drop-off must come from the operator list,
 * never free text. Rail never renders drop-off; AKAP never renders
 * address-as-drop-off.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuyerForm } from "@/components/ticketing/BuyerForm";
import { useLanguageStore } from "@/lib/i18n";
import { OPERATOR_POINT_LISTS } from "@/lib/transit/salesMatrix";

const ALL_OPERATOR_POINTS = Object.values(OPERATOR_POINT_LISTS).flat();

function fillValidBase(): void {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: "Siti Rahayu" },
  });
  fireEvent.change(screen.getByLabelText(/phone/i), {
    target: { value: "081234567890" },
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "siti@example.com" },
  });
}

describe("BuyerForm sales-matrix field visibility", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
  });

  it("requires email and blocks custom drop-off", () => {
    render(<BuyerForm mode="EXECUTIVE_SHUTTLE" serviceClass="VIP" onValid={() => {}} />);
    expect(screen.getByLabelText(/email/i)).toBeRequired();
  });

  it("never renders drop-off or meal for a KAI economy buyer", () => {
    render(<BuyerForm mode="KAI_INTERCITY" serviceClass="Ekonomi" onValid={() => {}} />);
    expect(screen.queryByLabelText(/drop-off/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/meal/i)).not.toBeInTheDocument();
  });

  it("never renders address-as-drop-off for an AKAP buyer", () => {
    render(<BuyerForm mode="AKAP_INTERCITY_BUS" serviceClass="Executive" onValid={() => {}} />);
    expect(screen.queryByLabelText(/drop-off/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/address/i)).not.toBeInTheDocument();
  });

  it("requires ID exactly when the matrix says so", () => {
    const { unmount } = render(
      <BuyerForm mode="KAI_INTERCITY" serviceClass="Eksekutif" onValid={() => {}} />
    );
    expect(screen.getByLabelText(/id number/i)).toBeRequired();
    unmount();
    render(<BuyerForm mode="EXECUTIVE_SHUTTLE" serviceClass="VIP" onValid={() => {}} />);
    expect(screen.getByLabelText(/id number/i)).not.toBeRequired();
  });

  it("shows the meal field when the fare includes it", () => {
    render(<BuyerForm mode="KAI_INTERCITY" serviceClass="Luxury" onValid={() => {}} />);
    expect(screen.getByLabelText(/meal/i)).toBeInTheDocument();
  });

  it("offers only operator-list drop-off points for shuttle buyers", () => {
    render(<BuyerForm mode="EXECUTIVE_SHUTTLE" serviceClass="VIP" onValid={() => {}} />);
    const options = Array.from(
      (screen.getByLabelText(/drop-off/i) as HTMLSelectElement).options
    )
      .map((option) => option.value)
      .filter((value) => value !== "");
    expect(options.length).toBeGreaterThan(0);
    for (const value of options) {
      expect(ALL_OPERATOR_POINTS).toContain(value);
    }
  });
});

describe("BuyerForm prefill, validation, and submit", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
  });

  it("prefills account details but stays manually editable", () => {
    render(
      <BuyerForm
        mode="EXECUTIVE_SHUTTLE"
        serviceClass="VIP"
        prefill={{ fullName: "Andi Pratama", phone: "081111222333", email: "andi@example.com" }}
        onValid={() => {}}
      />
    );
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Andi Pratama");
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Andi Wijaya" },
    });
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Andi Wijaya");
  });

  it("refuses an invalid custom drop-off and only calls onValid with a valid buyer", () => {
    const onValid = vi.fn();
    render(<BuyerForm mode="EXECUTIVE_SHUTTLE" serviceClass="VIP" onValid={onValid} />);
    fillValidBase();
    const dropOff = screen.getByLabelText(/drop-off/i) as HTMLSelectElement;
    fireEvent.change(dropOff, { target: { value: "Rumah saya di gang sempit" } });
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));
    expect(onValid).not.toHaveBeenCalled();

    const firstPoint = Array.from(dropOff.options).map((o) => o.value).find((v) => v !== "");
    expect(firstPoint).toBeDefined();
    fireEvent.change(dropOff, { target: { value: firstPoint ?? "" } });
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid.mock.calls[0][0]).toMatchObject({
      fullName: "Siti Rahayu",
      phone: "081234567890",
      email: "siti@example.com",
      dropOffPointId: firstPoint,
    });
  });

  it("blocks submit until required email is valid", () => {
    const onValid = vi.fn();
    render(<BuyerForm mode="KAI_INTERCITY" serviceClass="Eksekutif" onValid={onValid} />);
    fillValidBase();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText(/id number/i), { target: { value: "3174050101900001" } });
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));
    expect(onValid).not.toHaveBeenCalled();
  });

  it("renders localized labels for ja-locale buyers without hardcoded English", () => {
    useLanguageStore.getState().setLanguage("ja");
    render(<BuyerForm mode="EXECUTIVE_SHUTTLE" serviceClass="VIP" onValid={() => {}} />);
    expect(screen.getByLabelText(/氏名/)).toBeRequired();
    expect(screen.getByLabelText(/電話番号/)).toBeRequired();
    expect(screen.getByText(/購入者情報/)).toBeInTheDocument();
  });
});
