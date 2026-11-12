import { createClient } from "@supabase/supabase-js";
import publicConfig from "./supabase-config.json";
const url = import.meta.env.VITE_SUPABASE_URL || publicConfig.url;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || publicConfig.publishableKey;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: sessionStorage,
        },
      })
    : null;
export const hasSupabase = Boolean(supabase);
function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}
export async function supabaseUser() {
  const { user } = unwrap(await supabase.auth.getUser());
  if (!user) throw new Error("Please sign in.");
  const admin = unwrap(
    await supabase
      .from("site_admin")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  );
  return {
    id: user.id,
    email: user.email,
    name: "Gumshuda team",
    role: admin ? "admin" : "customer",
  };
}
export async function publicPackages() {
  return unwrap(
    await supabase
      .from("travel_packages")
      .select("id,data")
      .eq("status", "published")
      .order("created_at"),
  ).map((r) => ({ ...r.data, id: r.id, status: "published" }));
}
export async function supabaseRequest(path, options = {}) {
  const method = options.method || "GET";
  const body =
    typeof options.body === "string" ? JSON.parse(options.body) : options.body;
  if (path === "/auth/me") return supabaseUser();
  if (path === "/auth/logout") {
    unwrap(await supabase.auth.signOut());
    return {};
  }
  if (path === "/auth/login") {
    const result = unwrap(
      await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      }),
    );
    return { token: result.session.access_token, user: await supabaseUser() };
  }
  if (path === "/auth/register")
    throw new Error(
      "Admin accounts are created by the site owner. Customer registration is not enabled.",
    );
  if (!path.startsWith("/admin/"))
    throw new Error("This feature is not enabled. Please enquire on WhatsApp.");
  const user = await supabaseUser();
  if (user.role !== "admin")
    throw new Error("Administrator access is required.");
  if (path === "/admin/overview") {
    const [packages, media] = await Promise.all([
      supabase
        .from("travel_packages")
        .select("id,data,status")
        .order("created_at"),
      supabase
        .from("package_media")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    return {
      packages: unwrap(packages).map((r) => ({
        ...r.data,
        id: r.id,
        status: r.status,
      })),
      media: unwrap(media),
      stories: [],
      requests: [],
    };
  }
  if (path === "/admin/media" && method === "POST") {
    const file = body.get("file");
    const extensions = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "application/pdf": "pdf",
    };
    if (!file || !extensions[file.type])
      throw new Error("Choose a JPG, PNG, WebP image or PDF.");
    if (file.size > 10 * 1024 * 1024)
      throw new Error("Choose a file smaller than 10 MB.");
    const name = `${user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
    unwrap(
      await supabase.storage
        .from("package-media")
        .upload(name, file, { contentType: file.type, upsert: false }),
    );
    const url = supabase.storage.from("package-media").getPublicUrl(name)
      .data.publicUrl;
    const result = await supabase
      .from("package_media")
      .insert({
        name: file.name,
        type: file.type,
        size: file.size,
        url,
        storage_path: name,
      })
      .select()
      .single();
    if (result.error) {
      await supabase.storage.from("package-media").remove([name]);
      throw new Error(result.error.message);
    }
    return result.data;
  }
  if (path === "/admin/packages" && method === "POST") {
    const id = crypto.randomUUID();
    unwrap(
      await supabase
        .from("travel_packages")
        .insert({ id, status: body.status, data: { ...body, id, homeTitle: body.title } }),
    );
    return { ...body, id };
  }
  if (path.startsWith("/admin/packages/") && method === "PUT") {
    const id = path.slice("/admin/packages/".length);
    unwrap(
      await supabase
        .from("travel_packages")
        .update({ status: body.status, data: { ...body, id, homeTitle: body.title } })
        .eq("id", id)
        .select("id")
        .single(),
    );
    return { ...body, id };
  }
  throw new Error(
    "This feature is not enabled with Supabase package management.",
  );
}
