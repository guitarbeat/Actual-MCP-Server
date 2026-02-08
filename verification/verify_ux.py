from playwright.sync_api import sync_playwright

def verify_ux():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Initial Screenshot
        page.screenshot(path="dashboard_initial.png")
        print("Initial screenshot taken.")

        # Hover over the first endpoint row
        row = page.locator(".ep-row").first
        row.hover()
        page.screenshot(path="dashboard_row_hover.png")
        print("Row hover screenshot taken.")

        # Hover over the copy button
        btn = row.locator(".copy-btn")
        btn.hover()
        page.screenshot(path="dashboard_btn_hover.png")
        print("Button hover screenshot taken.")

        # Click the copy button
        # Allow clipboard access if needed, but in headless it might just work or fail silently on permissions.
        # We just want to see the UI change (tooltip and icon swap).
        try:
            # Grant clipboard permissions for localhost
            context = browser.new_context(permissions=["clipboard-read", "clipboard-write"])
            page = context.new_page()
            page.goto("http://localhost:3000")
            row = page.locator(".ep-row").first
            btn = row.locator(".copy-btn")
            btn.click()
            # Wait for tooltip
            page.wait_for_selector(".tooltip-text", state="visible")
            page.screenshot(path="dashboard_copied.png")
            print("Copied state screenshot taken.")
        except Exception as e:
            print(f"Could not verify copy action: {e}")

        browser.close()

if __name__ == "__main__":
    verify_ux()
