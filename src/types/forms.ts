/** Generic async data-fetch state used throughout the app */
export interface AsyncState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Generic form state: field values + per-field error map + loading flag */
export interface FormState<
  T extends Record<string, unknown> = Record<string, string>,
> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  loading: boolean;
}

/** Simple result returned after an async form action */
export interface ActionResult {
  ok: boolean;
  msg: string;
}

/** Base props shared by all modal/dialog components */
export interface ModalBaseProps {
  onClose: () => void;
}
