export const DATA_START = "2025-05-23";
export const TODAY = "2026-11-22";

export const RRF_K = 60;

export const FIELDS = ["Dune Field", "Wadi Field", "Salt Flat Field"] as const;
export type Field = (typeof FIELDS)[number];

export const DOC_TYPES = ["shift_report", "incident_note", "work_order", "well_test", "procedure"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const DOC_TYPE_LABEL: Record<DocType, string> = { shift_report: "Shift report", incident_note: "Incident note", work_order: "Work order", well_test: "Well test", procedure: "Procedure" };
export const docTypeLabel = (t: string) => DOC_TYPE_LABEL[t as DocType] ?? t;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const month = (d: string, short: boolean) => MONTHS[Number(d.slice(5, 7)) - 1].slice(0, short ? 3 : undefined);

export const shortDate = (d: string) => `${Number(d.slice(8, 10))} ${month(d, true)} ${d.slice(0, 4)}`;
export const longDate = (d: string) => `${Number(d.slice(8, 10))} ${month(d, false)} ${d.slice(0, 4)}`;
export const monthYear = (d: string, short = false) => `${month(d, short)} ${d.slice(0, 4)}`;
