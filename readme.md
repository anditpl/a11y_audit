# Accessibility Audit Automation Program
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
- **Available WCAG Levels:** A, AA (default), AAA
- **Example:**
  ```bash
  node a11y_audit.js www.example.com
  ```
  You will be prompted to enter the audit level and roles.

For a list of available roles, visit:
[axe-core rule descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)

## Configuration
```sh
- Report Directory: [reports](./reports)
- Local Pages Directory: [local_pages](./local_pages)
- Sites File: [sites.json](./sites.json)
- Timeout: 15000 milliseconds
```

## Contact
- **Author**: Łukasz Krause
- **Email**: lukaszgd@gmail.com
- **LinkedIn**: [Łukasz Krause](https://www.linkedin.com/in/lukasz-krause/)
