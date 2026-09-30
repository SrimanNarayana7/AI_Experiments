import { describe, expect, it } from "vitest";
import { assertPublicHost, UrlFetchError } from "../src/url/urlFetch.js";

describe("assertPublicHost (SSRF guard)", () => {
  it("rejects localhost", async () => {
    await expect(assertPublicHost("localhost")).rejects.toThrow(UrlFetchError);
  });

  it("rejects loopback addresses", async () => {
    await expect(assertPublicHost("127.0.0.1")).rejects.toThrow(UrlFetchError);
  });

  it("rejects private ranges", async () => {
    await expect(assertPublicHost("10.0.0.1")).rejects.toThrow(UrlFetchError);
    await expect(assertPublicHost("192.168.1.1")).rejects.toThrow(UrlFetchError);
  });

  it("allows public hosts", async () => {
    await expect(assertPublicHost("example.com")).resolves.toBeUndefined();
  });
});
