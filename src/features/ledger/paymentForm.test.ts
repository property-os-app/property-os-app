import { describe, expect, it } from "vitest";
import { findPayment, isPaymentAnswer, isUnclearReply, paymentRequest, receiptCategory, receiptErrorField } from "@/features/ledger/paymentForm";
import type { LedgerEntry, PaymentCreateBody } from "@/types/ledger";

const body: PaymentCreateBody = { amount: 300, method: "CHECK", paymentDate: "2026-11-25", referenceNumber: "4471" };
const pdf = () => new File(["%PDF-1.4"], "check.pdf", { type: "application/pdf" });

describe("receiptCategory", () => {
  const options = [{ value: "CHECK_IMAGE", label: "Check" }, { value: "RECEIPT", label: "Receipt" }];
  it("Receipt until another is chosen; the API's default while the list isn't there", () => {
    expect(receiptCategory({ file: null, category: null }, options)).toBe("RECEIPT");
    expect(receiptCategory({ file: null, category: "CHECK_IMAGE" }, options)).toBe("CHECK_IMAGE");
    expect(receiptCategory({ file: null, category: null }, [])).toBe("");
  });
});

describe("paymentRequest", () => {
  it("JSON without a file, whatever the category", () => {
    expect(paymentRequest(body, null, "RECEIPT")).toEqual({ body });
  });

  it("multipart with a file: data as text with the category inside, and the file", () => {
    const req = paymentRequest(body, pdf(), "CHECK_IMAGE");
    if (!("form" in req)) throw new Error("expected a form");
    expect([...req.form.keys()]).toEqual(["data", "file"]);
    expect(JSON.parse(String(req.form.get("data")))).toEqual({ ...body, documentCategory: "CHECK_IMAGE" });
    expect((req.form.get("file") as File).name).toBe("check.pdf");
  });

  it("no category (the list didn't load): left out, the API uses its default", () => {
    const req = paymentRequest(body, pdf(), "");
    if (!("form" in req)) throw new Error("expected a form");
    expect(JSON.parse(String(req.form.get("data")))).toEqual(body);
  });
});

describe("a lost or unclear reply", () => {
  it("no answer and 5xx are unclear, 4xx is a clear no", () => {
    expect([null, 0, 500, 502, 503, 504].map(isUnclearReply)).toEqual([true, true, true, true, true, true]);
    expect([400, 403, 404, 409, 413, 415].map(isUnclearReply)).toEqual([false, false, false, false, false, false]);
  });

  it("only an object with a payment number is a payment", () => {
    expect(isPaymentAnswer({ paymentNumber: "PMT-2026-0108" })).toBe(true);
    for (const v of ["<html>", null, undefined, {}, { paymentNumber: 1 }]) expect(isPaymentAnswer(v)).toBe(false);
  });

  it("finds the same payment in the ledger, the newest one", () => {
    const e = (over: Partial<LedgerEntry>) =>
      ({ id: "p", kind: "PAYMENT", number: "PMT-1", voided: false, amount: "300.00", date: "2026-11-25", method: "CHECK", referenceNumber: "4471", ...over }) as LedgerEntry;
    expect(findPayment([e({ number: "PMT-1" }), e({ number: "PMT-2" })], body)?.number).toBe("PMT-2");
    expect(findPayment([e({ voided: true }), e({ amount: "300.01" }), e({ date: "2026-11-24" }), e({ method: "CASH" }), e({ referenceNumber: null }), e({ kind: "CHARGE" })], body)).toBeUndefined();
    expect(findPayment([e({ referenceNumber: null })], { ...body, referenceNumber: undefined })?.number).toBe("PMT-1");
    expect(findPayment([], body)).toBeUndefined();
    expect(findPayment([e({ id: "old" })], body, new Set(["old"]))).toBeUndefined();
    expect(findPayment([e({ id: "old" }), e({ id: "new", number: "PMT-9" })], body, new Set(["old"]))?.number).toBe("PMT-9");
  });
});

describe("receiptErrorField", () => {
  it("file and category messages go to the receipt, the rest stays", () => {
    expect(receiptErrorField("File too large", 413)).toBe("file");
    expect(receiptErrorField("file must be a PDF, JPEG or PNG file", 415)).toBe("file");
    expect(receiptErrorField("file is empty", 400)).toBe("file");
    expect(receiptErrorField("documentCategory must be one of RECEIPT, OTHER", 400)).toBe("documentCategory");
    expect(receiptErrorField("amount must be greater than 0", 400)).toBeNull();
  });
});
