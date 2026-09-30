import { describe, expect, it } from "vitest";
import { buildPageModel } from "../src/pom/pageModel.js";
import { makeElement } from "./helpers.js";

describe("buildPageModel", () => {
  it("turns a form into a named page", () => {
    const elements = Array.from({ length: 3 }, (_, i) =>
      makeElement({ index: i, context: { form: "checkout-form" } }),
    );
    const model = buildPageModel(elements);
    const page = model.owners.find((o) => o.type === "page");
    expect(page).toBeDefined();
    expect(page!.name).toBe("CheckoutFormPage");
    expect(page!.elements).toHaveLength(3);
  });

  it("derives the page name from the URL when no form exists", () => {
    const elements = Array.from({ length: 2 }, (_, i) => makeElement({ index: i }));
    const model = buildPageModel(elements, "https://example.com/products/123");
    const page = model.owners.find((o) => o.type === "page");
    expect(page!.name).toBe("ProductsPage");
  });

  it("turns nav into a Navigation component", () => {
    const nav = Array.from({ length: 3 }, (_, i) => makeElement({ index: i, context: { container: "nav" } }));
    const body = Array.from({ length: 2 }, (_, i) => makeElement({ index: i + 10 }));
    const model = buildPageModel([...nav, ...body]);
    const component = model.owners.find((o) => o.type === "component" && o.name === "Navigation");
    expect(component).toBeDefined();
    expect(component!.elements).toHaveLength(3);
  });

  it("turns repeated class signatures into a card component", () => {
    const signature = "product-card shadow-lg";
    const cards = Array.from({ length: 6 }, (_, i) =>
      makeElement({ index: i, context: { repeatedClass: signature } }),
    );
    const model = buildPageModel(cards);
    const component = model.owners.find((o) => o.type === "component" && o.name === "ProductCard");
    expect(component).toBeDefined();
    expect(component!.elements).toHaveLength(6);
  });

  it("keeps every element assigned exactly once", () => {
    const elements = [
      ...Array.from({ length: 3 }, (_, i) => makeElement({ index: i, context: { form: "login" } })),
      ...Array.from({ length: 4 }, (_, i) => makeElement({ index: i + 10, context: { container: "nav" } })),
      ...Array.from({ length: 5 }, (_, i) => makeElement({ index: i + 20 })),
    ];
    const model = buildPageModel(elements, "https://example.com/login");
    const assigned = model.owners.flatMap((o) => o.elements.map((el) => el.elementId));
    expect(new Set(assigned).size).toBe(elements.length);
  });
});
