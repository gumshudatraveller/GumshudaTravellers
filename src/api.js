import {
  packages as initialPackages,
  stories as initialStories,
} from "../shared/data";
export const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const hasBackend = Boolean(API);
export const asset = (name) =>
  name?.startsWith("/uploads/")
    ? `${API.replace(/\/api$/, "")}${name}`
    : `${import.meta.env.BASE_URL}assets/${name}`;
export async function request(path, options = {}) {
  if (!API)
    throw new Error(
      "Online accounts and uploads are not available yet. Please contact our travel team on WhatsApp.",
    );
  const token = sessionStorage.getItem("gumshuda-token");
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response
    .json()
    .catch(() => ({ error: "The server returned an unexpected response." }));
  if (!response.ok)
    throw new Error(body.error || "Something went wrong. Please try again.");
  return body;
}
export const getPackages = () =>
  API ? request("/packages") : Promise.resolve(initialPackages);
export const getStories = () =>
  API ? request("/stories") : Promise.resolve(initialStories);
export const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export function dateAdd(date, days) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
