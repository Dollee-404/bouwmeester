type RpcReply =
  | { id: number; type: "yapp-ext.rpc.reply"; ok: true; result: unknown }
  | { id: number; type: "yapp-ext.rpc.reply"; ok: false; error: string };

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
};

const pending = new Map<number, Pending>();
let nextId = 1;

const params = new URLSearchParams(window.location.search);
export const HOST_ORIGIN = params.get("host") || "*";
export const INSTANCE_ID = params.get("instance") || "";
export const ERPNEXT_URL = params.get("erpUrl") || "";
export const LANG = params.get("lang") || "nl";

window.addEventListener("message", (event: MessageEvent) => {
  if (HOST_ORIGIN !== "*" && event.origin !== HOST_ORIGIN) return;
  const data = event.data as RpcReply;
  if (!data || data.type !== "yapp-ext.rpc.reply") return;
  const p = pending.get(data.id);
  if (!p) return;
  pending.delete(data.id);
  if (data.ok) {
    p.resolve((data as Extract<RpcReply, { ok: true }>).result);
  } else {
    p.reject(new Error((data as Extract<RpcReply, { ok: false }>).error));
  }
});

function rpc<T>(method: string, args: unknown[] = []): Promise<T> {
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    window.parent.postMessage({ id, type: "yapp-ext.rpc", method, args }, HOST_ORIGIN);
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`yappBridge timeout: ${method}`));
      }
    }, 30_000);
  });
}

export interface ListParams {
  fields?: string[];
  filters?: unknown[][];
  limit_page_length?: number;
  limit_start?: number;
  order_by?: string;
}

export function fetchList<T>(doctype: string, params?: ListParams): Promise<T[]> {
  return rpc<T[]>("fetchList", [doctype, params]);
}

export function fetchDocument<T>(doctype: string, name: string): Promise<T> {
  return rpc<T>("fetchDocument", [doctype, name]);
}

export function updateDocument<T>(
  doctype: string,
  name: string,
  data: Record<string, unknown>,
): Promise<T> {
  return rpc<T>("updateDocument", [doctype, name, data]);
}

export function callMethod<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  return rpc<T>("callMethod", [method, args]);
}

export function createDocument<T>(
  doctype: string,
  doc: Record<string, unknown>,
): Promise<T> {
  return callMethod<T>("frappe.client.insert", { doc: { doctype, ...doc } });
}

export function fetchPrivateFile(filePath: string): Promise<string> {
  return rpc<string>("fetchPrivateFile", [filePath]);
}

export function getActiveInstanceId(): string {
  return INSTANCE_ID;
}

export function getErpNextAppUrl(): string {
  return ERPNEXT_URL;
}

export async function fetchAll<T>(
  doctype: string,
  fields: string[],
  filters: unknown[][] = [],
  orderBy = "modified desc",
  pageSize = 500,
): Promise<T[]> {
  const all: T[] = [];
  let start = 0;
  while (true) {
    const batch = await fetchList<T>(doctype, {
      fields,
      filters,
      order_by: orderBy,
      limit_page_length: pageSize,
      limit_start: start,
    });
    all.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
  }
  return all;
}
