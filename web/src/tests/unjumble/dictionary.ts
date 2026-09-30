import dictionaryUrl from "../../../../wordlists/unjumble_dictionary.txt?url";

let words: Set<string> | undefined;
let loading: Promise<Set<string>> | undefined;

/** Downloads the dictionary once per visit; after a failure the next call tries again. */
export function loadDictionary(): Promise<Set<string>> {
  loading ??= fetch(dictionaryUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`dictionary download failed (${res.status})`);
      return res.text();
    })
    .then((text) => (words = new Set(text.split("\n").filter(Boolean))))
    .catch((err: unknown) => {
      loading = undefined;
      throw err;
    });
  return loading;
}

/** The downloaded dictionary (the test page waits for loadDictionary before play). */
export function dictionary(): Set<string> {
  if (!words) throw new Error("the dictionary is not loaded");
  return words;
}
