/**
 * 📜 Accessibility Audit Automation Program
 * ----------------------------------------------------
 * 🚀 Welcome to the Accessibility Audit Automation Program written by Łukasz Krause.
 *
 * This program performs automated accessibility audits for websites
 * using Playwright and axe-core integration. It generates detailed reports
 * in both HTML and JSON formats based on WCAG levels (A, AA, AAA) and
 * supports auditing specific accessibility roles. The reports include a
 * summary of accessibility violations to help improve web accessibility.
 *
 * ℹ️ Important: Automated accessibility testing should be treated as a complementary step.
 * For comprehensive accessibility testing, manual testing is essential.
 *
 * 🔧 Features:
 * - Automatic detection of "sites.json" for batch website auditing.
 * - Support for auditing local HTML files from the "local_pages" folder.
 * - Detailed error handling for unreachable websites.
 * - Customizable audit level and role targeting.
 * - Reports generated in HTML and JSON formats.
 * - Each WCAG level includes the "best-practice" tag for comprehensive audits.
 *
 * Additionally:
 * - If accessibility violations are detected, a screenshot with highlighted elements 
 *   (using a red outline) will be taken and saved in JPG format to reduce file size.
 *
 * - You can also run the program by providing one or more website URLs as command-line arguments.
 *   For example: `node a11y_audit.js www.example.com`
 *   In this mode, the program will ignore sites from "sites.json" and the "local_pages" folder.
 *
 * - A combined PDF report summarizing all tests will also be generated,
 *   containing the most important information for each audited site, including a list of detected violations.
 *
 * 📝 Author: Łukasz Krause
 * 📧 Email: lukaszgd@gmail.com
 * 🔗 LinkedIn: https://www.linkedin.com/in/lukasz-krause/
 * ----------------------------------------------------
 */

const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { createHtmlReport } = require('axe-html-reporter');
const prompt = require('prompt-sync')({ sigint: true });
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const chalk = require('chalk').default;
const PDFDocument = require('pdfkit');

// Configuration - constants
const REPORT_DIR = path.resolve(__dirname, 'reports');
const LOCAL_PAGES_DIR = path.resolve(__dirname, 'local_pages');
const SITES_FILE = path.resolve(__dirname, 'sites.json');
const TIPS_FILE = path.resolve(__dirname, 'tips.json');
const TIMEOUT = 15000;

// WCAG Levels Map
const WCAG_LEVELS = {
  A: ['wcag2a', 'wcag21a', 'best-practice'],
  AA: ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa', 'best-practice'],
  AAA: ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa', 'wcag2aaa', 'best-practice']
};

// Logging helper functions
const logSeparator = () => console.log(chalk.gray('--------------------------------------------------'));
const logHeader = (text) => console.log(chalk.bold.blue(text));
const logInfo = (text) => console.log(chalk.cyan(text));
const logSuccess = (text) => console.log(chalk.green(text));
const logWarning = (text) => console.log(chalk.yellow(text));
const logError = (text) => console.error(chalk.red(text));

// Normalize URL - adds protocol if missing or handles local HTML files
function normalizeUrl(inputUrl) {
  let url = inputUrl.trim();
  if (url.endsWith('.html')) {
    url = `file://${path.resolve(__dirname, url)}`;
  } else if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

// Get hostname for report naming
function getHostName(url) {
  try {
    if (url.startsWith('file://')) return path.basename(url, '.html');
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, '').replace(/\./g, '_');
  } catch (error) {
    logError(`❌ Error parsing URL: ${error}`);
    return 'report';
  }
}

// Format timestamp for report naming
function getFormattedTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year}_${hours}-${minutes}`;
}

// Get WCAG tags based on user input level
function getWcagTags(levelInput) {
  const level = levelInput.toUpperCase().trim();
  if (WCAG_LEVELS[level]) return WCAG_LEVELS[level];
  logWarning('⚡ Invalid level – defaulting to AA.');
  return WCAG_LEVELS['AA'];
}

// Load sites from local HTML files and sites.json
async function loadSites() {
  let sites = [];
  try {
    const localFiles = await fs.readdir(LOCAL_PAGES_DIR);
    const localSites = localFiles
      .filter(file => file.endsWith('.html'))
      .map(file => path.join('local_pages', file));
    sites = sites.concat(localSites);
  } catch (error) {
    logWarning('❌ No local_pages folder or HTML files found.');
  }
  try {
    const fileContent = await fs.readFile(SITES_FILE, 'utf-8');
    const jsonSites = JSON.parse(fileContent);
    if (Array.isArray(jsonSites)) sites = sites.concat(jsonSites);
  } catch (error) {
    logWarning('❌ sites.json not found or invalid.');
  }
  return sites;
}

// Display a random accessibility tip from tips.json
async function displayRandomTip() {
  try {
    const tipsContent = await fs.readFile(TIPS_FILE, 'utf-8');
    const tipsData = JSON.parse(tipsContent);
    if (tipsData && Array.isArray(tipsData.tips) && tipsData.tips.length > 0) {
      const randomIndex = Math.floor(Math.random() * tipsData.tips.length);
      const tip = tipsData.tips[randomIndex];
      console.log(`\n${chalk.bold.magenta('💡 Accessibility Tip:')} ${tip}\n`);
    } else {
      logWarning('❌ No tips found in tips.json.');
    }
  } catch (error) {
    logWarning(`❌ Could not load tips.json: ${error.message}`);
  }
}

/**
 * Highlights elements violating accessibility standards by injecting custom CSS,
 * adding numbering for each violation, taking a screenshot with highlighted elements,
 * and generating a legend file.
 *
 * The screenshot is saved in JPG format to reduce file size.
 *
 * @param {object} page - Playwright page instance.
 * @param {object} axeResults - Results from axe-core analysis.
 * @param {string} screenshotPath - Path where the screenshot will be saved.
 * @param {string} legendPath - Path where the legend file will be saved.
 */
async function highlightViolations(page, axeResults, screenshotPath, legendPath) {
  // Inject CSS for highlighting with numbering
  await page.addStyleTag({
    content: `
      .a11y-violation-highlight {
        outline: 3px solid red !important;
        box-shadow: 0 0 10px red !important;
        position: relative;
      }
      .a11y-violation-number {
        position: absolute;
        background-color: black;
        color: yellow;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: bold;
        font-size: 16px;
        border: 2px solid white;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
      }
    `
  });

  // Map violation IDs to fixed numbers
  const violationMap = new Map();
  let uniqueIndex = 1;
  for (const violation of axeResults.violations) {
    if (!violationMap.has(violation.id)) {
      violationMap.set(violation.id, uniqueIndex);
      uniqueIndex++;
    }
  }

  // Highlight each violation - if multiple elements share the same violation, they get the same number
  for (const violation of axeResults.violations) {
    const violationNumber = violationMap.get(violation.id);
    for (const node of violation.nodes) {
      if (Array.isArray(node.target)) {
        for (const selector of node.target) {
          if (typeof selector === 'string') {
            await page.$$eval(
              selector,
              (elements, data) => {
                elements.forEach(el => {
                  if (!el.querySelector('.a11y-violation-number')) {
                    el.classList.add('a11y-violation-highlight');
                    if (el.tagName.toLowerCase() === 'img') {
                      el.style.display = 'inline-block';
                    }
                    el.style.position = 'relative';
                    const numberTag = document.createElement('div');
                    numberTag.classList.add('a11y-violation-number');
                    numberTag.textContent = data.violationNumber;
                    el.appendChild(numberTag);
                  }
                });
              },
              { violationNumber }
            );
          }
        }
      }
    }
  }

  // Take a full-page screenshot (JPG format)
  await page.screenshot({ path: screenshotPath, fullPage: true, type: 'jpeg', quality: 60 });

  // Generate legend data for each violation type
  const legendData = [];
  for (const [violationId, index] of violationMap.entries()) {
    const description = axeResults.violations.find(v => v.id === violationId)?.description || 'No description available';
    legendData.push(`${index}: ${violationId} - ${description}`);
  }
  await fs.writeFile(legendPath, legendData.join('\n'));
}

/**
 * Runs an accessibility audit for a single site.
 *
 * @param {string} site - URL of the site.
 * @param {string[]} wcagTags - WCAG tags based on the chosen level.
 * @param {string[]} roleInputs - Specific roles for the audit (if provided).
 * @param {object} browser - Playwright browser instance.
 * @returns {object} Summary of the audit.
 */
async function runAuditForSite(site, wcagTags, roleInputs, browser) {
  const startTime = Date.now();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    logSeparator();
    logHeader(`🔍 Starting audit for: ${site}`);
    logInfo(
      `📋 Audit settings: WCAG Tags: ${wcagTags.join(', ')}${
        roleInputs.length > 0 ? ` | Specific Roles: ${roleInputs.join(', ')}` : ''
      }`
    );

    await page.goto(site, { waitUntil: 'networkidle', timeout: TIMEOUT });
    let builder = new AxeBuilder({ page });
    builder = roleInputs.length > 0 ? builder.withRules(roleInputs) : builder.withTags(wcagTags);
    const results = await builder.analyze();

    const siteName = getHostName(site);
    const timestamp = getFormattedTimestamp();
    const htmlReportPath = path.join(REPORT_DIR, `${siteName}_${timestamp}.html`);
    const jsonReportPath = path.join(REPORT_DIR, `${siteName}_${timestamp}.json`);

    // Temporarily suppress unwanted messages from createHtmlReport
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk, encoding, callback) => {
      if (typeof chunk === 'string' && chunk.includes('HTML report was saved into the following directory')) {
        if (callback) callback();
        return true;
      }
      return originalStdoutWrite(chunk, encoding, callback);
    };

    const htmlReportContent = createHtmlReport({ results: { violations: results.violations } });
    process.stdout.write = originalStdoutWrite;

    await fs.writeFile(htmlReportPath, htmlReportContent);
    await fs.writeFile(jsonReportPath, JSON.stringify(results, null, 2));

    // If violations are detected, highlight them and take a screenshot
    if (results.violations.length > 0) {
      const screenshotPath = path.join(REPORT_DIR, `${siteName}_${timestamp}_highlight.jpg`);
      const legendPath = path.join(REPORT_DIR, `${siteName}_${timestamp}_legend.txt`);
      await highlightViolations(page, results, screenshotPath, legendPath);
      logInfo(`📸 Screenshot saved: ${chalk.underline(screenshotPath)}`);
      logInfo(`📄 Legend saved: ${chalk.underline(legendPath)}`);
    }

    // Build a summary of violations (each with id and description)
    const violationList = results.violations
      .map((v, idx) => `${idx + 1}. ${v.id} - ${v.description}`)
      .join('\n');

    // Extract violation count using Cheerio
    const $ = cheerio.load(htmlReportContent);
    let badgeText = $('.badge.badge-warning').text().trim();
    const totalViolations = badgeText ? parseInt(badgeText, 10) : results.violations.length;
    const distinctAreas = new Set(results.violations.map(v => v.id)).size;

    logSuccess(`\n✅ Audit completed for: ${site}`);
    if (results.violations.length > 0) {
      logError(`❌ Detected ${totalViolations} violations across ${distinctAreas} distinct accessibility areas.`);
      logInfo('Note: Automated tests may not catch all issues; manual testing is essential.');
    } else {
      logSuccess(`🎉 No accessibility violations found.`);
      logInfo('Note: Automated tests may not catch all issues; manual testing is essential.');
    }
    logInfo('📁 Reports generated:');
    console.log(`   HTML: ${chalk.underline(htmlReportPath)}`);
    console.log(`   JSON: ${chalk.underline(jsonReportPath)}`);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    logInfo(`⏱️ Test duration: ${duration} seconds`);
    logSeparator();

    return {
      site,
      siteName,
      totalViolations,
      distinctAreas,
      duration: parseFloat(duration),
      htmlReportPath,
      jsonReportPath,
      violationList
    };
  } catch (error) {
    logError(`❗ Error auditing ${site}: ${error.message}`);
    return { duration: 0 };
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * Generates a combined PDF report summarizing all audits.
 *
 * @param {object[]} summaries - Array of audit summaries.
 * @param {number} totalDuration - Total duration of all audits.
 * @returns {Promise<string>} Path to the generated PDF file.
 */
async function generatePdfReport(summaries, totalDuration) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const timestamp = getFormattedTimestamp();
    const pdfPath = path.join(REPORT_DIR, `combined_report_${timestamp}.pdf`);
    const writeStream = fsSync.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // Report header
    doc.fontSize(20).text('Accessibility Audit Summary Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary for each site
    summaries.forEach(summary => {
      doc.fontSize(14).fillColor('blue').text(`Site: ${summary.site}`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('black')
        .text(`Host: ${summary.siteName}`)
        .text(`Test Duration: ${summary.duration} seconds`)
        .text(`Total Violations: ${summary.totalViolations}`)
        .text(`Distinct Areas: ${summary.distinctAreas}`)
        .text(`HTML Report: ${summary.htmlReportPath}`)
        .text(`JSON Report: ${summary.jsonReportPath}`);
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('black').text('Violations:', { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(10).text(summary.violationList || 'No violations detected.');
      doc.moveDown();
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown();
    });

    // Overall summary
    doc.moveDown();
    doc.fontSize(14).fillColor('green').text(`Total Test Duration for All Sites: ${totalDuration.toFixed(2)} seconds`, { align: 'center' });
    doc.end();

    writeStream.on('finish', () => resolve(pdfPath));
    writeStream.on('error', reject);
  });
}

// Display welcome message along with a random tip
async function displayWelcomeMessage() {
  console.log(`\n${chalk.bold.green('🚀 Welcome to the Accessibility Audit Automation Program!')}`);
  await displayRandomTip();
  console.log(`\n${chalk.bold('📝 This tool audits website accessibility according to WCAG guidelines and generates reports in HTML and JSON formats.')}`);
  console.log(`${chalk.bold('ℹ️  Important:')} Automated tests are complementary – manual testing is essential.`);
  console.log(`\n${chalk.bold('📧 Contact:')} lukaszgd@gmail.com | ${chalk.bold('LinkedIn:')} https://www.linkedin.com/in/lukasz-krause/\n`);
}

// Main asynchronous function
(async () => {
  try {
    await displayWelcomeMessage();
    await fs.mkdir(REPORT_DIR, { recursive: true });

    // Check command-line arguments or load sites from files
    const args = process.argv.slice(2);
    let sites = args.length > 0 ? args : await loadSites();

    if (sites.length === 0) {
      logWarning('❗ No sites found for auditing.');
      return;
    }

    logInfo('📁 Sites detected for auditing:');
    console.log(sites.join(', '));

    sites = sites.map(normalizeUrl);

    console.log('\n📚 WCAG Levels Explanation:');
    console.log('⭐ Level A - Basic accessibility requirements.');
    console.log('⭐ Level AA - Includes Level A plus additional guidelines.');
    console.log('⭐ Level AAA - Highest standard (A + AA + additional guidelines).\n');
    logSeparator();
    logInfo('Note: Level AA is required by the European Accessibility Act.\n');

    // Get audit settings from the user
    const levelInput = prompt(chalk.bold('⭐ Enter the audit level (A/AA/AAA): ')).trim();
    const wcagTags = getWcagTags(levelInput);

    console.log('\nFor a full list of available roles, visit: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md');
    const roleInputRaw = prompt(chalk.bold('🎯 Enter specific audit roles (comma-separated) or press Enter for a full audit: ')).trim();
    const roleInputs = roleInputRaw ? roleInputRaw.split(',').map(r => r.trim()) : [];
    if (roleInputs.length > 0) {
      logInfo(`\n🛠️ Specific audit roles: ${roleInputs.join(', ')}`);
    }

    const browser = await chromium.launch({ headless: true });
    const auditPromises = sites.map(site => runAuditForSite(site, wcagTags, roleInputs, browser));
    const auditResults = await Promise.allSettled(auditPromises);

    let totalDuration = 0;
    const auditSummaries = [];
    auditResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        totalDuration += result.value.duration;
        auditSummaries.push(result.value);
      }
    });
    logInfo(`\n⏱️ Total test duration for all sites: ${totalDuration.toFixed(2)} seconds`);
    await browser.close();

    const pdfPath = await generatePdfReport(auditSummaries, totalDuration);
    logSuccess('✅ All accessibility reports (HTML & JSON) have been generated successfully.');
    logSuccess(`📄 Combined PDF report available at: ${pdfPath}\n`);
  } catch (error) {
    logError(`❗ An error occurred: ${error}`);
  }
})();
