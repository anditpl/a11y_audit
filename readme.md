# Accessibility Audit Automation Program

## 🚀 Overview
Welcome to the **Accessibility Audit Automation Program**, a tool developed by **Łukasz Krause** for automating accessibility audits on websites using **Playwright** and [axe-core](https://github.com/dequelabs/axe-core) integration.

This program generates detailed accessibility reports in **HTML** and **JSON** formats, based on **WCAG levels (A, AA, AAA)**. It also supports auditing specific accessibility roles, providing a summary of accessibility violations to improve web accessibility.

## ⚡ Features
- **Batch Auditing:** Automatically detects `sites.json` with websites urls for auditing multiple websites.
- **Local HTML Support:** Audits local HTML files from the `local_pages` folder.
- **Error Handling:** Handles unreachable websites gracefully.
- **Customizable Audits:** Allows customization of audit levels and roles.
- **Multiple Role Support:** Accepts multiple roles (comma-separated).
- **Comprehensive Reports:** Generates detailed reports in **HTML** and **JSON** formats.
- **Best Practices Tag:** Each WCAG level includes the `best-practice` tag.
- **Highlighted Screenshots:** Screenshots with highlighted accessibility violations (in **JPG** format) are generated.
- **Command-Line Support:** Run audits by passing website URLs directly via CLI.
- **PDF Summary Report:** Generates a combined **PDF** report summarizing key findings for all audited sites.

## ℹ️ Important 
Automated accessibility testing should be treated as a complementary step. For comprehensive accessibility assurance, manual testing is essential.

## 🔧 Installation
1. Clone the repository:
    ```sh
    git clone https://github.com/anditpl/a11y_audit.git
    cd a11y_audit
    ```

2. Install the required dependencies:
    ```sh
    npm install
    ```
## 📦 Requirements

- [Node.js](https://nodejs.org/)
- npm (comes with Node.js)

The following npm packages are required:

- **playwright** – For browser automation.
- **@axe-core/playwright** – For accessibility audits integration with Playwright.
- **axe-html-reporter** – For generating HTML accessibility reports.
- **prompt-sync** – For synchronous user input from the command line.
- **fs/promises** – Node.js file system promises API.
- **fs** – Node.js file system API.
- **path** – Node.js path module for handling file paths.
- **cheerio** – For parsing HTML.
- **chalk** – For styling terminal strings.
- **pdfkit** – For generating PDF reports.

## 🚀 Usage

### Run Audit with `sites.json` and Local HTML Files
```bash
node a11y_audit.js
```

### JSON Format:
```bash
[
    "www.example.com",
    "www.gdynia.pl",
    "www.gdansk.pl",
    "https://bip.brpo.gov.pl/pl"
  ]
```

### Run Audit with Specific URLs
```bash
node a11y_audit.js www.example.com www.websitetotest.com
```

- In this mode, the program will ignore `sites.json` and `local_pages` folder.

### Customize Audit Level and Roles
