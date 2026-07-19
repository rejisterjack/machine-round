import { useRef } from "react";

/** Keep a ref synced to the latest value for stable callbacks. */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  // eslint-disable-next-line react-hooks/refs -- intentional latest-ref pattern
  ref.current = value;
  return ref;
}
