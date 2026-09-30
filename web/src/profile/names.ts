import { testInfo } from "../tests/catalog";

export const testName = (id: string) => testInfo(id)?.name ?? id;
