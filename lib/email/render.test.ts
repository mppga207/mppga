import { describe, expect, it } from "vitest";

import {
  composeFooter,
  renderTemplate,
  substitute,
  type SiteContact,
} from "./render";

const contact: SiteContact = {
  email: "mppga207@gmail.com",
  phone: null,
};

describe("substitute", () => {
  it("replaces single-brace pairs with values", () => {
    expect(substitute("Hello {{name}}", { name: "Jane" })).toBe("Hello Jane");
  });

  it("renders missing variables as empty strings", () => {
    expect(substitute("a {{a}} b {{b}}", { a: "X" })).toBe("a X b ");
  });

  it("coerces numbers to strings", () => {
    expect(substitute("{{n}}", { n: 42 })).toBe("42");
  });

  it("tolerates whitespace inside braces", () => {
    expect(substitute("Hello {{  name  }}", { name: "Jane" })).toBe("Hello Jane");
  });

  it("ignores unrelated braces", () => {
    expect(substitute("{value} and {{value}}", { value: "X" })).toBe(
      "{value} and X",
    );
  });
});

describe("composeFooter", () => {
  it("includes org name and contact in both HTML and text", () => {
    const footer = composeFooter(contact, false);
    expect(footer.html).toContain("Maine Professional Pet Groomers Association");
    expect(footer.html).toContain("mppga207@gmail.com");
    expect(footer.text).toContain("Maine Professional Pet Groomers Association");
    expect(footer.text).toContain("mppga207@gmail.com");
  });

  it("omits the 501(c)(6) disclaimer when not dues-related", () => {
    const footer = composeFooter(contact, false);
    expect(footer.html).not.toContain("not deductible as charitable");
    expect(footer.text).not.toContain("not deductible as charitable");
  });

  it("includes the 501(c)(6) disclaimer when dues-related", () => {
    const footer = composeFooter(contact, true);
    expect(footer.html).toContain("not deductible as charitable contributions");
    expect(footer.text).toContain("not deductible as charitable contributions");
  });

  it("html-escapes user-visible content in the HTML footer", () => {
    const evil: SiteContact = { email: "<script>", phone: null };
    const footer = composeFooter(evil, false);
    expect(footer.html).toContain("&lt;script&gt;");
    expect(footer.html).not.toContain("<script>");
  });
});

describe("renderTemplate", () => {
  it("substitutes variables into subject and bodies and appends footer", () => {
    const out = renderTemplate(
      {
        subject: "Hi {{full_name}}",
        body_html: "<p>{{full_name}}, welcome.</p>",
        body_text: "{{full_name}}, welcome.",
        is_dues_related: false,
      },
      { full_name: "Jane" },
      contact,
    );

    expect(out.subject).toBe("Hi Jane");
    expect(out.html).toContain("<p>Jane, welcome.</p>");
    expect(out.text).toContain("Jane, welcome.");
    expect(out.html).toContain("Maine Professional Pet Groomers Association");
    expect(out.text).toContain("Maine Professional Pet Groomers Association");
  });

  it("exposes site_url and contact_email as base variables", () => {
    const out = renderTemplate(
      {
        subject: "X",
        body_html: "{{site_url}} / {{contact_email}}",
        body_text: "{{site_url}} / {{contact_email}}",
        is_dues_related: false,
      },
      {},
      contact,
    );
    expect(out.html).toContain("/ mppga207@gmail.com");
    // siteUrl defaults to http://localhost:3000 in the test env
    expect(out.html).toMatch(/https?:\/\//);
  });

  it("includes the 501(c)(6) disclaimer when the template is dues-related", () => {
    const out = renderTemplate(
      {
        subject: "Receipt",
        body_html: "<p>Thanks</p>",
        body_text: "Thanks",
        is_dues_related: true,
      },
      {},
      contact,
    );
    expect(out.html).toContain("not deductible as charitable contributions");
    expect(out.text).toContain("not deductible as charitable contributions");
  });
});
