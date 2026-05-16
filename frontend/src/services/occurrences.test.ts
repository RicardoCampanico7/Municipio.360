import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchMyOccurrences,
  fetchPublicOccurrenceById,
  fetchPublicOccurrences,
  type ApiOccurrence,
} from "./occurrences";

function mockFetchJson(payload: unknown, init: ResponseInit = {}) {
  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const fetchMock = vi.fn(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("occurrences service normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("normalizes valid occurrence fields from a nested data response", async () => {
    const fetchMock = mockFetchJson({
      data: [
        {
          id: 10,
          title: " Rua sem luz ",
          category: " Iluminacao publica ",
          categoryKey: "ILUMINACAO_PUBLICA",
          otherCategoryDetail: " Poste principal ",
          description: " Lampada fundida ",
          location: " Avenida Central ",
          status: "open",
          createdAt: " 2026-05-16T10:00:00.000Z ",
          updatedAt: " 2026-05-16T11:00:00.000Z ",
          imageUrls: [
            " /uploads/a.jpg ",
            "/api/uploads/b.jpg",
            "https://example.test/c.jpg",
            "data:image/png;base64,abc",
            "blob:http://localhost/image",
            "",
            null,
            123,
          ],
        },
      ],
    });

    await expect(fetchMyOccurrences("token-123", "fallback")).resolves.toEqual([
      {
        id: 10,
        title: "Rua sem luz",
        category: "Iluminacao publica",
        categoryKey: "ILUMINACAO_PUBLICA",
        otherCategoryDetail: "Poste principal",
        description: "Lampada fundida",
        location: "Avenida Central",
        status: "open",
        statusKey: "SUBMETIDA",
        createdAt: "2026-05-16T10:00:00.000Z",
        updatedAt: "2026-05-16T11:00:00.000Z",
        imageUrls: [
          "/api/uploads/a.jpg",
          "/api/uploads/b.jpg",
          "https://example.test/c.jpg",
          "data:image/png;base64,abc",
          "blob:http://localhost/image",
        ],
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("/api/occurrences/mine/list", {
      method: "GET",
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("normalizes status and category keys for canonical and presentation values", async () => {
    mockFetchJson({
      occurrences: [
        { id: 1, category: "BURACOS_PAVIMENTO", status: "SUBMETIDA" },
        { id: 2, category: "RUIDO", status: "EM_TRATAMENTO" },
        { id: 3, category: "OUTROS", status: "CONCLUIDA" },
        { id: 4, categoryKey: "SINALIZACAO", status: "progress" },
        { id: 5, categoryKey: "ESPACOS_PUBLICOS", status: "resolved" },
      ],
    });

    const occurrences = await fetchMyOccurrences("token-123", "fallback");

    expect(
      occurrences.map(({ categoryKey, status, statusKey }) => ({
        categoryKey,
        status,
        statusKey,
      })),
    ).toEqual([
      { categoryKey: "BURACOS_PAVIMENTO", status: "open", statusKey: "SUBMETIDA" },
      { categoryKey: "RUIDO", status: "progress", statusKey: "EM_TRATAMENTO" },
      { categoryKey: "OUTROS", status: "resolved", statusKey: "CONCLUIDA" },
      { categoryKey: "SINALIZACAO", status: "progress", statusKey: "EM_TRATAMENTO" },
      { categoryKey: "ESPACOS_PUBLICOS", status: "resolved", statusKey: "CONCLUIDA" },
    ]);
  });

  it("leaves unknown status and category values undefined where no mapping exists", async () => {
    mockFetchJson([
      {
        id: 1,
        category: "UNKNOWN_CATEGORY",
        status: "UNKNOWN_STATUS",
        imageUrls: [],
      },
    ]);

    await expect(fetchMyOccurrences("token-123", "fallback")).resolves.toEqual([
      {
        id: 1,
        category: "UNKNOWN_CATEGORY",
        categoryKey: undefined,
        otherCategoryDetail: undefined,
        description: undefined,
        location: undefined,
        status: "UNKNOWN_STATUS",
        statusKey: undefined,
        title: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        imageUrls: undefined,
      },
    ]);
  });

  it("returns empty lists for null, undefined-like, empty, and invalid list payloads", async () => {
    for (const payload of [null, {}, { data: null }, { occurrences: undefined }, []]) {
      mockFetchJson(payload);
      await expect(fetchPublicOccurrences("fallback")).resolves.toEqual([]);
      vi.unstubAllGlobals();
    }

    mockFetchJson([null, undefined, [], "bad"]);
    await expect(fetchPublicOccurrences("fallback")).resolves.toEqual([]);
  });

  it("normalizes nested occurrences responses", async () => {
    mockFetchJson({
      occurrences: [
        { id: "a", category: "LIMPEZA_URBANA", statusKey: "SUBMETIDA", imageUrls: undefined },
        { id: "b", category: "RUIDO", statusKey: "EM_TRATAMENTO", imageUrls: ["/uploads/b.png"] },
      ],
    });

    await expect(fetchPublicOccurrences("fallback")).resolves.toMatchObject([
      {
        id: "a",
        categoryKey: "LIMPEZA_URBANA",
        statusKey: "SUBMETIDA",
        imageUrls: undefined,
      },
      {
        id: "b",
        categoryKey: "RUIDO",
        statusKey: "EM_TRATAMENTO",
        imageUrls: ["/api/uploads/b.png"],
      },
    ]);
  });

  it("normalizes a single occurrence from data and occurrence response shapes", async () => {
    mockFetchJson({
      data: {
        id: 3,
        category: "OUTROS",
        otherCategoryDetail: "Banco partido",
        status: "resolved",
      },
    });

    await expect(fetchPublicOccurrenceById("3", "fallback")).resolves.toMatchObject({
      id: 3,
      categoryKey: "OUTROS",
      otherCategoryDetail: "Banco partido",
      status: "resolved",
      statusKey: "CONCLUIDA",
    } satisfies Partial<ApiOccurrence>);

    mockFetchJson({
      occurrence: {
        id: 4,
        category: "SINALIZACAO",
        status: "EM_TRATAMENTO",
      },
    });

    await expect(fetchPublicOccurrenceById("4", "fallback")).resolves.toMatchObject({
      id: 4,
      categoryKey: "SINALIZACAO",
      status: "progress",
      statusKey: "EM_TRATAMENTO",
    } satisfies Partial<ApiOccurrence>);
  });

  it("throws the API message for failed responses", async () => {
    mockFetchJson({ message: ["Primeiro erro", "Segundo erro"] }, { status: 400 });

    await expect(fetchPublicOccurrences("fallback")).rejects.toMatchObject({
      name: "OccurrencesRequestError",
      status: 400,
      message: "Primeiro erro, Segundo erro",
    });
  });
});
